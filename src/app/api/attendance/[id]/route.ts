import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession, canViewAllAttendance } from '@/lib/auth'
import { updateAttendanceSchema } from '@/lib/validations'

interface Params {
    params: Promise<{ id: string }>
}

// GET single attendance
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const attendance = await prisma.attendance.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true,
                    },
                },
                sessions: {
                    orderBy: {
                        checkIn: 'asc',
                    },
                },
            },
        })

        if (!attendance) {
            return NextResponse.json({ error: 'Attendance not found' }, { status: 404 })
        }

        // Employees can only view their own attendance
        if (session.role === 'EMPLOYEE' && attendance.userId !== session.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        return NextResponse.json({ attendance })
    } catch (error) {
        console.error('Get attendance error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PATCH update attendance (checkout or HR update)
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const existingAttendance = await prisma.attendance.findUnique({
            where: { id },
        })

        if (!existingAttendance) {
            return NextResponse.json({ error: 'Attendance not found' }, { status: 404 })
        }

        const body = await request.json()

        // Employees can only checkout their own attendance
        if (session.role === 'EMPLOYEE') {
            if (existingAttendance.userId !== session.userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            return NextResponse.json(
                { error: 'Please use /api/attendance/checkout endpoint' },
                { status: 400 }
            )
        }

        // Admin/HR can update any field
        if (!canViewAllAttendance(session.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const validation = updateAttendanceSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { status, notes } = validation.data

        const attendance = await prisma.attendance.update({
            where: { id },
            data: {
                status: status ?? existingAttendance.status,
                notes: notes ?? existingAttendance.notes,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })

        return NextResponse.json({ attendance })
    } catch (error) {
        console.error('Update attendance error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE attendance (Admin only)
export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { id } = await params

        await prisma.attendance.delete({
            where: { id },
        })

        return NextResponse.json({ message: 'Attendance deleted successfully' })
    } catch (error) {
        console.error('Delete attendance error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
