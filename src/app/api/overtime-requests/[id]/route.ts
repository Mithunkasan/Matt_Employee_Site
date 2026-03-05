import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

interface Params {
    params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const status = body?.status

        if (status !== 'APPROVED' && status !== 'REJECTED') {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        const existing = await prisma.overtimeLoginRequest.findUnique({
            where: { id },
        })

        if (!existing) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 })
        }

        const updated = await prisma.overtimeLoginRequest.update({
            where: { id },
            data: {
                status,
                reviewedAt: new Date(),
                reviewedById: session.userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        })

        await prisma.notification.create({
            data: {
                userId: updated.userId,
                title: `Overtime Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
                message: `Your overtime login request for ${new Date(updated.requestDate).toLocaleDateString()} has been ${status.toLowerCase()}.`,
            },
        })

        return NextResponse.json({ request: updated })
    } catch (error) {
        console.error('Update overtime request error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
