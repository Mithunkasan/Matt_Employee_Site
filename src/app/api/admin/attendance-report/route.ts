import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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
            startDate = new Date(year, monthNum - 1, 1)
            endDate = new Date(year, monthNum, 0, 23, 59, 59, 999)
        } else {
            // Weekly
            startDate = new Date(dateStr)
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(startDate)
            endDate.setDate(startDate.getDate() + 6)
            endDate.setHours(23, 59, 59, 999)
        }

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

            // Map daily status
            const dailyData: Record<number, any> = {}

            // Fill leaves first
            userLeaves.forEach(leave => {
                const lStart = new Date(leave.startDate)
                const lEnd = new Date(leave.endDate)

                // Iterate through each day of the interval
                const current = new Date(startDate)
                while (current <= endDate) {
                    if (current >= lStart && current <= lEnd) {
                        const day = current.getDate()
                        dailyData[day] = {
                            status: 'LEAVE',
                            totalHours: 0,
                            sessions: [],
                            reason: leave.reason
                        }
                    }
                    current.setDate(current.getDate() + 1)
                }
            })

            // Overwrite with attendance if exists (attendance takes precedence)
            userAttendances.forEach(a => {
                const day = new Date(a.date).getDate()
                dailyData[day] = {
                    id: a.id,
                    status: a.status,
                    totalHours: a.totalHours,
                    sessions: a.sessions.map(s => ({
                        checkIn: s.checkIn,
                        checkOut: s.checkOut,
                        hoursWorked: s.hoursWorked,
                    })),
                }
            })

            return {
                ...user,
                dailyData,
                totalMonthlyHours: userAttendances.reduce((sum, a) => sum + (a.totalHours || 0), 0),
                presentDays: userAttendances.filter(a => a.status === 'PRESENT').length,
                leaveDays: Object.values(dailyData).filter((d: any) => d.status === 'LEAVE').length,
            }
        })

        const daysInInterval = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

        return NextResponse.json({
            reportData,
            date: dateStr,
            type,
            daysInReport: daysInInterval,
        })
    } catch (error) {
        console.error('Attendance report API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
