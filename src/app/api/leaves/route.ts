import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createLeaveSchema } from '@/lib/validations'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const COMPANY_TIMEZONE = 'Asia/Kolkata'

function startOfDay(date: Date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

function addDays(date: Date, days: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
}

// Company month cycle: 5th (inclusive) to next month's 5th (exclusive)
function getCompanyCycleRange(referenceDate: Date) {
    const year = referenceDate.getFullYear()
    const month = referenceDate.getMonth()
    const day = referenceDate.getDate()

    const cycleStart = day >= 5
        ? new Date(year, month, 5)
        : new Date(year, month - 1, 5)
    const cycleEnd = day >= 5
        ? new Date(year, month + 1, 5)
        : new Date(year, month, 5)

    cycleStart.setHours(0, 0, 0, 0)
    cycleEnd.setHours(0, 0, 0, 0)

    return { cycleStart, cycleEnd }
}

// Count overlapping leave days where leave dates are inclusive and cycle end is exclusive.
function getOverlappingDays(leaveStart: Date, leaveEnd: Date, cycleStart: Date, cycleEnd: Date) {
    const leaveStartDay = startOfDay(leaveStart)
    const leaveEndExclusive = addDays(startOfDay(leaveEnd), 1)
    const overlapStart = leaveStartDay > cycleStart ? leaveStartDay : cycleStart
    const overlapEnd = leaveEndExclusive < cycleEnd ? leaveEndExclusive : cycleEnd

    if (overlapEnd <= overlapStart) return 0

    return Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / MS_PER_DAY)
}

function getInclusiveDays(startDate: Date, endDate: Date) {
    const start = startOfDay(startDate)
    const endExclusive = addDays(startOfDay(endDate), 1)

    if (endExclusive <= start) return 0

    return Math.floor((endExclusive.getTime() - start.getTime()) / MS_PER_DAY)
}

function isSundayInCompanyTimezone() {
    const weekday = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        timeZone: COMPANY_TIMEZONE,
    }).format(new Date())

    return weekday === 'Sun'
}

function hasSundayInRange(startDate: Date, endDate: Date) {
    const current = startOfDay(startDate)
    const end = startOfDay(endDate)

    while (current <= end) {
        if (current.getDay() === 0) {
            return true
        }
        current.setDate(current.getDate() + 1)
    }

    return false
}

// GET leave requests
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only Admin can view leave requests.
        if (session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const userId = searchParams.get('userId')
        const month = searchParams.get('month') // Format: YYYY-MM

        const where: Record<string, any> = {}
        if (userId) where.userId = userId
        if (status) where.status = status

        if (month) {
            const [year, monthNum] = month.split('-')
            const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
            const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59)
            where.startDate = {
                gte: startDate,
                lte: endDate
            }
        }

        const leaves = await prisma.leaveRequest.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        department: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ leaves })
    } catch (error) {
        console.error('Get leaves error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST create leave request
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Company holiday rule: no leave requests can be submitted on Sunday.
        if (isSundayInCompanyTimezone()) {
            return NextResponse.json(
                { error: 'Today is Sunday. Leave requests cannot be submitted on Sunday.' },
                { status: 400 }
            )
        }

        const body = await request.json()
        const validation = createLeaveSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { startDate, endDate, reason } = validation.data
        const requestStartDate = new Date(startDate)
        const requestEndDate = new Date(endDate)

        if (hasSundayInRange(requestStartDate, requestEndDate)) {
            return NextResponse.json(
                { error: 'Sunday is a holiday. Leave requests cannot be submitted for Sunday.' },
                { status: 400 }
            )
        }

        // Non-admin users get 1 paid leave day per company cycle (5th to 5th).
        // Remaining day(s), including continuous leaves, are treated as LOP.
        let isLossOfPay = false
        if (session.role !== 'ADMIN') {
            // Cycle is based on request submission date, per business rule.
            const { cycleStart, cycleEnd } = getCompanyCycleRange(new Date())
            const approvedLeavesInCycle = await prisma.leaveRequest.findMany({
                where: {
                    userId: session.userId,
                    status: 'APPROVED',
                    startDate: { lt: cycleEnd },
                    endDate: { gte: cycleStart },
                },
                select: {
                    startDate: true,
                    endDate: true,
                },
            })

            const approvedDaysInCycle = approvedLeavesInCycle.reduce(
                (total, leave) => total + getOverlappingDays(leave.startDate, leave.endDate, cycleStart, cycleEnd),
                0
            )

            const requestedDays = getInclusiveDays(requestStartDate, requestEndDate)
            const freeDaysAllowed = 1
            const remainingFreeDays = Math.max(0, freeDaysAllowed - approvedDaysInCycle)
            isLossOfPay = requestedDays > remainingFreeDays
        }

        // Get user details for notification
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { name: true, department: true },
        })

        // Create leave request
        const leave = await prisma.leaveRequest.create({
            data: {
                userId: session.userId,
                startDate: requestStartDate,
                endDate: requestEndDate,
                reason,
            },
        })

        // Send request notifications to Admin only.
        const admins = await prisma.user.findMany({
            where: {
                role: 'ADMIN',
                status: 'ACTIVE'
            },
            select: { id: true },
        })

        const notifications = admins.map((staff) => ({
            userId: staff.id,
            title: 'New Leave Request',
            message: `${user?.name} (${user?.department || 'No department'}) has requested leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}. Reason: ${reason}`,
        }))

        if (notifications.length > 0) {
            await prisma.notification.createMany({
                data: notifications,
            })
        }

        return NextResponse.json({ leave, isLossOfPay }, { status: 201 })
    } catch (error) {
        console.error('Create leave error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
