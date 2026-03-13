// Shared auth types and role helpers (client-safe)

export type Role =
    | 'ADMIN'
    | 'HR'
    | 'BA'
    | 'PA'
    | 'MANAGER'
    | 'TEAM_LEADER'
    | 'TEAM_COORDINATOR'
    | 'EMPLOYEE'
    | 'INTERN'

export interface SessionPayload {
    userId: string
    email: string
    name: string
    role: Role
    designation?: string | null
    sessionId: string
    ipAddress: string
    expiresAt: Date
}

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
    return role === 'ADMIN' || role === 'HR' || role === 'BA' || role === 'PA'
}

export function canUpdateProjects(role: Role): boolean {
    return role === 'ADMIN' || role === 'BA' || role === 'PA' || role === 'MANAGER' || role === 'TEAM_LEADER'
}

export function canManageEmployees(role: Role): boolean {
    return role === 'ADMIN' || role === 'HR'
}

export function isHrLike(role: Role, designation?: string | null): boolean {
    return role === 'HR' || (role === 'INTERN' && (designation || '').toUpperCase() === 'HR')
}

export function canViewAllAttendance(role: Role): boolean {
    return role === 'ADMIN' || role === 'HR'
}

export function canViewAllReports(role: Role): boolean {
    return role === 'ADMIN' || role === 'BA' || role === 'PA' || role === 'MANAGER'
}
