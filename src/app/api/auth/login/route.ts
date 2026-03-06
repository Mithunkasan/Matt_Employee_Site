import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { createSession } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'
import { getClientIpFromHeaders } from '@/lib/request-ip'
import { calculateOvertimeHours, getISTOvertimeThresholdUTC, roundHours } from '@/lib/time-utils'

const ACTIVE_SESSION_TIMEOUT_MS = 20 * 60 * 1000
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const OFFICE_START_HOUR_IST = 9
const OFFICE_END_HOUR_IST = 17
const OFFICE_END_MINUTE_IST = 30

function buildSessionLockToken(ip: string, sessionId: string, timestamp: number): string {
    return `ip:${ip}|sid:${sessionId}|ts:${timestamp}`
}

function parseSessionLockToken(token?: string | null): { ip: string; sid: string; ts: number } | null {
    if (!token) return null

    const match = token.match(/^ip:(.+)\|sid:([^|]+)\|ts:(\d+)$/)
    if (!match) return null

    return {
        ip: match[1],
        sid: match[2],
        ts: Number(match[3]),
    }
}

function getIstDateKey(timestamp: number): string {
    const istDate = new Date(timestamp + IST_OFFSET_MS)
    return istDate.toISOString().split('T')[0]
}

function getOfficeWindowStatus(timestamp: number) {
    const istNow = new Date(timestamp + IST_OFFSET_MS)
    const officeStart = new Date(istNow)
    officeStart.setUTCHours(OFFICE_START_HOUR_IST, 0, 0, 0)
    const officeEnd = new Date(istNow)
    officeEnd.setUTCHours(OFFICE_END_HOUR_IST, OFFICE_END_MINUTE_IST, 0, 0)

    return {
        isBeforeOfficeHours: istNow.getTime() < officeStart.getTime(),
        isAfterOfficeHours: istNow.getTime() >= officeEnd.getTime(),
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate input
        const validation = loginSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { email, password } = validation.data
        const clientIp = getClientIpFromHeaders(request.headers)
        const now = Date.now()

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            )
        }

        // Check if user is active
        if (user.status === 'INACTIVE') {
            return NextResponse.json(
                { error: 'Your account has been deactivated. Please contact HR.' },
                { status: 403 }
            )
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            )
        }

        const shouldEnforceSingleLogin = user.role !== 'ADMIN'
        const officeWindowStatus = getOfficeWindowStatus(now)

        if (user.role !== 'ADMIN' && officeWindowStatus.isBeforeOfficeHours) {
            return NextResponse.json(
                { error: 'Login is allowed only during office hours (9:00 AM to 5:30 PM IST).' },
                { status: 403 }
            )
        }

        if (user.role !== 'ADMIN' && officeWindowStatus.isAfterOfficeHours) {
            const requestDate = new Date(`${getIstDateKey(now)}T00:00:00Z`)
            let overtimeRequest = await prisma.overtimeLoginRequest.findUnique({
                where: {
                    userId_requestDate: {
                        userId: user.id,
                        requestDate,
                    },
                },
            })

            if (!overtimeRequest) {
                overtimeRequest = await prisma.overtimeLoginRequest.create({
                    data: {
                        userId: user.id,
                        requestDate,
                        reason: 'Auto-generated from after-hours login attempt',
                    },
                })
            } else if (overtimeRequest.status === 'REJECTED') {
                overtimeRequest = await prisma.overtimeLoginRequest.update({
                    where: { id: overtimeRequest.id },
                    data: {
                        status: 'PENDING',
                        reviewedAt: null,
                        reviewedById: null,
                    },
                })
            }

            if (overtimeRequest.status !== 'APPROVED') {
                const admins = await prisma.user.findMany({
                    where: {
                        role: 'ADMIN',
                        status: 'ACTIVE',
                    },
                    select: { id: true },
                })
                const dedupeKey = `[overtime-login][request:${overtimeRequest.id}]`

                for (const admin of admins) {
                    const existingNotification = await prisma.notification.findFirst({
                        where: {
                            userId: admin.id,
                            title: 'Overtime Login Request',
                            message: { contains: dedupeKey },
                        },
                    })

                    if (existingNotification) continue

                    await prisma.notification.create({
                        data: {
                            userId: admin.id,
                            title: 'Overtime Login Request',
                            message: `${dedupeKey} ${user.name} (${user.email}) requested login access after 5:30 PM.`,
                        },
                    })
                }

                return NextResponse.json(
                    {
                        error: 'Office hours are over. Overtime request has been sent to admin. You can log in after approval.',
                    },
                    { status: 403 }
                )
            }
        }

        const activeToken = parseSessionLockToken(user.activeSessionId)
        const lastSeenAtMs = user.lastActivityAt ? new Date(user.lastActivityAt).getTime() : null
        const lockTimestamp = activeToken?.ts ?? 0
        const isActiveLockFresh =
            (lastSeenAtMs !== null && now - lastSeenAtMs < ACTIVE_SESSION_TIMEOUT_MS) ||
            (lockTimestamp > 0 && now - lockTimestamp < ACTIVE_SESSION_TIMEOUT_MS)

        // Strict single-device rule for non-admin users.
        // Same device can relogin immediately; different device is blocked while lock is fresh.
        // If lock is stale (offline/shutdown/inactive), allow a fresh login.
        if (shouldEnforceSingleLogin && user.activeSessionId && isActiveLockFresh) {
            const isSameKnownIp =
                !!activeToken &&
                activeToken.ip !== 'unknown' &&
                clientIp !== 'unknown' &&
                activeToken.ip === clientIp

            if (isSameKnownIp) {
                // allow relogin from same device/network
            } else {
                return NextResponse.json(
                    { error: 'This account is already active on another device. Please logout first.' },
                    { status: 409 }
                )
            }
        }

        // Create session ID for single session enforcement
        const sessionId = Math.random().toString(36).substring(2, 15)
        const lockToken = buildSessionLockToken(clientIp, sessionId, now)

        // Update user's active session state in database
        await prisma.user.update({
            where: { id: user.id },
            data: {
                activeSessionId: lockToken,
                lastActivityAt: new Date(),
            },
        })

        // Create session
        await createSession({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            sessionId: lockToken,
            ipAddress: clientIp,
        })

        // Record attendance
        const loginTime = new Date()
        // Get current day in IST
        const istDate = new Date(loginTime.getTime() + IST_OFFSET_MS)
        const todayStr = istDate.toISOString().split('T')[0]
        const today = new Date(`${todayStr}T00:00:00Z`)

        // Check if it's currently overtime (strictly after 5:30 PM IST)
        const overtimeThresholdUTC = getISTOvertimeThresholdUTC(loginTime)
        const isOvertime = loginTime.getTime() > overtimeThresholdUTC.getTime()
        const isSundayLogin = istDate.getUTCDay() === 0

        try {
            if (isSundayLogin && user.role !== 'ADMIN') {
                const admins = await prisma.user.findMany({
                    where: { role: 'ADMIN' },
                    select: { id: true },
                })

                const sundayDateKey = getIstDateKey(now)
                const dedupeKey = `[sunday-login][user:${user.id}][date:${sundayDateKey}]`

                for (const admin of admins) {
                    const exists = await prisma.notification.findFirst({
                        where: {
                            userId: admin.id,
                            title: 'Sunday Login Alert',
                            message: { contains: dedupeKey },
                            createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) },
                        },
                    })

                    if (exists) continue

                    await prisma.notification.create({
                        data: {
                            userId: admin.id,
                            title: 'Sunday Login Alert',
                            message: `${dedupeKey} ${user.name} (${user.email}) logged in on Sunday.`,
                        },
                    })
                }
            }

            // Auto-close any stale active sessions from previous days
            const staleSessions = await prisma.attendanceSession.findMany({
                where: {
                    checkOut: null,
                    attendance: {
                        userId: user.id,
                        date: { lt: today },
                    },
                },
                include: {
                    attendance: {
                        select: {
                            id: true,
                            date: true,
                        },
                    },
                },
            })

            for (const staleSession of staleSessions) {
                const checkInTime = new Date(staleSession.checkIn)

                // Auto-checkout at 5:30 PM IST of the attendance date.
                const y = staleSession.attendance.date.getUTCFullYear()
                const m = staleSession.attendance.date.getUTCMonth()
                const d = staleSession.attendance.date.getUTCDate()
                const autoCheckoutAt = new Date(Date.UTC(y, m, d, 12, 0, 0, 0)) // 17:30 IST
                const checkOutTime = autoCheckoutAt.getTime() > checkInTime.getTime() ? autoCheckoutAt : loginTime

                const sessionHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
                const roundedSessionHours = Math.max(0, roundHours(sessionHours))
                const sessionOvertimeHours = calculateOvertimeHours(checkInTime, checkOutTime)

                await prisma.attendanceSession.update({
                    where: { id: staleSession.id },
                    data: {
                        checkOut: checkOutTime,
                        hoursWorked: roundedSessionHours,
                        overtimeHours: sessionOvertimeHours,
                        isOvertime: sessionOvertimeHours > 0,
                    },
                })

                const allSessions = await prisma.attendanceSession.findMany({
                    where: { attendanceId: staleSession.attendanceId },
                })

                const totalHours = allSessions.reduce((sum, s) => sum + (s.hoursWorked || 0), 0)
                const totalOvertimeHours = allSessions.reduce((sum, s) => sum + (s.overtimeHours || 0), 0)

                await prisma.attendance.update({
                    where: { id: staleSession.attendanceId },
                    data: {
                        totalHours: roundHours(totalHours),
                        overtimeHours: roundHours(totalOvertimeHours),
                        isOvertime: totalOvertimeHours > 0,
                    },
                })
            }

            // Create or get attendance record for today
            const attendance = await prisma.attendance.upsert({
                where: {
                    userId_date: {
                        userId: user.id,
                        date: today,
                    },
                },
                update: {
                    // Logging in means user is present today.
                    status: 'PRESENT',
                    // If it was already marked as overtime, keep it
                    isOvertime: isOvertime ? true : undefined
                },
                create: {
                    userId: user.id,
                    date: today,
                    status: 'PRESENT',
                    isOvertime: isOvertime,
                },
            })

            // Create a new attendance session only if there is no active one for today.
            const activeSession = await prisma.attendanceSession.findFirst({
                where: {
                    attendanceId: attendance.id,
                    checkOut: null,
                },
            })

            if (!activeSession) {
                await prisma.attendanceSession.create({
                    data: {
                        attendanceId: attendance.id,
                        checkIn: loginTime,
                        isOvertime: isOvertime,
                    },
                })
            }
        } catch (error) {
            console.error('Failed to record attendance:', error)
            // Don't block login if attendance fails
        }

        return NextResponse.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isOvertimeLogin: isOvertime,
                isSundayLogin,
            },
            sundayAlert: isSundayLogin ? 'Today is Sunday.' : null,
        })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
