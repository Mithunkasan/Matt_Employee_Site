import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createWfhSchema } from '@/lib/validations'

const COMPANY_TIMEZONE = 'Asia/Kolkata'

function isSundayInCompanyTimezone() {
    const weekday = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        timeZone: COMPANY_TIMEZONE,
    }).format(new Date())

    return weekday === 'Sun'
}

function hasSundayInRange(startDate: Date, endDate: Date) {
    const current = new Date(startDate)
    current.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)

    while (current <= end) {
        if (current.getDay() === 0) {
            return true
        }
        current.setDate(current.getDate() + 1)
    }

    return false
}

// GET WFH requests
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const userId = searchParams.get('userId')

        const where: Record<string, unknown> = {}

        // Visibility restriction: Only respective person, Admin, and HR can see details
        const isAdminOrHR = session.role === 'ADMIN' || session.role === 'HR'
        if (!isAdminOrHR) {
            where.userId = session.userId
        } else {
            // Admin/HR can see all (or filtered)
            if (userId) where.userId = userId
            if (status) where.status = status
        }

        const requests = await prisma.workFromHomeRequest.findMany({
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

        return NextResponse.json({ requests })
    } catch (error) {
        console.error('Get WFH requests error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST create WFH request
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Company holiday rule: no WFH requests can be submitted on Sunday.
        if (isSundayInCompanyTimezone()) {
            return NextResponse.json(
                { error: 'Today is Sunday. Work From Home requests cannot be submitted on Sunday.' },
                { status: 400 }
            )
        }

        const body = await request.json()
        const validation = createWfhSchema.safeParse(body)

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
                { error: 'Sunday is a holiday. Work From Home requests cannot be submitted for Sunday.' },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { name: true, department: true },
        })

        const wfhRequest = await prisma.workFromHomeRequest.create({
            data: {
                userId: session.userId,
                startDate: requestStartDate,
                endDate: requestEndDate,
                reason,
            },
        })

        const admins = await prisma.user.findMany({
            where: {
                role: 'ADMIN',
                status: 'ACTIVE'
            },
            select: { id: true },
        })

        const notifications = admins.map((staff) => ({
            userId: staff.id,
            title: 'New WFH Request',
            message: `${user?.name} (${user?.department || 'No department'}) has requested WFH from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}. Reason: ${reason}`,
        }))

        if (notifications.length > 0) {
            await prisma.notification.createMany({
                data: notifications,
            })
        }

        return NextResponse.json({ request: wfhRequest }, { status: 201 })
    } catch (error) {
        console.error('Create WFH error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
