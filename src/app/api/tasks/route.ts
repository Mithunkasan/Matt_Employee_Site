import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createTaskSchema } from '@/lib/validations'

// GET all tasks (filtered by project or user)
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get('projectId')
        const assignedToId = searchParams.get('assignedToId')
        const status = searchParams.get('status')

        const where: any = {}
        if (projectId) where.projectId = projectId

        // Employees and other roles see their assigned tasks
        if (['EMPLOYEE', 'BA', 'MANAGER', 'TEAM_LEADER'].includes(session.role)) {
            where.assignedToId = session.userId
        } else if (assignedToId) {
            where.assignedToId = assignedToId
        }

        if (status) where.status = status

        const tasks = await prisma.task.findMany({
            where,
            include: {
                project: {
                    select: { id: true, title: true }
                },
                assignedTo: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ tasks })
    } catch (error) {
        console.error('Get tasks error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST create new task (Admin/PA only)
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const canCreateTasks = ['ADMIN', 'PA', 'BA', 'MANAGER', 'TEAM_LEADER'].includes(session.role)
        if (!canCreateTasks) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const validation = createTaskSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { title, description, priority, projectId, assignedToId, startDate, endDate } = validation.data

        const task = await prisma.task.create({
            data: {
                title,
                description,
                priority,
                projectId,
                assignedToId: assignedToId || null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
            },
            include: {
                project: { select: { title: true } },
                assignedTo: { select: { name: true } }
            }
        })

        return NextResponse.json({ task }, { status: 201 })
    } catch (error) {
        console.error('Create task error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
