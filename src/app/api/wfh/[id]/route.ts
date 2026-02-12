import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { updateWfhSchema } from '@/lib/validations'

// PATCH update WFH request status (Approve/Decline)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: requestId } = await params
        const session = await getSession()
        // Only Admin or HR can approve/decline WFH
        if (!session || (session.role !== 'ADMIN' && session.role !== 'HR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const validation = updateWfhSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { status } = validation.data

        const wfhRequest = await prisma.workFromHomeRequest.update({
            where: { id: requestId },
            data: { status },
            include: { user: true }
        })

        // Notify user about the decision
        await prisma.notification.create({
            data: {
                userId: wfhRequest.userId,
                title: `WFH Request ${status.toLowerCase()}`,
                message: `Your WFH request for ${new Date(wfhRequest.startDate).toLocaleDateString()} to ${new Date(wfhRequest.endDate).toLocaleDateString()} has been ${status.toLowerCase()}.`,
            },
        })

        return NextResponse.json({ request: wfhRequest })
    } catch (error) {
        console.error('Update WFH error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE WFH request
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: requestId } = await params
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const wfhRequest = await prisma.workFromHomeRequest.findUnique({
            where: { id: requestId },
        })

        if (!wfhRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 })
        }

        // Only owner or admin can delete
        if (wfhRequest.userId !== session.userId && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await prisma.workFromHomeRequest.delete({
            where: { id: requestId },
        })

        return NextResponse.json({ message: 'Request deleted' })
    } catch (error) {
        console.error('Delete WFH error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
