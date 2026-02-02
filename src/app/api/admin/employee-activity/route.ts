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
                    },
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
        })

        // Transform data to include online/offline status and session count
        const employees = attendances.map((attendance) => {
            // Check if there's an active session (no checkout time)
            const activeSession = attendance.sessions.find(s => !s.checkOut)
            const isOnline = !!activeSession

            // Calculate total hours from all sessions
            let totalHours = 0
            attendance.sessions.forEach((session) => {
                if (session.checkOut) {
                    totalHours += session.hoursWorked
                } else {
                    // Session is still active, calculate current working time
                    const now = new Date()
                    const diffInMs = now.getTime() - new Date(session.checkIn).getTime()
                    const currentSessionHours = diffInMs / (1000 * 60 * 60)
                    totalHours += currentSessionHours
                }
            })

            return {
                id: attendance.id,
                user: attendance.user,
                date: attendance.date,
                status: attendance.status,
                totalHours: Math.round(totalHours * 100) / 100,
                sessions: attendance.sessions,
                isOnline,
                sessionCount: attendance.sessions.length,
            }
        })

        // Sort: online employees first, then by total hours
        employees.sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1
            if (!a.isOnline && b.isOnline) return 1
            return b.totalHours - a.totalHours
        })

        return NextResponse.json({
            employees,
            summary: {
                totalEmployees: employees.length,
                onlineCount: employees.filter(e => e.isOnline).length,
                offlineCount: employees.filter(e => !e.isOnline).length,
                totalHours: Math.round(employees.reduce((sum, e) => sum + e.totalHours, 0) * 100) / 100,
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
