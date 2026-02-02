import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only admins, HR, PA, and BA can view all employees' working hours
        if (!['ADMIN', 'HR', 'PA', 'BA'].includes(session.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get all today's attendance with user information and sessions
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
        })

        // Calculate working hours for employees from their sessions
        const employeeWorkingHours = attendances.map((attendance) => {
            let totalHours = 0
            let latestSession: typeof attendance.sessions[0] | null = null
            let isActive = false

            // Calculate total hours from all sessions
            attendance.sessions.forEach((session) => {
                if (session.checkOut) {
                    // Session is complete, use the stored hours
                    totalHours += session.hoursWorked
                } else {
                    // Session is still active, calculate current working time
                    const now = new Date()
                    const diffInMs = now.getTime() - new Date(session.checkIn).getTime()
                    const currentSessionHours = diffInMs / (1000 * 60 * 60) // Convert to hours
                    totalHours += currentSessionHours
                    isActive = true
                    latestSession = session
                }
            })

            // Round to 2 decimal places
            totalHours = Math.round(totalHours * 100) / 100

            // Get first session's check-in time and last session's check-out time
            const firstCheckIn = attendance.sessions.length > 0
                ? attendance.sessions[0].checkIn
                : null

            const lastCheckOut = attendance.sessions.length > 0 && !isActive
                ? attendance.sessions[attendance.sessions.length - 1].checkOut
                : null

            return {
                id: attendance.id,
                user: attendance.user,
                checkIn: firstCheckIn,
                checkOut: lastCheckOut,
                workingHours: totalHours,
                isActive: isActive,
                date: attendance.date,
            }
        })

        // Calculate total hours worked today across all employees
        const totalHoursToday = employeeWorkingHours.reduce(
            (sum, emp) => sum + (emp.workingHours || 0),
            0
        )

        return NextResponse.json({
            employees: employeeWorkingHours,
            summary: {
                totalEmployeesPresent: attendances.length,
                activeEmployees: employeeWorkingHours.filter((e) => e.isActive).length,
                totalHoursToday: Math.round(totalHoursToday * 100) / 100,
            },
        })
    } catch (error) {
        console.error('Working hours fetch error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
