import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { calculateOvertimeHours, getISTStartOfDayUTC, roundHours } from '@/lib/time-utils'

const ACTIVITY_NOTIFICATION_WINDOW_MS = 5 * 60 * 1000

function getISTStartOfTodayUTC(): Date {
    return getISTStartOfDayUTC()
}

async function autoCheckoutIfActive(userId: string) {
    const today = getISTStartOfTodayUTC()

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
                    checkIn: 'desc',
                },
            },
        },
    })

    if (!attendance) return false

    const activeSession = attendance.sessions.find((s) => !s.checkOut)
    if (!activeSession) return false

    const checkOutTime = new Date()
    const diffInMs = checkOutTime.getTime() - new Date(activeSession.checkIn).getTime()
    const sessionHours = diffInMs / (1000 * 60 * 60)
    const roundedSessionHours = roundHours(sessionHours)
    const sessionOvertimeHours = calculateOvertimeHours(activeSession.checkIn, checkOutTime)

    await prisma.attendanceSession.update({
        where: {
            id: activeSession.id,
        },
        data: {
            checkOut: checkOutTime,
            hoursWorked: roundedSessionHours,
            overtimeHours: sessionOvertimeHours,
            isOvertime: sessionOvertimeHours > 0,
        },
    })

    const allSessions = await prisma.attendanceSession.findMany({
        where: {
            attendanceId: attendance.id,
        },
    })

    const totalHours = allSessions.reduce((sum, s) => sum + (s.hoursWorked || 0), 0)
    const totalOvertimeHours = allSessions.reduce((sum, s) => sum + (s.overtimeHours || 0), 0)

    await prisma.attendance.update({
        where: {
            id: attendance.id,
        },
        data: {
            totalHours: roundHours(totalHours),
            overtimeHours: roundHours(totalOvertimeHours),
            isOvertime: totalOvertimeHours > 0,
        },
    })

    return true
}

async function sendAdminNotification(title: string, message: string, dedupeKey: string) {
    const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
    })
    if (admins.length === 0) return

    const recentNotification = await prisma.notification.findFirst({
        where: {
            userId: admins[0].id,
            title,
            message: { contains: dedupeKey },
            createdAt: { gte: new Date(Date.now() - ACTIVITY_NOTIFICATION_WINDOW_MS) },
        },
    })

    if (recentNotification) return

    for (const admin of admins) {
        await prisma.notification.create({
            data: {
                userId: admin.id,
                title,
                message,
            },
        })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const isIdle = Boolean(body?.isIdle)
        const stuckKey = Boolean(body?.stuckKey)
        const eventType = typeof body?.eventType === 'string' ? body.eventType : 'activity'
        const monitoredRoles = ['EMPLOYEE', 'INTERN', 'BA', 'PA', 'TEAM_COORDINATOR', 'TEAM_LEADER', 'MANAGER']
        const shouldAutoCheckout = (isIdle || stuckKey) && monitoredRoles.includes(session.role)

        const userUpdateData: Record<string, unknown> = {
            stuckKeyAlert: stuckKey,
        }
        if (!isIdle && !stuckKey) {
            userUpdateData.lastActivityAt = new Date()
        }

        await (prisma.user.update as any)({
            where: { id: session.userId },
            data: userUpdateData,
        })

        if (shouldAutoCheckout) {
            const checkedOut = await autoCheckoutIfActive(session.userId)
            const dedupeKey = `[user:${session.userId}][${eventType}]`

            if (checkedOut && stuckKey) {
                if (eventType === 'long_press_timeout') {
                    await sendAdminNotification(
                        'Long Press Auto Checkout',
                        `${dedupeKey} Employee ${session.name} (${session.role}) performed a continuous long press action on a keyboard key for 5 minutes. Automatic checkout has been applied.`,
                        dedupeKey
                    )
                } else if (eventType === 'repeated_key_pattern') {
                    await sendAdminNotification(
                        'Repeated Key Press Auto Checkout',
                        `${dedupeKey} Employee ${session.name} (${session.role}) repeatedly pressed a single keyboard key at short intervals for 5 minutes. Automatic checkout has been applied.`,
                        dedupeKey
                    )
                } else {
                    await sendAdminNotification(
                        'Suspicious Activity Auto Checkout',
                        `${dedupeKey} Employee ${session.name} (${session.role}) showed suspicious keyboard activity for 5 minutes. Automatic checkout has been applied.`,
                        dedupeKey
                    )
                }
            } else if (checkedOut && isIdle) {
                await sendAdminNotification(
                    'Idle Auto Checkout',
                    `${dedupeKey} Employee ${session.name} (${session.role}) was inactive for 10 minutes (no keyboard/mouse input). Automatic checkout has been applied.`,
                    dedupeKey
                )
            }

            return NextResponse.json({ success: true, checkedOut })
        }

        return NextResponse.json({ success: true, checkedOut: false })
    } catch (error) {
        console.error('Activity update error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
