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

        const where: Record<string, any> = {}
        const reportWhere: Record<string, any> = {}

        if (['EMPLOYEE', 'INTERN'].includes(session.role)) {
            where.assignedToId = session.userId
            reportWhere.userId = session.userId
        } else if (['BA', 'MANAGER', 'TEAM_LEADER', 'TEAM_COORDINATOR', 'PA'].includes(session.role)) {
            where.OR = [
                { assignedToId: session.userId },
                { createdById: session.userId },
                { assignedTo: { managerId: session.userId } },
                { assignedTo: { manager: { managerId: session.userId } } }
            ]
            reportWhere.OR = [
                { userId: session.userId },
                { user: { managerId: session.userId } },
                { user: { manager: { managerId: session.userId } } }
            ]
        }

        // Recent projects
        const recentProjects = await prisma.project.findMany({
            where,
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
            where: reportWhere,
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

        // Get stats based on role
        if (!['ADMIN', 'HR'].includes(session.role)) {
            // Individual stats
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
                recentProjects,
                recentReports,
            })
        }

        // Admin/HR stats (Global)
        const [
            totalEmployees,
            activeEmployees,
            totalProjects,
            activeProjects,
            completedProjects,
            pendingProjects,
            todayAttendance,
            totalReportsToday,
            pendingWfhRequests,
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
            prisma.workFromHomeRequest.count({
                where: { status: 'PENDING' },
            }),
        ])

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
                pendingWfhRequests,
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
