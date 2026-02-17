import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const { replyText } = await request.json()

        if (!replyText) {
            return NextResponse.json({ error: 'Reply text is required' }, { status: 400 })
        }

        // Expanded roles allowed to reply
        const canReply = ['ADMIN', 'HR', 'BA', 'PA', 'MANAGER', 'TEAM_LEADER', 'TEAM_COORDINATOR', 'EMPLOYEE'].includes(session.role)
        if (!canReply) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const report = await prisma.dailyReport.update({
            where: { id },
            data: {
                replyText,
                repliedAt: new Date(),
                repliedById: session.userId,
            },
            include: {
                user: { select: { id: true, name: true } },
            }
        })

        // Notify the person who submitted the report
        await prisma.notification.create({
            data: {
                userId: report.userId,
                title: 'New Reply to Your Report',
                message: `${session.name} replied to your report: "${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}"`,
            }
        })

        return NextResponse.json({ report })
    } catch (error) {
        console.error('Reply to report error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
