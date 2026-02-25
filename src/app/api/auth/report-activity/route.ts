import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(req: Request) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { type } = await req.json()

        if (type === 'stuck_key') {
            await prisma.user.update({
                where: { id: session.userId },
                data: { stuckKeyAlert: true },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Report activity error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
