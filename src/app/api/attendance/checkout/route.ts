import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { calculateOvertimeHours, getISTStartOfDayUTC, roundHours } from '@/lib/time-utils'

export async function POST() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date()
        const today = getISTStartOfDayUTC(now)

        // Find today's attendance record with sessions
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

        if (!attendance) {
            return NextResponse.json(
                { error: 'No check-in record found for today. Please log in first.' },
                { status: 404 }
            )
        }

        // Find the latest active session (no checkout time)
        const activeSession = attendance.sessions.find(s => !s.checkOut)

        if (!activeSession) {
            return NextResponse.json(
                { error: 'You have already checked out for today or have no active session.' },
                { status: 400 }
            )
        }

        const checkOutTime = new Date()

        // Calculate working hours for this session (in hours) using pure UTC duration
        const diffInMs = checkOutTime.getTime() - new Date(activeSession.checkIn).getTime()
        const sessionHours = diffInMs / (1000 * 60 * 60)
        const roundedSessionHours = roundHours(sessionHours)
        const sessionOvertimeHours = calculateOvertimeHours(activeSession.checkIn, checkOutTime)

        // Update the session with checkout time, hours worked, and overtime
        await prisma.attendanceSession.update({
            where: {
                id: activeSession.id,
            },
            data: {
                checkOut: checkOutTime,
                hoursWorked: roundedSessionHours,
                overtimeHours: sessionOvertimeHours,
                isOvertime: sessionOvertimeHours > 0
            },
        })

        // Calculate total hours and overtime from all sessions for this attendance record
        const allSessions = await prisma.attendanceSession.findMany({
            where: {
                attendanceId: attendance.id,
            },
        })

        const totalHours = allSessions.reduce((sum, s) => sum + (s.hoursWorked || 0), 0)
        const totalOvertimeHours = allSessions.reduce((sum, s) => sum + (s.overtimeHours || 0), 0)

        // Update attendance total hours and overtime
        const updatedAttendance = await prisma.attendance.update({
            where: {
                id: attendance.id,
            },
            data: {
                totalHours: roundHours(totalHours),
                overtimeHours: roundHours(totalOvertimeHours),
                isOvertime: totalOvertimeHours > 0
            },
        })

        return NextResponse.json({
            message: 'Checkout successful',
            attendance: {
                checkIn: activeSession.checkIn,
                checkOut: checkOutTime,
                sessionHours: roundedSessionHours,
                totalHours: updatedAttendance.totalHours,
                overtimeHours: updatedAttendance.overtimeHours,
                isOvertime: updatedAttendance.isOvertime
            },
        })
    } catch (error) {
        console.error('Checkout error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
