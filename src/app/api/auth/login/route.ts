import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { createSession } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'
import { getClientIpFromHeaders } from '@/lib/request-ip'

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
    const istDate = new Date(timestamp + (5.5 * 60 * 60 * 1000))
    return istDate.toISOString().split('T')[0]
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

        // Single-session rule for non-admin users:
        // - First login of the IST day can come from any device.
        // - Same-day login from a different IP is blocked.
        // - Same-day login from the same IP is allowed and rotates session lock (old session becomes invalid).
        if (shouldEnforceSingleLogin && user.activeSessionId) {
            const parsed = parseSessionLockToken(user.activeSessionId)
            const isSameIstDay = !!parsed && getIstDateKey(parsed.ts) === getIstDateKey(now)
            const isDifferentKnownIp =
                !!parsed &&
                parsed.ip !== 'unknown' &&
                clientIp !== 'unknown' &&
                parsed.ip !== clientIp

            if (isSameIstDay && isDifferentKnownIp) {
                return NextResponse.json(
                    { error: 'This account is already active on another device today.' },
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
        const istDate = new Date(loginTime.getTime() + (5.5 * 60 * 60 * 1000))
        const todayStr = istDate.toISOString().split('T')[0]
        const today = new Date(`${todayStr}T00:00:00Z`)

        // Check if it's currently overtime (after 5:30 PM IST)
        const thresholdIST = new Date(istDate)
        thresholdIST.setUTCHours(17, 30, 0, 0)
        const isOvertime = istDate.getTime() > thresholdIST.getTime()

        try {
            // Create or get attendance record for today
            const attendance = await prisma.attendance.upsert({
                where: {
                    userId_date: {
                        userId: user.id,
                        date: today,
                    },
                },
                update: {
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

            // Create a new attendance session for this login
            await prisma.attendanceSession.create({
                data: {
                    attendanceId: attendance.id,
                    checkIn: loginTime,
                    isOvertime: isOvertime,
                },
            })
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
            },
        })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
