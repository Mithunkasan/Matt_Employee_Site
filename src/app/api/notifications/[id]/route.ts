import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

interface Params {
    params: Promise<{ id: string }>
}

// PATCH mark notification as read
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const notificationId = parseInt(id)

        if (isNaN(notificationId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
        }

        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
        })

        if (!notification) {
            return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
        }

        if (notification.userId !== session.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const updatedNotification = await prisma.notification.update({
            where: { id: notificationId },
            data: { read: true },
        })

        return NextResponse.json({ notification: updatedNotification })
    } catch (error) {
        console.error('Update notification error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
