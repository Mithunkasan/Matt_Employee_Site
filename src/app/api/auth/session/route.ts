import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            )
        }

        // Single session enforcement (except for Admin)
        if (session.role !== 'ADMIN') {
            const user = await prisma.user.findUnique({
                where: { id: session.userId },
                select: { activeSessionId: true }
            })

            if (!user || user.activeSessionId !== session.sessionId) {
                // Another session is active, or user not found
                const response = NextResponse.json(
                    { error: 'Session invalidated by another login' },
                    { status: 401 }
                )
                // Delete session cookie
                response.cookies.delete('session')
                return response
            }
        }

        return NextResponse.json({
            user: {
                userId: session.userId,
                name: session.name,
                email: session.email,
                role: session.role,
            },
        })
    } catch (error) {
        console.error('Session error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
