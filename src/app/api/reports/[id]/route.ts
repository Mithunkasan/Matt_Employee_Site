import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession, canViewAllReports } from '@/lib/auth'
import { updateReportSchema } from '@/lib/validations'

interface Params {
    params: Promise<{ id: string }>
}

// GET single report
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const report = await prisma.dailyReport.findUnique({
            where: { id },
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
        })

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 })
        }

        // Employees can only view their own reports
        if (session.role === 'EMPLOYEE' && report.userId !== session.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        return NextResponse.json({ report })
    } catch (error) {
        console.error('Get report error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PATCH update report
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const existingReport = await prisma.dailyReport.findUnique({
            where: { id },
        })

        if (!existingReport) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 })
        }

        // Only report owner can update (or Admin)
        if (session.role !== 'ADMIN' && existingReport.userId !== session.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const validation = updateReportSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const report = await prisma.dailyReport.update({
            where: { id },
            data: validation.data,
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

        return NextResponse.json({ report })
    } catch (error) {
        console.error('Update report error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE report
export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const existingReport = await prisma.dailyReport.findUnique({
            where: { id },
        })

        if (!existingReport) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 })
        }

        // Only report owner or Admin can delete
        if (session.role !== 'ADMIN' && existingReport.userId !== session.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        await prisma.dailyReport.delete({
            where: { id },
        })

        return NextResponse.json({ message: 'Report deleted successfully' })
    } catch (error) {
        console.error('Delete report error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
