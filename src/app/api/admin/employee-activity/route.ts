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

        const now = new Date()
        const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
        const today = new Date(istNow)
        today.setUTCHours(0, 0, 0, 0)

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
            // their last activity was within the last 10 minutes AND
            // no stuck key alert is active.
            const IDLE_THRESHOLD = 10 * 60 * 1000 // 10 minutes
            const lastActivity = attendance.user.lastActivityAt ? new Date(attendance.user.lastActivityAt) : null

            const isOnline = !!activeSession &&
                !!lastActivity &&
                (now.getTime() - lastActivity.getTime() < IDLE_THRESHOLD) &&
                !attendance.user.stuckKeyAlert

            // Calculate total hours from all sessions
            let totalHours = 0
            let totalOvertimeHours = 0

            const thresholdHour = 17
            const thresholdMinute = 30

            attendance.sessions.forEach((session: any) => {
                const checkInTime = new Date(session.checkIn)
                const checkOutTime = session.checkOut ? new Date(session.checkOut) : now
                const diffInMs = checkOutTime.getTime() - checkInTime.getTime()
                const hours = diffInMs / (1000 * 60 * 60)

                totalHours += hours

                // Threshold at 5:30 PM IST
                const istNowForThreshold = new Date(checkInTime.getTime() + (5.5 * 60 * 60 * 1000))
                const thresholdIST = new Date(istNowForThreshold)
                thresholdIST.setUTCHours(17, 30, 0, 0)
                const thresholdUTC = new Date(thresholdIST.getTime() - (5.5 * 60 * 60 * 1000))

                if (session.isOvertime) {
                    totalOvertimeHours += hours
                } else if (checkOutTime.getTime() > thresholdUTC.getTime()) {
                    const otStart = checkInTime.getTime() > thresholdUTC.getTime() ? checkInTime.getTime() : thresholdUTC.getTime()
                    const otMs = checkOutTime.getTime() - otStart
                    totalOvertimeHours += Math.max(0, otMs / (1000 * 60 * 60))
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
