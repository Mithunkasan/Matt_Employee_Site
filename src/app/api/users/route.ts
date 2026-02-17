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
                }
            },
            orderBy: { name: 'asc' },
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
            // Allow Managers/TLs to register if logic permits? 
            // Existing logic says: "Only ADMIN and HR can register users". 
            // But wait, the UI description says: "user?.role === 'MANAGER' ? 'Register a new Team Leader' ..."
            // The previous logic BLOCKED Manager/TL from registering. 
            // The UI logic implies they MIGHT be able to. 
            // But the User Request mainly focuses on HR/Admin registering hierarchy. 
            // "tree wise like manager, team leader under manager set manually option need"
            // I will stick to ADMIN/HR for now unless I see code allowing Managers. 
            // The code view of `employees/page.tsx` showed `user?.role === 'MANAGER'` checks in the Dialog description.
            // BUT the `canManageEmployees` constant in `page.tsx` was `user?.role === 'ADMIN' || user?.role === 'HR'`.
            // So practically only Admin/HR can open the dialog.
            // I will keep the check strict for now.

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
        const managerId = rawManagerId && rawManagerId !== "" && rawManagerId !== "no-manager" ? rawManagerId : undefined

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

        // Determine manager
        let finalManagerId = undefined

        if (managerId && managerId !== "Administrative") {
            // Manual assignment - Trust the user but verify existence
            const manager = await prisma.user.findUnique({
                where: { id: managerId },
                select: { id: true }
            })
            if (!manager) {
                return NextResponse.json(
                    { error: 'Selected manager not found' },
                    { status: 400 }
                )
            }
            finalManagerId = managerId
        } else if (managerId === "Administrative") {
            finalManagerId = undefined
        } else {
            // Auto assignment logic (fallback)
            if (session.role === 'HR') {
                if (role === 'BA' || role === 'MANAGER') {
                    finalManagerId = session.userId // Managed by HR
                }
                // TL and Employee usually require a Manager/TL. If not provided manually, we error or assign to HR?
                // Strict logic says they need specific managers. 
                // But the UI now forces manual selection for them mostly.
                // If fell through here without managerId:
                if (role === 'TEAM_LEADER' || role === 'EMPLOYEE') {
                    // We could assign to HR temporarily if allowed, or error.
                    // Let's error strictly if not provided, urging manual selection.
                    return NextResponse.json(
                        { error: `${role} requires a Reporting Manager to be selected` },
                        { status: 400 }
                    )
                }
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
                designation: true,
                managerId: true,
                createdAt: true,
                manager: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        designation: true,
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
