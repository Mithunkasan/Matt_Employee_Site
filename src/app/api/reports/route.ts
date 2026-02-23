import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession, canViewAllReports } from '@/lib/auth'
import { createReportSchema } from '@/lib/validations'

// GET daily reports
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')
        const projectId = searchParams.get('projectId')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        const filter = searchParams.get('filter')

        const where: Record<string, any> = {}

        if (filter === 'received') {
            // Reports submitted to the current user (where current user is the manager)
            where.user = {
                managerId: session.userId
            }
        } else if (['EMPLOYEE', 'INTERN', 'TEAM_COORDINATOR', 'PA'].includes(session.role)) {
            where.userId = session.userId
        } else if (userId) {
            where.userId = userId
        }

        if (projectId) where.projectId = projectId
        if (searchParams.get('taskId')) where.taskId = searchParams.get('taskId')

        // Date filtering
        if (startDate || endDate) {
            where.date = {}
            if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate)
            if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate)
        }

        const reports = await prisma.dailyReport.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    }
                },
                repliedBy: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            },
            orderBy: { date: 'desc' },
        })

        return NextResponse.json({ reports })
    } catch (error) {
        console.error('Get reports error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST create daily report
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const validation = createReportSchema.safeParse(body)

        if (!validation.success) {
            console.log('Report validation failed:', validation.error.format())
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.format() },
                { status: 400 }
            )
        }

        const { projectId, taskId, reportText, hoursWorked, date } = validation.data
        const reportDate = date ? new Date(date) : new Date()

        // Verify the user is assigned to this project or the specific task
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Create new report (removed check for existing report to allow hourly updates)
        const report = await prisma.dailyReport.create({
            data: {
                userId: session.userId,
                projectId,
                taskId: taskId || null,
                reportText,
                hoursWorked,
                date: reportDate,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            },
        })


        return NextResponse.json({ report }, { status: 201 })
    } catch (error) {
        console.error('Create report error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
