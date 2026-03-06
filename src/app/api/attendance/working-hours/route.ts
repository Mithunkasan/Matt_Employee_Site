import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { calculateOvertimeHours, getISTStartOfDayUTC, roundHours } from '@/lib/time-utils'

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
        const today = getISTStartOfDayUTC(now)

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

                totalOvertimeHours += calculateOvertimeHours(checkInTime, checkOutTime)
            })

            // Round to 2 decimal places
            totalHours = roundHours(totalHours)
            totalOvertimeHours = roundHours(totalOvertimeHours)

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
                totalHoursToday: roundHours(totalHoursToday),
                totalOvertimeToday: roundHours(totalOvertimeToday),
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
