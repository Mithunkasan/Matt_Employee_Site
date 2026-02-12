import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createWfhSchema } from '@/lib/validations'

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

        // Employees can only see their own WFH requests
        if (session.role === 'EMPLOYEE') {
            where.userId = session.userId
        } else if (session.role !== 'ADMIN' && session.role !== 'HR' && session.role !== 'BA') {
            // Other roles also restricted to their own?
            // User requested Employee, HR, BA dashboard support.
            // HR and BA might need to see all or their own.
            // Usually Admin/HR/BA see all for approval/monitoring.
            if (userId) where.userId = userId
            if (status) where.status = status
        } else {
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

        const body = await request.json()
        const validation = createWfhSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { startDate, endDate, reason } = validation.data

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { name: true, department: true },
        })

        const wfhRequest = await prisma.workFromHomeRequest.create({
            data: {
                userId: session.userId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
            },
        })

        const adminsAndHR = await prisma.user.findMany({
            where: {
                role: { in: ['ADMIN', 'HR'] },
                status: 'ACTIVE'
            },
            select: { id: true },
        })

        const notifications = adminsAndHR.map((staff) => ({
            userId: staff.id,
            title: 'New WFH Request',
            message: `${user?.name} (${user?.department || 'No department'}) has requested WFH from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}. Reason: ${reason}`,
        }))

        await prisma.notification.createMany({
            data: notifications,
        })

        return NextResponse.json({ request: wfhRequest }, { status: 201 })
    } catch (error) {
        console.error('Create WFH error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
