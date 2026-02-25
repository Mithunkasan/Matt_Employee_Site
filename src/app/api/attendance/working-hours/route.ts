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
            let totalOvertimeHours = 0
            let isActive = false

            const thresholdHour = 17
            const thresholdMinute = 30

            // Calculate total hours from all sessions
            attendance.sessions.forEach((session) => {
                if (session.checkOut) {
                    // Session is complete, use the stored hours
                    totalHours += session.hoursWorked
                    totalOvertimeHours += session.overtimeHours
                } else {
                    // Session is still active, calculate current working time
                    const now = new Date()
                    const checkIn = new Date(session.checkIn)
                    const diffInMs = now.getTime() - checkIn.getTime()
                    const currentSessionHours = diffInMs / (1000 * 60 * 60) // Convert to hours
                    totalHours += currentSessionHours
                    isActive = true

                    // Calculate current overtime if session is still active
                    let currentOvertime = 0
                    const threshold = new Date(now)
                    threshold.setHours(thresholdHour, thresholdMinute, 0, 0)

                    if (session.isOvertime) {
                        // Started after 5:30 PM
                        currentOvertime = currentSessionHours
                    } else if (now > threshold) {
                        // Started before but currently after 5:30 PM
                        const otStart = checkIn > threshold ? checkIn : threshold
                        const otMs = now.getTime() - otStart.getTime()
                        currentOvertime = otMs / (1000 * 60 * 60)
                    }
                    totalOvertimeHours += currentOvertime
                }
            })

            // Round to 2 decimal places
            totalHours = Math.round(totalHours * 100) / 100
            totalOvertimeHours = Math.round(totalOvertimeHours * 100) / 100

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
                overtimeHours: totalOvertimeHours,
                isOvertime: totalOvertimeHours > 0,
                isActive: isActive,
                date: attendance.date,
            }
        })

        // Calculate total hours worked today across all employees
        const totalHoursToday = employeeWorkingHours.reduce(
            (sum, emp) => sum + (emp.workingHours || 0),
            0
        )
        const totalOvertimeToday = employeeWorkingHours.reduce(
            (sum, emp) => sum + (emp.overtimeHours || 0),
            0
        )

        return NextResponse.json({
            employees: employeeWorkingHours,
            summary: {
                totalEmployeesPresent: attendances.length,
                activeEmployees: employeeWorkingHours.filter((e) => e.isActive).length,
                totalHoursToday: Math.round(totalHoursToday * 100) / 100,
                totalOvertimeToday: Math.round(totalOvertimeToday * 100) / 100,
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
