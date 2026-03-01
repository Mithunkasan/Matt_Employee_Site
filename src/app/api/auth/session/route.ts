import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getClientIpFromHeaders } from '@/lib/request-ip'

const ACTIVE_SESSION_TIMEOUT_MS = 15 * 60 * 1000

function parseSessionLockToken(token?: string | null): { ip: string; sid: string; ts: number } | null {
    if (!token) return null

    const match = token.match(/^ip:(.+)\|sid:([^|]+)\|ts:(\d+)$/)
    if (!match) return null

    return {
        ip: match[1],
        sid: match[2],
        ts: Number(match[3]),
    }
}

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
        const now = Date.now()

        // Single session enforcement (except for Admin)
        if (session.role !== 'ADMIN') {
            const user = await prisma.user.findUnique({
                where: { id: session.userId },
                select: { activeSessionId: true, lastActivityAt: true }
            })

            const activeToken = parseSessionLockToken(user?.activeSessionId)
            const isSessionIdMismatch = !user || user.activeSessionId !== session.sessionId
            const isIpMismatch = !!activeToken && !!session.ipAddress && session.ipAddress !== clientIp
            const lastSeenAtMs = user?.lastActivityAt ? new Date(user.lastActivityAt).getTime() : 0
            const lockTimestamp = activeToken?.ts ?? 0
            const isStaleSession =
                (lastSeenAtMs > 0 && now - lastSeenAtMs > ACTIVE_SESSION_TIMEOUT_MS) ||
                (lockTimestamp > 0 && now - lockTimestamp > ACTIVE_SESSION_TIMEOUT_MS)

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
