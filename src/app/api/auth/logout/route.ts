import { NextResponse } from 'next/server'
import { deleteSession, getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST() {
    try {
        const session = await getSession()

        if (session) {
            // Record logout time
            const now = new Date()
            const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
            const today = new Date(istNow)
            today.setUTCHours(0, 0, 0, 0)

            try {
                // Find attendance for today
                const attendance = await prisma.attendance.findUnique({
                    where: {
                        userId_date: {
                            userId: session.userId,
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

                if (attendance) {
                    // Find the active session (no checkout time)
                    const activeSession = attendance.sessions.find(s => !s.checkOut)

                    if (activeSession) {
                        const checkOutTime = new Date()
                        const diffInMs = checkOutTime.getTime() - new Date(activeSession.checkIn).getTime()
                        const sessionHours = diffInMs / (1000 * 60 * 60)

                        // Update the session with checkout time
                        await prisma.attendanceSession.update({
                            where: { id: activeSession.id },
                            data: {
                                checkOut: checkOutTime,
                                hoursWorked: Math.round(sessionHours * 100) / 100,
                            },
                        })

                        // Recalculate total hours
                        const allSessions = await prisma.attendanceSession.findMany({
                            where: { attendanceId: attendance.id },
                        })
                        const totalHours = allSessions.reduce((sum, s) => sum + s.hoursWorked, 0)

                        // Update attendance total hours
                        await prisma.attendance.update({
                            where: { id: attendance.id },
                            data: {
                                totalHours: Math.round(totalHours * 100) / 100,
                            },
                        })
                    }
                }
            } catch (error) {
                console.error('Failed to record logout time:', error)
                // Continue with logout even if attendance update fails
            }

            // Clear active auth lock only for the current active session
            await prisma.user.updateMany({
                where: {
                    id: session.userId,
                    activeSessionId: session.sessionId,
                },
                data: {
                    activeSessionId: null,
                    activeSessionIp: null,
                    activeSessionStartedAt: null,
                },
            })
        }

        await deleteSession()
        return NextResponse.json({ message: 'Logged out successfully' })
    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
