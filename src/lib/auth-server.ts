import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { SessionPayload, Role } from './auth'

const secretKey = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const key = new TextEncoder().encode(secretKey)

export async function encrypt(payload: SessionPayload): Promise<string> {
    return await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(key)
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: ['HS256'],
        })
        return payload as unknown as SessionPayload
    } catch {
        return null
    }
}

export async function createSession(user: {
    id: string
    email: string
    name: string
    role: Role
    designation?: string | null
    sessionId: string
    ipAddress: string
}): Promise<void> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    const session: SessionPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        designation: user.designation,
        sessionId: user.sessionId,
        ipAddress: user.ipAddress,
        expiresAt,
    }
    const token = await encrypt(session)

    const cookieStore = await cookies()
    cookieStore.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
    })
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return null
    return await decrypt(token)
}

export async function deleteSession(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete('session')
}

export async function verifySession(): Promise<SessionPayload | null> {
    const session = await getSession()
    if (!session) return null
    if (new Date(session.expiresAt) < new Date()) {
        await deleteSession()
        return null
    }
    return session
}
