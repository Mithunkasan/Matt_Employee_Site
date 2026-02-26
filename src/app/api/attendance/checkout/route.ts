import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date()
        const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
        const today = new Date(istNow)
        today.setUTCHours(0, 0, 0, 0)

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
        const roundedSessionHours = Math.round(sessionHours * 100) / 100

        // Calculate overtime threshold (5:30 PM IST) reliably
        // 1. Get current time in IST mentally
        const istNowForThreshold = new Date(checkOutTime.getTime() + (5.5 * 60 * 60 * 1000))
        // 2. Set threshold to 5:30 PM in that shifted date
        const thresholdIST = new Date(istNowForThreshold)
        thresholdIST.setUTCHours(17, 30, 0, 0)
        // 3. Subtract offset to get the real UTC time of 5:30 PM IST
        const thresholdUTC = new Date(thresholdIST.getTime() - (5.5 * 60 * 60 * 1000))

        let sessionOvertimeHours = 0
        if (activeSession.isOvertime) {
            // If session started after 5:30 PM IST, all hours are overtime
            sessionOvertimeHours = roundedSessionHours
        } else if (checkOutTime.getTime() > thresholdUTC.getTime()) {
            // Started before 5:30 PM IST but ended after
            const checkInUTC = new Date(activeSession.checkIn)
            const otStart = checkInUTC.getTime() > thresholdUTC.getTime() ? checkInUTC : thresholdUTC
            const otMs = checkOutTime.getTime() - otStart.getTime()
            sessionOvertimeHours = Math.max(0, Math.round((otMs / (1000 * 60 * 60)) * 100) / 100)
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

        // Calculate total hours and overtime from all sessions for this attendance record
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
                id: attendance.id,
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
