import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only admins and HR can view employee activity
        if (!['ADMIN', 'HR'].includes(session.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get all attendance records for today with sessions and user info
        const attendances = await prisma.attendance.findMany({
            where: {
                date: today,
                status: 'PRESENT',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        department: true,
                        lastActivityAt: true,
                        stuckKeyAlert: true,
                    } as any,
                },
                sessions: {
                    orderBy: {
                        checkIn: 'asc',
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        }) as any

        // Transform data to include online/offline status and session count
        const employees = (attendances as any).map((attendance: any) => {
            // Check if there's an active session (no checkout time)
            const activeSession = attendance.sessions.find((s: any) => !s.checkOut)

            // Check real-time activity status
            // A person is only "Online" if they have an active session AND
            // their last activity was within the last 5 minutes.
            const IDLE_THRESHOLD = 5 * 60 * 1000 // 5 minutes
            const now = new Date()
            const lastActivity = attendance.user.lastActivityAt ? new Date(attendance.user.lastActivityAt) : null

            const isOnline = !!activeSession &&
                !!lastActivity &&
                (now.getTime() - lastActivity.getTime() < IDLE_THRESHOLD)

            // Calculate total hours from all sessions
            let totalHours = 0
            let totalOvertimeHours = 0

            const thresholdHour = 17
            const thresholdMinute = 30

            attendance.sessions.forEach((session: any) => {
                if (session.checkOut) {
                    totalHours += session.hoursWorked
                    totalOvertimeHours += session.overtimeHours || 0
                } else {
                    // Session is still active, calculate current working time
                    const checkIn = new Date(session.checkIn)
                    const diffInMs = now.getTime() - checkIn.getTime()
                    const currentSessionHours = diffInMs / (1000 * 60 * 60)
                    totalHours += currentSessionHours

                    // Calculate current overtime if session is still active
                    let currentOvertime = 0
                    const threshold = new Date(now)
                    threshold.setHours(thresholdHour, thresholdMinute, 0, 0)

                    if (session.isOvertime) {
                        currentOvertime = currentSessionHours
                    } else if (now > threshold) {
                        const otStart = checkIn > threshold ? checkIn : threshold
                        const otMs = now.getTime() - otStart.getTime()
                        currentOvertime = otMs / (1000 * 60 * 60)
                    }
                    totalOvertimeHours += currentOvertime
                }
            })

            return {
                id: attendance.id,
                user: {
                    ...attendance.user,
                    isIdle: !isOnline && !!activeSession,
                    stuckKeyAlert: attendance.user.stuckKeyAlert
                },
                date: attendance.date,
                status: attendance.status,
                totalHours: Math.round(totalHours * 100) / 100,
                overtimeHours: Math.round(totalOvertimeHours * 100) / 100,
                isOvertime: totalOvertimeHours > 0,
                sessions: attendance.sessions,
                isOnline,
                sessionCount: attendance.sessions.length,
            }
        })

        // Sort: online employees first, then by total hours
        employees.sort((a: any, b: any) => {
            if (a.isOnline && !b.isOnline) return -1
            if (!a.isOnline && b.isOnline) return 1
            return b.totalHours - a.totalHours
        })

        return NextResponse.json({
            employees,
            summary: {
                totalEmployees: employees.length,
                onlineCount: employees.filter((e: any) => e.isOnline).length,
                offlineCount: employees.filter((e: any) => !e.isOnline).length,
                totalHours: Math.round(employees.reduce((sum: any, e: any) => sum + e.totalHours, 0) * 100) / 100,
            },
        })
    } catch (error) {
        console.error('Employee activity fetch error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
