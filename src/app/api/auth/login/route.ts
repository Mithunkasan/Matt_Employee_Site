import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { createSession } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'
import { getClientIpFromHeaders } from '@/lib/request-ip'

function buildSessionLockToken(ip: string, sessionId: string, timestamp: number): string {
    return `ip:${ip}|sid:${sessionId}|ts:${timestamp}`
}

function parseSessionLockToken(token?: string | null): { ip: string; sid: string; ts: number } | null {
    if (!token) return null

    const match = token.match(/^ip:(.+)\|sid:([^|]+)\|ts:(\d+)$/)
    if (!match) return null

    return {
        ip: match[1],
        sid: match[2],
        ts: Number(match[3]),
    }
}

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
        const clientIp = getClientIpFromHeaders(request.headers)
        const activeWindowStartMs = Date.now() - 24 * 60 * 60 * 1000

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

        // One active login per IP across devices/browsers
        if (clientIp !== 'unknown') {
            const existingIpSession = await prisma.user.findFirst({
                where: {
                    activeSessionId: {
                        startsWith: `ip:${clientIp}|`,
                    },
                },
                select: { id: true, email: true },
            })

            if (existingIpSession && existingIpSession.id !== user.id) {
                return NextResponse.json(
                    { error: 'This device/IP already has an active login. Please logout first.' },
                    { status: 409 }
                )
            }
        }

        // Block second login for the same user while an active session exists
        if (
            user.activeSessionId &&
            (() => {
                const parsed = parseSessionLockToken(user.activeSessionId)
                return parsed ? parsed.ts >= activeWindowStartMs : true
            })()
        ) {
            return NextResponse.json(
                { error: 'You are already logged in on another tab/device. Please logout first.' },
                { status: 409 }
            )
        }

        // Create session ID for single session enforcement
        const sessionId = Math.random().toString(36).substring(2, 15)
        const lockToken = buildSessionLockToken(clientIp, sessionId, Date.now())

        // Update user's active session state in database
        await prisma.user.update({
            where: { id: user.id },
            data: {
                activeSessionId: lockToken,
            },
        })

        // Create session
        await createSession({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            sessionId: lockToken,
            ipAddress: clientIp,
        })

        // Record attendance
        const now = new Date()
        // Get current day in IST
        const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
        const todayStr = istDate.toISOString().split('T')[0]
        const today = new Date(`${todayStr}T00:00:00Z`)

        // Check if it's currently overtime (after 5:30 PM IST)
        const thresholdIST = new Date(istDate)
        thresholdIST.setUTCHours(17, 30, 0, 0)
        const isOvertime = istDate.getTime() > thresholdIST.getTime()

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
