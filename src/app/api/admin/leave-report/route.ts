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
        const type = searchParams.get('type') || 'monthly' // monthly or weekly
        const dateStr = searchParams.get('date') // YYYY-MM or YYYY-MM-DD (start of week)

        if (!dateStr) {
            return NextResponse.json({ error: 'Date is required' }, { status: 400 })
        }

        let startDate: Date
        let endDate: Date

        if (type === 'monthly') {
            const [year, monthNum] = dateStr.split('-').map(Number)
            startDate = new Date(year, monthNum - 1, 1)
            endDate = new Date(year, monthNum, 0, 23, 59, 59)
        } else {
            // Weekly
            startDate = new Date(dateStr)
            endDate = new Date(startDate)
            endDate.setDate(startDate.getDate() + 6)
            endDate.setHours(23, 59, 59, 999)
        }

        // Fetch all users
        const users = await prisma.user.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                name: true,
                department: true,
                role: true,
            },
            orderBy: { name: 'asc' },
        })

        // Fetch all leave requests that overlap with the period
        const leaves = await prisma.leaveRequest.findMany({
            where: {
                OR: [
                    {
                        startDate: { gte: startDate, lte: endDate },
                    },
                    {
                        endDate: { gte: startDate, lte: endDate },
                    },
                    {
                        startDate: { lte: startDate },
                        endDate: { gte: endDate },
                    }
                ],
                status: 'APPROVED'
            },
            include: { user: true }
        })

        // Aggregate data
        const reportData = users.map(user => {
            const userLeaves = leaves.filter(l => l.userId === user.id)

            // Calculate total leave days in this period
            let totalDays = 0
            userLeaves.forEach(l => {
                const lStart = l.startDate > startDate ? l.startDate : startDate
                const lEnd = l.endDate < endDate ? l.endDate : endDate
                const diffTime = Math.abs(lEnd.getTime() - lStart.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                totalDays += diffDays
            })

            return {
                ...user,
                leaveDays: totalDays,
                requests: userLeaves.map(l => ({
                    id: l.id,
                    startDate: l.startDate,
                    endDate: l.endDate,
                    reason: l.reason
                }))
            }
        })

        return NextResponse.json({
            reportData,
            startDate,
            endDate,
            type
        })
    } catch (error) {
        console.error('Leave report API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
