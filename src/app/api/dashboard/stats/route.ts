import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get stats based on role
        if (session.role === 'EMPLOYEE') {
            // Employee-specific stats
            const [
                myProjects,
                myCompletedProjects,
                myReportsThisMonth,
                myAttendanceThisMonth,
            ] = await Promise.all([
                prisma.project.count({
                    where: { assignedToId: session.userId },
                }),
                prisma.project.count({
                    where: { assignedToId: session.userId, status: 'COMPLETED' },
                }),
                prisma.dailyReport.count({
                    where: {
                        userId: session.userId,
                        date: {
                            gte: new Date(today.getFullYear(), today.getMonth(), 1),
                        },
                    },
                }),
                prisma.attendance.count({
                    where: {
                        userId: session.userId,
                        status: 'PRESENT',
                        date: {
                            gte: new Date(today.getFullYear(), today.getMonth(), 1),
                        },
                    },
                }),
            ])

            return NextResponse.json({
                stats: {
                    myProjects,
                    myCompletedProjects,
                    myReportsThisMonth,
                    myAttendanceThisMonth,
                },
            })
        }

        // Admin/HR/PA stats
        const [
            totalEmployees,
            activeEmployees,
            totalProjects,
            activeProjects,
            completedProjects,
            pendingProjects,
            todayAttendance,
            totalReportsToday,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { status: 'ACTIVE' } }),
            prisma.project.count(),
            prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
            prisma.project.count({ where: { status: 'COMPLETED' } }),
            prisma.project.count({ where: { status: 'PENDING' } }),
            prisma.attendance.count({
                where: {
                    date: today,
                    status: 'PRESENT',
                },
            }),
            prisma.dailyReport.count({
                where: {
                    date: {
                        gte: today,
                    },
                },
            }),
        ])

        // Recent projects
        const recentProjects = await prisma.project.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                assignedTo: {
                    select: { id: true, name: true },
                },
            },
        })

        // Recent reports
        const recentReports = await prisma.dailyReport.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { id: true, name: true },
                },
                project: {
                    select: { id: true, title: true },
                },
            },
        })

        return NextResponse.json({
            stats: {
                totalEmployees,
                activeEmployees,
                totalProjects,
                activeProjects,
                completedProjects,
                pendingProjects,
                todayAttendance,
                totalReportsToday,
            },
            recentProjects,
            recentReports,
        })
    } catch (error) {
        console.error('Dashboard stats error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
