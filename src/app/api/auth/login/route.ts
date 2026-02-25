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

        // Create session ID for single session enforcement
        const sessionId = Math.random().toString(36).substring(2, 15)

        // Update user's active session ID in database
        await prisma.user.update({
            where: { id: user.id },
            data: { activeSessionId: sessionId },
        })

        // Create session
        await createSession({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            sessionId: sessionId,
        })

        // Record attendance
        const now = new Date()
        const today = new Date(now)
        today.setHours(0, 0, 0, 0)

        // Check for overtime (after 5:30 PM local time)
        // Note: The user's current time is 2026-02-25T12:49:23+05:30
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        const isOvertime = (currentHour > 17) || (currentHour === 17 && currentMinute > 30)

        try {
            // Create or get attendance record for today
            const attendance = await prisma.attendance.upsert({
                where: {
                    userId_date: {
                        userId: user.id,
                        date: today,
                    },
                },
                update: {
                    // If it was already marked as overtime, keep it
                    isOvertime: isOvertime ? true : undefined
                },
                create: {
                    userId: user.id,
                    date: today,
                    status: 'PRESENT',
                    isOvertime: isOvertime,
                },
            })

            // Create a new attendance session for this login
            await prisma.attendanceSession.create({
                data: {
                    attendanceId: attendance.id,
                    checkIn: now,
                    isOvertime: isOvertime,
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
                isOvertimeLogin: isOvertime,
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
