import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { getISTStartOfDayUTC } from '@/lib/time-utils'

function createUTCDate(year: number, monthIndex: number, day: number) {
    return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0))
}

function addUTCDays(date: Date, days: number) {
    const next = new Date(date)
    next.setUTCDate(next.getUTCDate() + days)
    return next
}

function toDateKey(date: Date) {
    return date.toISOString().split('T')[0]
}

function getDateKeysInRange(startDate: Date, endDate: Date) {
    const dateKeys: string[] = []
    let current = new Date(startDate)

    while (current.getTime() <= endDate.getTime()) {
        dateKeys.push(toDateKey(current))
        current = addUTCDays(current, 1)
    }

    return dateKeys
}

function getOverlappingDateKeys(startDate: Date, endDate: Date, leaveStart: Date, leaveEnd: Date) {
    const normalizedLeaveStart = createUTCDate(
        leaveStart.getUTCFullYear(),
        leaveStart.getUTCMonth(),
        leaveStart.getUTCDate()
    )
    const normalizedLeaveEnd = createUTCDate(
        leaveEnd.getUTCFullYear(),
        leaveEnd.getUTCMonth(),
        leaveEnd.getUTCDate()
    )

    const overlapStart = normalizedLeaveStart.getTime() > startDate.getTime() ? normalizedLeaveStart : startDate
    const overlapEnd = normalizedLeaveEnd.getTime() < endDate.getTime() ? normalizedLeaveEnd : endDate

    if (overlapStart.getTime() > overlapEnd.getTime()) {
        return []
    }

    return getDateKeysInRange(overlapStart, overlapEnd)
}

export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session || (session.role !== 'ADMIN' && session.role !== 'HR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || 'monthly'
        const dateStr = searchParams.get('date') // Format: YYYY-MM (monthly) or YYYY-MM-DD (weekly start)

        if (!dateStr) {
            return NextResponse.json({ error: 'Date is required' }, { status: 400 })
        }

        let startDate: Date
        let endDate: Date

        if (type === 'monthly') {
            const [year, monthNum] = dateStr.split('-').map(Number)
            startDate = createUTCDate(year, monthNum - 1, 1)
            endDate = createUTCDate(year, monthNum, 0)
        } else {
            // Weekly
            const [year, monthNum, dayNum] = dateStr.split('-').map(Number)
            startDate = createUTCDate(year, monthNum - 1, dayNum)
            endDate = addUTCDays(startDate, 6)
        }

        const reportDates = getDateKeysInRange(startDate, endDate)
        const todayKey = toDateKey(getISTStartOfDayUTC(new Date()))

        // Fetch all users
        const users = await prisma.user.findMany({
            where: {
                status: 'ACTIVE',
            },
            select: {
                id: true,
                name: true,
                email: true,
                department: true,
                role: true,
            },
            orderBy: { name: 'asc' },
        })

        // Fetch all attendance for the period
        const attendances = await prisma.attendance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                sessions: {
                    orderBy: { checkIn: 'asc' },
                },
            },
        })

        // Fetch all approved leaves for the period
        const leaves = await prisma.leaveRequest.findMany({
            where: {
                status: 'APPROVED',
                OR: [
                    {
                        startDate: { lte: endDate },
                        endDate: { gte: startDate }
                    }
                ]
            }
        })

        // Format data for the grid
        const reportData = users.map(user => {
            const userAttendances = attendances.filter(a => a.userId === user.id)
            const userLeaves = leaves.filter(l => l.userId === user.id)

            const dailyData: Record<string, any> = {}
            const attendanceByDate = new Map(
                userAttendances.map(attendance => [toDateKey(new Date(attendance.date)), attendance])
            )
            const leaveByDate = new Map<string, { reason: string }>()

            userLeaves.forEach(leave => {
                const leaveDateKeys = getOverlappingDateKeys(
                    startDate,
                    endDate,
                    new Date(leave.startDate),
                    new Date(leave.endDate)
                )

                leaveDateKeys.forEach(dateKey => {
                    leaveByDate.set(dateKey, { reason: leave.reason })
                })
            })

            reportDates.forEach(dateKey => {
                const attendance = attendanceByDate.get(dateKey)
                const leave = leaveByDate.get(dateKey)
                const isFutureDate = dateKey > todayKey

                if (attendance) {
                    const shouldKeepLeave = leave && attendance.status === 'ABSENT'
                    const effectiveStatus = shouldKeepLeave ? 'LEAVE' : attendance.status

                    if (!(isFutureDate && effectiveStatus === 'ABSENT')) {
                        dailyData[dateKey] = {
                            id: attendance.id,
                            status: effectiveStatus,
                            totalHours: attendance.totalHours,
                            sessions: attendance.sessions.map(s => ({
                                checkIn: s.checkIn,
                                checkOut: s.checkOut,
                                hoursWorked: s.hoursWorked,
                            })),
                            reason: shouldKeepLeave ? leave?.reason : undefined,
                        }
                    }

                    return
                }

                if (leave) {
                    dailyData[dateKey] = {
                        status: 'LEAVE',
                        totalHours: 0,
                        sessions: [],
                        reason: leave.reason,
                    }
                    return
                }

                if (!isFutureDate) {
                    dailyData[dateKey] = {
                        status: 'ABSENT',
                        totalHours: 0,
                        sessions: [],
                    }
                }
            })

            const dailyEntries = Object.values(dailyData)
            const presentDays = dailyEntries.filter((entry: any) => entry.status === 'PRESENT' || entry.status === 'WFH').length
            const absentDays = dailyEntries.filter((entry: any) => entry.status === 'ABSENT').length
            const leaveDays = dailyEntries.filter((entry: any) => entry.status === 'LEAVE').length

            return {
                ...user,
                dailyData,
                totalMonthlyHours: userAttendances.reduce((sum, a) => sum + (a.totalHours || 0), 0),
                presentDays,
                absentDays,
                leaveDays,
                absentOrLeaveDays: absentDays + leaveDays,
            }
        })

        return NextResponse.json({
            reportData,
            date: dateStr,
            type,
            daysInReport: reportDates.length,
            reportDates,
        })
    } catch (error) {
        console.error('Attendance report API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
