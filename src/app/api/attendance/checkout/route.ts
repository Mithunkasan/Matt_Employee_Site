import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

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

        // Calculate working hours for this session (in hours)
        const diffInMs = checkOutTime.getTime() - new Date(activeSession.checkIn).getTime()
        const sessionHours = diffInMs / (1000 * 60 * 60) // Convert ms to hours
        const roundedSessionHours = Math.round(sessionHours * 100) / 100

        // Calculate overtime hours (after 5:30 PM)
        const threshold = new Date(checkOutTime)
        threshold.setHours(17, 30, 0, 0)

        let sessionOvertimeHours = 0
        if (activeSession.isOvertime) {
            // Started after 5:30 PM, so all hours are overtime
            sessionOvertimeHours = roundedSessionHours
        } else if (checkOutTime > threshold) {
            // Started before 5:30 PM but ended after
            const otStart = new Date(activeSession.checkIn) > threshold
                ? new Date(activeSession.checkIn)
                : threshold
            const otMs = checkOutTime.getTime() - otStart.getTime()
            sessionOvertimeHours = Math.round((otMs / (1000 * 60 * 60)) * 100) / 100
        }

        // Update the session with checkout time, hours worked, and overtime
        await prisma.attendanceSession.update({
            where: {
                id: activeSession.id,
            },
            data: {
                checkOut: checkOutTime,
                hoursWorked: roundedSessionHours,
                overtimeHours: sessionOvertimeHours,
                isOvertime: activeSession.isOvertime || sessionOvertimeHours > 0
            },
        })

        // Calculate total hours and overtime from all sessions
        const allSessions = await prisma.attendanceSession.findMany({
            where: {
                attendanceId: attendance.id,
            },
        })

        const totalHours = allSessions.reduce((sum, s) => sum + s.hoursWorked, 0)
        const totalOvertimeHours = allSessions.reduce((sum, s) => sum + s.overtimeHours, 0)

        // Update attendance total hours and overtime
        const updatedAttendance = await prisma.attendance.update({
            where: {
                userId_date: {
                    userId: session.userId,
                    date: today,
                },
            },
            data: {
                totalHours: Math.round(totalHours * 100) / 100,
                overtimeHours: Math.round(totalOvertimeHours * 100) / 100,
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
