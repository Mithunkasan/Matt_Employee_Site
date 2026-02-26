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

        const now = new Date()
        const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
        const today = new Date(istNow)
        today.setUTCHours(0, 0, 0, 0)

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

            // Calculate total hours from all sessions
            attendance.sessions.forEach((session) => {
                const checkInTime = new Date(session.checkIn)
                const checkOutTime = session.checkOut ? new Date(session.checkOut) : now
                const diffInMs = checkOutTime.getTime() - checkInTime.getTime()
                const hours = diffInMs / (1000 * 60 * 60)

                totalHours += hours
                if (!session.checkOut) isActive = true

                // Calculate current overtime if session is still active (5:30 PM IST threshold)
                // The threshold should be based on the check-in date of the session
                const istCheckInTime = new Date(checkInTime.getTime() + (5.5 * 60 * 60 * 1000))
                const thresholdIST = new Date(istCheckInTime)
                thresholdIST.setUTCHours(17, 30, 0, 0) // 5:30 PM IST
                const thresholdUTC = new Date(thresholdIST.getTime() - (5.5 * 60 * 60 * 1000))

                if (session.isOvertime) {
                    totalOvertimeHours += hours
                } else if (checkOutTime.getTime() > thresholdUTC.getTime()) {
                    const otStart = checkInTime.getTime() > thresholdUTC.getTime() ? checkInTime.getTime() : thresholdUTC.getTime()
                    const otMs = checkOutTime.getTime() - otStart
                    totalOvertimeHours += Math.max(0, otMs / (1000 * 60 * 60))
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
