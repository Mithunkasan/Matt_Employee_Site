import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { markAttendanceSchema } from '@/lib/validations'
import { calculateOvertimeHours, getISTStartOfDayUTC, roundHours } from '@/lib/time-utils'

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function getISTOfficeEndUTC(reference: Date): Date {
    const shifted = new Date(reference.getTime() + IST_OFFSET_MS)
    return new Date(Date.UTC(
        shifted.getUTCFullYear(),
        shifted.getUTCMonth(),
        shifted.getUTCDate(),
        12,
        0,
        0,
        0
    ))
}

async function autoCheckoutMissedSessions(now: Date) {
    const today = getISTStartOfDayUTC(now)
    const isAfterOfficeEndToday = now.getTime() >= getISTOfficeEndUTC(now).getTime()

    const staleSessions = await prisma.attendanceSession.findMany({
        where: {
            checkOut: null,
            attendance: {
                date: isAfterOfficeEndToday ? { lte: today } : { lt: today },
            },
        },
        include: {
            attendance: {
                select: {
                    id: true,
                    date: true,
                },
            },
        },
    })

    if (staleSessions.length === 0) return

    const attendanceIdsToRecalculate = new Set<string>()

    for (const staleSession of staleSessions) {
        const checkInTime = new Date(staleSession.checkIn)
        const officeEndUTC = getISTOfficeEndUTC(new Date(staleSession.attendance.date))
        const checkOutTime = officeEndUTC.getTime() > checkInTime.getTime() ? officeEndUTC : checkInTime
        const sessionHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
        const roundedSessionHours = Math.max(0, roundHours(sessionHours))
        const sessionOvertimeHours = calculateOvertimeHours(checkInTime, checkOutTime)

        await prisma.attendanceSession.update({
            where: { id: staleSession.id },
            data: {
                checkOut: checkOutTime,
                hoursWorked: roundedSessionHours,
                overtimeHours: sessionOvertimeHours,
                isOvertime: sessionOvertimeHours > 0,
            },
        })

        attendanceIdsToRecalculate.add(staleSession.attendanceId)
    }

    for (const attendanceId of attendanceIdsToRecalculate) {
        const allSessions = await prisma.attendanceSession.findMany({
            where: { attendanceId },
            select: { hoursWorked: true, overtimeHours: true },
        })

        const totalHours = allSessions.reduce((sum, s) => sum + (s.hoursWorked || 0), 0)
        const totalOvertimeHours = allSessions.reduce((sum, s) => sum + (s.overtimeHours || 0), 0)

        await prisma.attendance.update({
            where: { id: attendanceId },
            data: {
                totalHours: roundHours(totalHours),
                overtimeHours: roundHours(totalOvertimeHours),
                isOvertime: totalOvertimeHours > 0,
            },
        })
    }
}

// GET attendance records
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await autoCheckoutMissedSessions(new Date())

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

        let summary: { presentToday: number; absentToday: number } | undefined
        if (session.role === 'ADMIN' || session.role === 'HR') {
            const today = getISTStartOfDayUTC()
            const workforceWhere = {
                status: 'ACTIVE' as const,
                role: { not: 'ADMIN' as const },
            }

            const [totalWorkforce, presentToday] = await Promise.all([
                prisma.user.count({
                    where: workforceWhere,
                }),
                prisma.attendance.count({
                    where: {
                        date: today,
                        status: 'PRESENT',
                        user: workforceWhere,
                    },
                }),
            ])

            summary = {
                presentToday,
                absentToday: Math.max(0, totalWorkforce - presentToday),
            }
        }

        // Transform to include computed fields for backward compatibility
        const now = new Date()
        const transformedAttendances = attendances.map(attendance => {
            const firstSession = attendance.sessions[0]
            const lastSession = attendance.sessions[attendance.sessions.length - 1]
            const hasActiveSession = attendance.sessions.some(s => !s.checkOut)

            // Recalculate working hours from sessions to be 100% accurate
            let totalHours = 0
            let totalOvertimeHours = 0

            attendance.sessions.forEach(session => {
                const checkInTime = new Date(session.checkIn)
                const checkOutTime = session.checkOut ? new Date(session.checkOut) : now
                const diffInMs = checkOutTime.getTime() - checkInTime.getTime()
                const hours = diffInMs / (1000 * 60 * 60)

                totalHours += hours

                totalOvertimeHours += calculateOvertimeHours(checkInTime, checkOutTime)
            })

            return {
                ...attendance,
                checkIn: firstSession?.checkIn || null,
                checkOut: hasActiveSession ? null : lastSession?.checkOut || null,
                workingHours: roundHours(totalHours),
                overtimeHours: roundHours(totalOvertimeHours),
                isOvertime: totalOvertimeHours > 0,
                // Remove sessions from response to keep it clean
                sessions: undefined,
            }
        })

        return NextResponse.json({ attendances: transformedAttendances, summary })
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
        const inputDate = date ? new Date(date) : new Date()
        const istDate = new Date(inputDate.getTime() + (5.5 * 60 * 60 * 1000))
        const todayStr = istDate.toISOString().split('T')[0]
        const attendanceDate = new Date(`${todayStr}T00:00:00Z`)

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
