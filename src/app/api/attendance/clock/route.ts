import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// POST - Clock in (start a new session)
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get or create attendance record for today
        let attendance = await prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId: session.userId,
                    date: today,
                },
            },
            include: {
                sessions: {
                    orderBy: { checkIn: 'desc' },
                },
            },
        })

        if (!attendance) {
            // Create new attendance record
            attendance = await prisma.attendance.create({
                data: {
                    userId: session.userId,
                    date: today,
                    status: 'PRESENT',
                },
                include: {
                    sessions: true,
                },
            })
        }

        // Check if there's an active session (not checked out)
        const activeSession = attendance.sessions.find((s) => !s.checkOut)
        if (activeSession) {
            return NextResponse.json(
                { error: 'You already have an active session. Please clock out first.' },
                { status: 400 }
            )
        }

        // Create new check-in session
        const newSession = await prisma.attendanceSession.create({
            data: {
                attendanceId: attendance.id,
                checkIn: new Date(),
            },
        })

        return NextResponse.json({
            message: 'Clocked in successfully',
            session: newSession,
            attendance,
        })
    } catch (error) {
        console.error('Clock in error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PATCH - Clock out (end current session)
export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get attendance record for today
        const attendance = await prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId: session.userId,
                    date: today,
                },
            },
            include: {
                sessions: {
                    orderBy: { checkIn: 'desc' },
                },
            },
        })

        if (!attendance) {
            return NextResponse.json(
                { error: 'No attendance record found for today' },
                { status: 404 }
            )
        }

        // Find active session
        const activeSession = attendance.sessions.find((s) => !s.checkOut)
        if (!activeSession) {
            return NextResponse.json(
                { error: 'No active session found. Please clock in first.' },
                { status: 400 }
            )
        }

        const checkOutTime = new Date()
        const checkInTime = activeSession.checkIn
        const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

        // Update the session with checkout time and hours
        const updatedSession = await prisma.attendanceSession.update({
            where: { id: activeSession.id },
            data: {
                checkOut: checkOutTime,
                hoursWorked: parseFloat(hoursWorked.toFixed(2)),
            },
        })

        // Recalculate total hours for the day
        const allSessions = await prisma.attendanceSession.findMany({
            where: { attendanceId: attendance.id },
        })

        const totalHours = allSessions.reduce((sum, s) => sum + (s.hoursWorked || 0), 0)

        // Update attendance record with total hours
        const updatedAttendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                totalHours: parseFloat(totalHours.toFixed(2)),
            },
            include: {
                sessions: {
                    orderBy: { checkIn: 'asc' },
                },
            },
        })

        return NextResponse.json({
            message: 'Clocked out successfully',
            session: updatedSession,
            attendance: updatedAttendance,
            totalHoursToday: totalHours,
        })
    } catch (error) {
        console.error('Clock out error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// GET - Get current attendance status
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const attendance = await prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId: session.userId,
                    date: today,
                },
            },
            include: {
                sessions: {
                    orderBy: { checkIn: 'asc' },
                },
            },
        })

        if (!attendance) {
            return NextResponse.json({
                hasAttendance: false,
                isActiveClockedIn: false,
                totalHours: 0,
                sessions: [],
            })
        }

        const activeSession = attendance.sessions.find((s) => !s.checkOut)

        return NextResponse.json({
            hasAttendance: true,
            isActiveClockedIn: !!activeSession,
            activeSession: activeSession || null,
            totalHours: attendance.totalHours,
            sessions: attendance.sessions,
            attendance,
        })
    } catch (error) {
        console.error('Get attendance status error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
