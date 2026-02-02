import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { createSession } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate input
        const validation = loginSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { email, password } = validation.data

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            )
        }

        // Check if user is active
        if (user.status === 'INACTIVE') {
            return NextResponse.json(
                { error: 'Your account has been deactivated. Please contact HR.' },
                { status: 403 }
            )
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            )
        }

        // Create session
        await createSession({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        })

        // Record attendance
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        try {
            // Create or get attendance record for today
            const attendance = await prisma.attendance.upsert({
                where: {
                    userId_date: {
                        userId: user.id,
                        date: today,
                    },
                },
                update: {}, // Don't update if already exists
                create: {
                    userId: user.id,
                    date: today,
                    status: 'PRESENT',
                },
            })

            // Create a new attendance session for this login
            await prisma.attendanceSession.create({
                data: {
                    attendanceId: attendance.id,
                    checkIn: new Date(),
                },
            })
        } catch (error) {
            console.error('Failed to record attendance:', error)
            // Don't block login if attendance fails
        }

        return NextResponse.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
