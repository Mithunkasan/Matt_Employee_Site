import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession, canCreateProjects } from '@/lib/auth'
import { createProjectSchema } from '@/lib/validations'

// GET all projects
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const assignedToId = searchParams.get('assignedToId')
        const search = searchParams.get('search')

        const where: Record<string, unknown> = {}

        // Employees and Interns see only assigned projects
        if (session.role === 'EMPLOYEE' || session.role === 'INTERN') {
            where.assignedToId = session.userId
        }
        // BAs, Managers, Team Leaders, Team Coordinators and PAs see projects assigned to them, created by them,
        // or assigned to their subordinates
        else if (['BA', 'MANAGER', 'TEAM_LEADER', 'TEAM_COORDINATOR', 'PA'].includes(session.role)) {
            where.OR = [
                { assignedToId: session.userId },
                { createdById: session.userId },
                // Projects assigned to direct subordinates
                { assignedTo: { managerId: session.userId } },
                // Projects assigned to subordinates of subordinates
                { assignedTo: { manager: { managerId: session.userId } } }
            ]
        }
        else if (assignedToId) {
            where.assignedToId = assignedToId
        }

        if (status) where.status = status
        if (search) {
            where.title = { contains: search, mode: 'insensitive' }
        }

        const projects = await prisma.project.findMany({
            where,
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        dailyReports: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ projects })
    } catch (error) {
        console.error('Get projects error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST create new project
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only Admin, BA and PA can create projects
        if (!canCreateProjects(session.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const validation = createProjectSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { startDate, endDate, githubLink, ...projectData } = validation.data

        const project = await prisma.project.create({
            data: {
                ...projectData,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                githubLink: githubLink || null,
                createdById: session.userId,
            },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })

        return NextResponse.json({ project }, { status: 201 })
    } catch (error) {
        console.error('Create project error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
