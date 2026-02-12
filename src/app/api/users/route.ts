import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { getSession, canManageEmployees } from '@/lib/auth'
import { createUserSchema } from '@/lib/validations'

// GET all users
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const role = searchParams.get('role')
        const status = searchParams.get('status')
        const search = searchParams.get('search')
        const managerId = searchParams.get('managerId')

        const where: Record<string, unknown> = {}

        if (managerId) where.managerId = managerId

        if (role) {
            if (role.includes(',')) {
                where.role = { in: role.split(',') }
            } else {
                where.role = role
            }
        }
        if (status) where.status = status
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ]
        }

        // Regular employees can only see limited info
        if (session.role === 'EMPLOYEE') {
            const users = await prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    department: true,
                },
                orderBy: { name: 'asc' },
            })
            return NextResponse.json({ users })
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                department: true,
                phone: true,
                managerId: true,
                createdAt: true,
                manager: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ users })
    } catch (error) {
        console.error('Get users error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST create new user
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only ADMIN and HR can register users
        if (session.role !== 'ADMIN' && session.role !== 'HR') {
            return NextResponse.json(
                { error: 'Only ADMIN and HR can register users' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const validation = createUserSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { email, password, role, managerId: rawManagerId, ...userData } = validation.data
        const managerId = rawManagerId && rawManagerId !== "" ? rawManagerId : undefined

        // Check if email exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'Email already in use' },
                { status: 400 }
            )
        }

        // Determine manager based on role and who is registering
        let finalManagerId = managerId

        if (session.role === 'ADMIN') {
            // Admin can create anyone
            if (role === 'ADMIN' || role === 'HR') {
                finalManagerId = undefined // Admin and HR don't have managers
            } else if (role === 'TEAM_LEADER') {
                // Team Leader must have a MANAGER as manager
                if (!managerId) {
                    return NextResponse.json(
                        { error: 'TEAM_LEADER must be assigned to a MANAGER (managerId required)' },
                        { status: 400 }
                    )
                }
                // Verify the manager is a MANAGER
                const manager = await prisma.user.findUnique({
                    where: { id: managerId },
                    select: { role: true }
                })
                if (!manager || manager.role !== 'MANAGER') {
                    return NextResponse.json(
                        { error: 'TEAM_LEADER must be managed by a MANAGER' },
                        { status: 400 }
                    )
                }
            } else if (role === 'EMPLOYEE') {
                // Employee must have a TEAM_LEADER as manager
                if (!managerId) {
                    return NextResponse.json(
                        { error: 'EMPLOYEE must be assigned to a TEAM_LEADER (managerId required)' },
                        { status: 400 }
                    )
                }
                // Verify the manager is a TEAM_LEADER
                const manager = await prisma.user.findUnique({
                    where: { id: managerId },
                    select: { role: true }
                })
                if (!manager || manager.role !== 'TEAM_LEADER') {
                    return NextResponse.json(
                        { error: 'EMPLOYEE must be managed by a TEAM_LEADER' },
                        { status: 400 }
                    )
                }
            }
        } else if (session.role === 'HR') {
            // HR can register BA, MANAGER, TEAM_LEADER, EMPLOYEE
            if (!['BA', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE'].includes(role)) {
                return NextResponse.json(
                    { error: 'HR can only register BA, MANAGER, TEAM_LEADER, or EMPLOYEE' },
                    { status: 403 }
                )
            }

            if (role === 'TEAM_LEADER') {
                // Team Leader must have a MANAGER as manager
                if (!managerId) {
                    return NextResponse.json(
                        { error: 'TEAM_LEADER must be assigned to a MANAGER (managerId required)' },
                        { status: 400 }
                    )
                }
                // Verify the manager is a MANAGER
                const manager = await prisma.user.findUnique({
                    where: { id: managerId },
                    select: { role: true }
                })
                if (!manager || manager.role !== 'MANAGER') {
                    return NextResponse.json(
                        { error: 'TEAM_LEADER must be managed by a MANAGER' },
                        { status: 400 }
                    )
                }
            } else if (role === 'EMPLOYEE') {
                // Employee must have a TEAM_LEADER as manager
                if (!managerId) {
                    return NextResponse.json(
                        { error: 'EMPLOYEE must be assigned to a TEAM_LEADER (managerId required)' },
                        { status: 400 }
                    )
                }
                // Verify the manager is a TEAM_LEADER
                const manager = await prisma.user.findUnique({
                    where: { id: managerId },
                    select: { role: true }
                })
                if (!manager || manager.role !== 'TEAM_LEADER') {
                    return NextResponse.json(
                        { error: 'EMPLOYEE must be managed by a TEAM_LEADER' },
                        { status: 400 }
                    )
                }
            } else {
                // BA, MANAGER are managed by HR
                // Verify HR user exists (could be a stale session after DB clear)
                const hrUser = await prisma.user.findUnique({
                    where: { id: session.userId },
                    select: { id: true }
                })
                if (!hrUser) {
                    return NextResponse.json(
                        { error: 'Your session is invalid. Please log out and log in again.' },
                        { status: 401 }
                    )
                }
                finalManagerId = session.userId
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12)

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
                managerId: finalManagerId,
                ...userData,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                department: true,
                managerId: true,
                createdAt: true,
                manager: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    }
                }
            },
        })

        return NextResponse.json({ user }, { status: 201 })
    } catch (error) {
        console.error('Create user error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
