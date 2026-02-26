import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getClientIpFromHeaders } from '@/lib/request-ip'

export async function GET(request: Request) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            )
        }

        const clientIp = getClientIpFromHeaders(request.headers)
        const activeWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000)

        // Single session enforcement (except for Admin)
        if (session.role !== 'ADMIN') {
            const user = await prisma.user.findUnique({
                where: { id: session.userId },
                select: {
                    activeSessionId: true,
                    activeSessionIp: true,
                    activeSessionStartedAt: true,
                }
            })

            const isSessionIdMismatch = !user || user.activeSessionId !== session.sessionId
            const isIpMismatch =
                user?.activeSessionIp &&
                clientIp !== 'unknown' &&
                user.activeSessionIp !== clientIp
            const isStaleSession =
                !!user?.activeSessionStartedAt &&
                user.activeSessionStartedAt < activeWindowStart

            if (isSessionIdMismatch || isIpMismatch || isStaleSession) {
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
