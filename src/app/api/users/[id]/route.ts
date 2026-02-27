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
                designation: true,
                phone: true,
                managerId: true,
                createdAt: true,
                manager: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        designation: true,
                    }
                },
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
            // HR can only assign certain roles (cannot assign ADMIN)
            if (session.role === 'HR' && updateData.role === 'ADMIN') {
                return NextResponse.json(
                    { error: 'HR cannot assign the Admin role' },
                    { status: 403 }
                )
            }

            // Non-admin, non-HR users cannot change roles at all
            if (session.role !== 'ADMIN' && session.role !== 'HR') {
                delete updateData.role
            }
        }

        // Only Admin/HR can change status and organizational details
        if (!canManageEmployees(session.role)) {
            delete updateData.status
            delete updateData.department
            delete updateData.designation
            delete updateData.managerId
        }

        // Normalize managerId
        if (updateData.managerId === "Administrative" || updateData.managerId === "no-manager" || updateData.managerId === "") {
            (updateData as any).managerId = null
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
                designation: true,
                phone: true,
                managerId: true,
                createdAt: true,
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

        await prisma.$transaction(async (tx) => {
            // Remove user-owned request records
            await tx.leaveRequest.deleteMany({ where: { userId: id } })
            await tx.workFromHomeRequest.deleteMany({ where: { userId: id } })

            // Remove user's reply ownership on reports (keep report data)
            await tx.dailyReport.updateMany({
                where: { repliedById: id },
                data: { repliedById: null, repliedAt: null },
            })

            // Keep shared entities intact for other users
            await tx.project.updateMany({
                where: { assignedToId: id },
                data: { assignedToId: null },
            })
            await tx.task.updateMany({
                where: { assignedToId: id },
                data: { assignedToId: null },
            })
            await tx.user.updateMany({
                where: { managerId: id },
                data: { managerId: null },
            })

            // Preserve projects for others by transferring creator ownership to the deleting admin
            await tx.project.updateMany({
                where: { createdById: id },
                data: { createdById: session.userId },
            })

            // Finally delete the user (remaining personal linked data with cascade is removed)
            await tx.user.delete({
                where: { id },
            })
        })

        return NextResponse.json({ message: 'User and related personal data deleted successfully.' })
    } catch (error) {
        console.error('Delete user error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
