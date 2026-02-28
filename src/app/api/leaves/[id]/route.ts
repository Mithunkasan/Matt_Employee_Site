import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { updateLeaveSchema } from '@/lib/validations'

interface Params {
    params: Promise<{ id: string }>
}

// PATCH update leave status (Approve/Reject)
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only Admin can manage leaves
        if (session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { id } = await params
        const leaveId = parseInt(id)

        if (isNaN(leaveId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
        }

        const body = await request.json()
        const validation = updateLeaveSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { status } = validation.data

        const existingLeave = await prisma.leaveRequest.findUnique({
            where: { id: leaveId },
        })

        if (!existingLeave) {
            return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
        }

        const leave = await prisma.leaveRequest.update({
            where: { id: leaveId },
            data: { status },
        })

        // Handle Notifications
        if (status === 'APPROVED') {
            // Check for Loss of Pay (LOP) condition
            // Count previously approved leaves for this user
            const approvedCount = await prisma.leaveRequest.count({
                where: {
                    userId: existingLeave.userId,
                    status: 'APPROVED',
                    id: { not: leaveId }, // Exclude current one
                },
            })

            // If user already has at least one approved leave, this one triggers LOP warning
            if (approvedCount >= 1) {
                await prisma.notification.create({
                    data: {
                        userId: existingLeave.userId,
                        title: 'Loss of Pay Alert',
                        message: 'Your leave has been approved, but please note this will be marked as Loss of Pay (LOP).',
                    },
                })
            } else {
                await prisma.notification.create({
                    data: {
                        userId: existingLeave.userId,
                        title: 'Leave Approved',
                        message: 'Your leave request has been approved.',
                    },
                })
            }
        } else if (status === 'REJECTED') {
            await prisma.notification.create({
                data: {
                    userId: existingLeave.userId,
                    title: 'Leave Rejected',
                    message: 'Your leave request has been rejected.',
                },
            })
        }

        return NextResponse.json({ leave })
    } catch (error) {
        console.error('Update leave error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
