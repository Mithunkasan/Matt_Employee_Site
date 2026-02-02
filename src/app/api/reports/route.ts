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

        const where: Record<string, unknown> = {}

        // Employees can only see their own reports
        if (session.role === 'EMPLOYEE') {
            where.userId = session.userId
        } else if (userId) {
            where.userId = userId
        }

        if (projectId) where.projectId = projectId

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
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { projectId, reportText, hoursWorked, date } = validation.data
        const reportDate = date ? new Date(date) : new Date()
        reportDate.setHours(0, 0, 0, 0)

        // Verify the user is assigned to this project (or is Admin/PA)
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        if (session.role === 'EMPLOYEE' && project.assignedToId !== session.userId) {
            return NextResponse.json(
                { error: 'You are not assigned to this project' },
                { status: 403 }
            )
        }

        // Check for existing report
        const existingReport = await prisma.dailyReport.findFirst({
            where: {
                userId: session.userId,
                projectId,
                date: reportDate,
            },
        })

        if (existingReport) {
            // Update existing report
            const report = await prisma.dailyReport.update({
                where: { id: existingReport.id },
                data: {
                    reportText,
                    hoursWorked,
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
                },
            })
            return NextResponse.json({ report, message: 'Report updated' })
        }

        // Create new report
        const report = await prisma.dailyReport.create({
            data: {
                userId: session.userId,
                projectId,
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
