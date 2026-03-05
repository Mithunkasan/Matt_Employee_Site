import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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

        if (session.role === 'ADMIN') {
            if (status) where.status = status
            if (userId) where.userId = userId
        } else {
            where.userId = session.userId
            if (status) where.status = status
        }

        const requests = await prisma.overtimeLoginRequest.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true,
                    },
                },
                reviewedBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [{ requestDate: 'desc' }, { createdAt: 'desc' }],
        })

        return NextResponse.json({ requests })
    } catch (error) {
        console.error('Get overtime requests error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
