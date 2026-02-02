import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createLeaveSchema } from '@/lib/validations'

// GET leave requests
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

        // Employees can only see their own leaves
        if (session.role === 'EMPLOYEE') {
            where.userId = session.userId
        } else {
            // Admin/HR/BA can see all (or filtered)
            if (userId) where.userId = userId
            if (status) where.status = status
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

        const body = await request.json()
        const validation = createLeaveSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { startDate, endDate, reason } = validation.data

        // Get user details for notification
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { name: true, department: true },
        })

        // Create leave request
        const leave = await prisma.leaveRequest.create({
            data: {
                userId: session.userId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
            },
        })

        // Get all admin users to send notifications
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN', status: 'ACTIVE' },
            select: { id: true },
        })

        // Create notifications for all admins
        const notifications = admins.map((admin) => ({
            userId: admin.id,
            title: 'New Leave Request',
            message: `${user?.name} (${user?.department || 'No department'}) has requested leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}. Reason: ${reason}`,
        }))

        await prisma.notification.createMany({
            data: notifications,
        })

        return NextResponse.json({ leave }, { status: 201 })
    } catch (error) {
        console.error('Create leave error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
