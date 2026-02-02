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

        // Update the session with checkout time and hours worked
        await prisma.attendanceSession.update({
            where: {
                id: activeSession.id,
            },
            data: {
                checkOut: checkOutTime,
                hoursWorked: roundedSessionHours,
            },
        })

        // Calculate total hours from all sessions
        const allSessions = await prisma.attendanceSession.findMany({
            where: {
                attendanceId: attendance.id,
            },
        })

        const totalHours = allSessions.reduce((sum, s) => sum + s.hoursWorked, 0)

        // Update attendance total hours
        const updatedAttendance = await prisma.attendance.update({
            where: {
                userId_date: {
                    userId: session.userId,
                    date: today,
                },
            },
            data: {
                totalHours: Math.round(totalHours * 100) / 100,
            },
        })

        return NextResponse.json({
            message: 'Checkout successful',
            attendance: {
                checkIn: activeSession.checkIn,
                checkOut: checkOutTime,
                sessionHours: roundedSessionHours,
                totalHours: updatedAttendance.totalHours,
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
