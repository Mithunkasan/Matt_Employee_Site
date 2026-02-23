import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession, canViewAllAttendance } from '@/lib/auth'
import { markAttendanceSchema } from '@/lib/validations'

// GET attendance records
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const month = searchParams.get('month') // Format: YYYY-MM

        const where: Record<string, unknown> = {}

        // Employees and other individual roles can only see their own attendance
        if (['EMPLOYEE', 'INTERN', 'TEAM_COORDINATOR', 'PA'].includes(session.role)) {
            where.userId = session.userId
        } else if (userId) {
            where.userId = userId
        }

        // Date filtering
        if (month) {
            const [year, monthNum] = month.split('-').map(Number)
            const start = new Date(year, monthNum - 1, 1)
            const end = new Date(year, monthNum, 0)
            where.date = {
                gte: start,
                lte: end,
            }
        } else if (startDate || endDate) {
            where.date = {}
            if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate)
            if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate)
        }

        const attendances = await prisma.attendance.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true,
                    },
                },
                sessions: {
                    orderBy: {
                        checkIn: 'asc',
                    },
                },
            },
            orderBy: { date: 'desc' },
        })

        // Transform to include computed fields for backward compatibility
        const transformedAttendances = attendances.map(attendance => {
            const firstSession = attendance.sessions[0]
            const lastSession = attendance.sessions[attendance.sessions.length - 1]

            // Check if there's an active session (no checkOut)
            const hasActiveSession = attendance.sessions.some(s => !s.checkOut)

            return {
                ...attendance,
                checkIn: firstSession?.checkIn || null,
                checkOut: hasActiveSession ? null : lastSession?.checkOut || null,
                workingHours: attendance.totalHours,
                // Remove sessions from response to keep it clean
                sessions: undefined,
            }
        })

        return NextResponse.json({ attendances: transformedAttendances })
    } catch (error) {
        console.error('Get attendance error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST mark attendance
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const validation = markAttendanceSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { status, date, notes } = validation.data
        const attendanceDate = date ? new Date(date) : new Date()

        // Normalize date to start of day
        attendanceDate.setHours(0, 0, 0, 0)

        // Check if attendance already exists for this date
        const existingAttendance = await prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId: session.userId,
                    date: attendanceDate,
                },
            },
        })

        if (existingAttendance) {
            // Update existing attendance
            const attendance = await prisma.attendance.update({
                where: { id: existingAttendance.id },
                data: {
                    status,
                    notes,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            })

            // If marking as PRESENT and no active session, create a new session
            if (status === 'PRESENT') {
                const activeSessions = await prisma.attendanceSession.findMany({
                    where: {
                        attendanceId: existingAttendance.id,
                        checkOut: null,
                    },
                })

                if (activeSessions.length === 0) {
                    await prisma.attendanceSession.create({
                        data: {
                            attendanceId: existingAttendance.id,
                            checkIn: new Date(),
                        },
                    })
                }
            }

            return NextResponse.json({ attendance, message: 'Attendance updated' })
        }

        // Create new attendance
        const attendance = await prisma.attendance.create({
            data: {
                userId: session.userId,
                date: attendanceDate,
                status,
                notes,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })

        // If marking as PRESENT, create a new attendance session
        if (status === 'PRESENT') {
            await prisma.attendanceSession.create({
                data: {
                    attendanceId: attendance.id,
                    checkIn: new Date(),
                },
            })
        }

        return NextResponse.json({ attendance }, { status: 201 })
    } catch (error) {
        console.error('Mark attendance error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
