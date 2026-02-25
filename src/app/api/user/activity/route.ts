import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(req: Request) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { stuckKey } = await req.json()

        await (prisma.user.update as any)({
            where: { id: session.userId },
            data: {
                lastActivityAt: new Date(),
                stuckKeyAlert: stuckKey
            }
        })

        if (stuckKey) {
            const alertedUsers = await prisma.user.findMany({
                where: {
                    role: { in: ['ADMIN', 'HR'] }
                }
            })

            const recentNotification = await prisma.notification.findFirst({
                where: {
                    userId: alertedUsers[0]?.id,
                    title: 'Stuck Key Alert',
                    message: { contains: session.name },
                    createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }
                }
            })

            if (!recentNotification) {
                for (const user of alertedUsers) {
                    await prisma.notification.create({
                        data: {
                            userId: user.id,
                            title: 'Stuck Key Alert',
                            message: `Suspicious activity detected: Employee ${session.name} (${session.role}) has been pressing a key continuously for over 10 minutes.`,
                        }
                    })
                }
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Activity update error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
