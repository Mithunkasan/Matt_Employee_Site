import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { getSession, canManageEmployees } from '@/lib/auth'
import { updateUserSchema } from '@/lib/validations'

interface Params {
    params: Promise<{ id: string }>
}

// GET single user
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                department: true,
                phone: true,
                createdAt: true,
                _count: {
                    select: {
                        assignedProjects: true,
                        dailyReports: true,
                    },
                },
            },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({ user })
    } catch (error) {
        console.error('Get user error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PATCH update user
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        // Check if this is the protected admin account
        const targetUser = await prisma.user.findUnique({
            where: { id },
            select: { email: true, id: true }
        })

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // PROTECTED ADMIN ACCOUNT - Only the admin themselves can modify
        const PROTECTED_ADMIN_EMAIL = 'admin@mattengg.com'
        if (targetUser.email === PROTECTED_ADMIN_EMAIL && session.userId !== id) {
            return NextResponse.json(
                { error: 'This admin account is protected and can only be modified by the admin themselves' },
                { status: 403 }
            )
        }

        // Users can update their own profile, Admin/HR can update others
        if (session.userId !== id && !canManageEmployees(session.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const validation = updateUserSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const updateData = { ...validation.data }

        // Role change restrictions
        if (updateData.role) {
            // HR can only assign certain roles
            if (session.role === 'HR' && !['EMPLOYEE', 'PA', 'BA', 'MANAGER', 'TEAM_LEADER'].includes(updateData.role)) {
                return NextResponse.json(
                    { error: 'HR cannot assign Admin or HR roles' },
                    { status: 403 }
                )
            }
            // Non-admin, non-HR users cannot change roles at all
            if (session.role !== 'ADMIN' && session.role !== 'HR') {
                delete updateData.role
            }
        }

        // Only Admin/HR can change status
        if (updateData.status && !canManageEmployees(session.role)) {
            delete updateData.status
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                department: true,
                phone: true,
            },
        })

        return NextResponse.json({ user })
    } catch (error) {
        console.error('Update user error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE user
export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only Admin can delete users
        if (session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { id } = await params

        // Prevent self-deletion
        if (session.userId === id) {
            return NextResponse.json(
                { error: 'Cannot delete your own account' },
                { status: 400 }
            )
        }

        // Check if this is the protected admin account
        const targetUser = await prisma.user.findUnique({
            where: { id },
            select: { email: true }
        })

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // PROTECTED ADMIN ACCOUNT - Cannot be deleted
        const PROTECTED_ADMIN_EMAIL = 'admin@mattengg.com'
        if (targetUser.email === PROTECTED_ADMIN_EMAIL) {
            return NextResponse.json(
                { error: 'The main admin account (admin@mattengg.com) cannot be deleted for security reasons' },
                { status: 403 }
            )
        }

        await prisma.user.delete({
            where: { id },
        })

        return NextResponse.json({ message: 'User deleted successfully' })
    } catch (error) {
        console.error('Delete user error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
