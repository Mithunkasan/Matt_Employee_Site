import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { getClientIpFromHeaders } from '@/lib/request-ip'
import { calculateOvertimeHours, getISTStartOfDayUTC, roundHours } from '@/lib/time-utils'

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const OFFICE_END_HOUR_IST = 17
const OFFICE_END_MINUTE_IST = 30

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

function isAfterOfficeHours(timestamp: number): boolean {
    const istNow = new Date(timestamp + IST_OFFSET_MS)
    const officeEnd = new Date(istNow)
    officeEnd.setUTCHours(OFFICE_END_HOUR_IST, OFFICE_END_MINUTE_IST, 0, 0)
    return istNow.getTime() >= officeEnd.getTime()
}

function getISTOfficeEndUTC(timestamp: number): Date {
    const istNow = new Date(timestamp + IST_OFFSET_MS)
    const y = istNow.getUTCFullYear()
    const m = istNow.getUTCMonth()
    const d = istNow.getUTCDate()
    // 5:30 PM IST = 12:00 PM UTC
    return new Date(Date.UTC(y, m, d, 12, 0, 0, 0))
}

function getIstDateKey(timestamp: number): string {
    const istDate = new Date(timestamp + IST_OFFSET_MS)
    return istDate.toISOString().split('T')[0]
}

async function autoCheckoutAtOfficeEnd(userId: string, officeEndUTC: Date) {
    const today = getISTStartOfDayUTC(officeEndUTC)
    const attendance = await prisma.attendance.findUnique({
        where: {
            userId_date: {
                userId,
                date: today,
            },
        },
        include: {
            sessions: {
                orderBy: {
                    checkIn: 'asc',
                },
            },
        },
    })

    if (!attendance) return

    const activeSession = attendance.sessions.find((s) => !s.checkOut)
    if (!activeSession) return

    const checkInTime = new Date(activeSession.checkIn)
    const effectiveCheckout =
        checkInTime.getTime() < officeEndUTC.getTime() ? officeEndUTC : checkInTime

    const sessionHours = (effectiveCheckout.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
    const roundedSessionHours = Math.max(0, roundHours(sessionHours))
    const sessionOvertimeHours = calculateOvertimeHours(checkInTime, effectiveCheckout)

    await prisma.attendanceSession.update({
        where: { id: activeSession.id },
        data: {
            checkOut: effectiveCheckout,
            hoursWorked: roundedSessionHours,
            overtimeHours: sessionOvertimeHours,
            isOvertime: sessionOvertimeHours > 0,
        },
    })

    const allSessions = await prisma.attendanceSession.findMany({
        where: { attendanceId: attendance.id },
    })

    const totalHours = allSessions.reduce((sum, s) => sum + (s.hoursWorked || 0), 0)
    const totalOvertimeHours = allSessions.reduce((sum, s) => sum + (s.overtimeHours || 0), 0)

    await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
            totalHours: roundHours(totalHours),
            overtimeHours: roundHours(totalOvertimeHours),
            isOvertime: totalOvertimeHours > 0,
        },
    })
}

export async function GET(request: Request) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            )
        }

        const clientIp = getClientIpFromHeaders(request.headers)
        const now = Date.now()

        if (session.role !== 'ADMIN' && isAfterOfficeHours(now)) {
            const requestDate = new Date(`${getIstDateKey(now)}T00:00:00Z`)
            const approvedRequest = await prisma.overtimeLoginRequest.findUnique({
                where: {
                    userId_requestDate: {
                        userId: session.userId,
                        requestDate,
                    },
                },
                select: { status: true },
            })

            if (approvedRequest?.status !== 'APPROVED') {
                const officeEndUTC = getISTOfficeEndUTC(now)
                await autoCheckoutAtOfficeEnd(session.userId, officeEndUTC)

                await prisma.user.updateMany({
                    where: {
                        id: session.userId,
                        activeSessionId: session.sessionId,
                    },
                    data: {
                        activeSessionId: null,
                    },
                })

                const response = NextResponse.json(
                    { error: 'Logged out after office hours. Admin approval is required for overtime login.' },
                    { status: 401 }
                )
                response.cookies.delete('session')
                return response
            }
        }

        // Single session enforcement (except for Admin)
        if (session.role !== 'ADMIN') {
            const user = await prisma.user.findUnique({
                where: { id: session.userId },
                select: { activeSessionId: true },
            })

            const activeToken = parseSessionLockToken(user?.activeSessionId)
            const isSessionIdMismatch = !user || user.activeSessionId !== session.sessionId
            const isIpMismatch = !!activeToken && !!session.ipAddress && session.ipAddress !== clientIp

            if (isSessionIdMismatch || isIpMismatch) {
                // Another session is active, or user not found
                const response = NextResponse.json(
                    { error: 'Session invalidated by another login' },
                    { status: 401 }
                )
                // Delete session cookie
                response.cookies.delete('session')
                return response
            }
        }

        return NextResponse.json({
            user: {
                userId: session.userId,
                name: session.name,
                email: session.email,
                role: session.role,
                designation: session.designation ?? null,
            },
        })
    } catch (error) {
        console.error('Session error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
