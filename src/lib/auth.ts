import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

// Role type matching Prisma schema
export type Role = 'ADMIN' | 'HR' | 'BA' | 'PA' | 'MANAGER' | 'TEAM_LEADER' | 'TEAM_COORDINATOR' | 'EMPLOYEE' | 'INTERN'

const secretKey = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const key = new TextEncoder().encode(secretKey)

export interface SessionPayload {
    userId: string
    email: string
    name: string
    role: Role
    sessionId: string
    expiresAt: Date
}

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
    sessionId: string
}): Promise<void> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    const session: SessionPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        sessionId: user.sessionId,
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

// Role-based access helpers
export function canAccessAdmin(role: Role): boolean {
    return role === 'ADMIN'
}

export function canAccessHR(role: Role): boolean {
    return role === 'ADMIN' || role === 'HR'
}

export function canAccessBA(role: Role): boolean {
    return role === 'ADMIN' || role === 'BA' || role === 'PA'
}

export function canCreateProjects(role: Role): boolean {
    return role === 'ADMIN' || role === 'BA' || role === 'PA'
}

export function canUpdateProjects(role: Role): boolean {
    return role === 'ADMIN' || role === 'BA' || role === 'PA' || role === 'MANAGER' || role === 'TEAM_LEADER'
}

export function canManageEmployees(role: Role): boolean {
    return role === 'ADMIN' || role === 'HR'
}

export function canViewAllAttendance(role: Role): boolean {
    return role === 'ADMIN' || role === 'HR'
}

export function canViewAllReports(role: Role): boolean {
    return role === 'ADMIN' || role === 'BA' || role === 'PA' || role === 'MANAGER'
}
