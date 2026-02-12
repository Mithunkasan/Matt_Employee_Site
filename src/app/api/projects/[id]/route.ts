import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession, canUpdateProjects } from '@/lib/auth'
import { updateProjectSchema } from '@/lib/validations'

interface Params {
    params: Promise<{ id: string }>
}

// GET single project
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                dailyReports: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: { date: 'desc' },
                    take: 10,
                },
            },
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Employees can only view their own projects
        if (session.role === 'EMPLOYEE' && project.assignedToId !== session.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        return NextResponse.json({ project })
    } catch (error) {
        console.error('Get project error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PATCH update project
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        // Check if project exists
        const existingProject = await prisma.project.findUnique({
            where: { id },
        })

        if (!existingProject) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Employees can only update githubLink and fileUrl
        const body = await request.json()

        if (session.role === 'EMPLOYEE') {
            if (existingProject.assignedToId !== session.userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            // Employee can only update submission fields
            const { githubLink, fileUrl } = body
            const project = await prisma.project.update({
                where: { id },
                data: {
                    githubLink: githubLink !== undefined ? githubLink : existingProject.githubLink,
                    fileUrl: fileUrl !== undefined ? fileUrl : existingProject.fileUrl,
                },
            })
            return NextResponse.json({ project })
        }

        // Admin, BA, PA, Manager, and Team Leader can update projects
        if (!canUpdateProjects(session.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const validation = updateProjectSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { startDate, endDate, githubLink, ...updateData } = validation.data

        // Restrict Managers and Team Leaders from changing title/description
        if (session.role === 'MANAGER' || session.role === 'TEAM_LEADER') {
            // Verify management hierarchy: project must be assigned to them or their subordinates
            const projectToUpdate = await prisma.project.findUnique({
                where: { id },
                include: {
                    assignedTo: {
                        include: {
                            manager: true
                        }
                    }
                }
            })

            const isAssignedToThem = projectToUpdate?.assignedToId === session.userId
            const isDirectSubordinate = projectToUpdate?.assignedTo?.managerId === session.userId
            const isIndirectSubordinate = projectToUpdate?.assignedTo?.manager?.managerId === session.userId

            if (!isAssignedToThem && !isDirectSubordinate && !isIndirectSubordinate) {
                return NextResponse.json({ error: 'You can only update projects in your management line' }, { status: 403 })
            }

            // Remove title and description from update for Managers and Team Leaders
            delete (updateData as any).title
            delete (updateData as any).description
        }

        const project = await prisma.project.update({
            where: { id },
            data: {
                ...updateData,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                githubLink: githubLink !== undefined ? (githubLink || null) : undefined,
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

        return NextResponse.json({ project })
    } catch (error) {
        console.error('Update project error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE project
export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only Admin can delete projects
        if (session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { id } = await params

        await prisma.project.delete({
            where: { id },
        })

        return NextResponse.json({ message: 'Project deleted successfully' })
    } catch (error) {
        console.error('Delete project error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
