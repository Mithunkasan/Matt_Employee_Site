'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { Header } from '@/components/layout/header'
import { StatsCard } from '@/components/shared/stats-card'
import { ProjectCard } from '@/components/shared/project-card'
import { PageLoader } from '@/components/shared/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Users,
    FolderKanban,
    CheckCircle2,
    Clock,
    CalendarCheck,
    FileText,
    TrendingUp,
    Activity,
} from 'lucide-react'
import { formatDate, getRoleColor } from '@/lib/utils'
import Link from 'next/link'
import { EmployeeWorkingHoursCard } from '@/components/shared/employee-working-hours'
import { LeaveRequestButton } from '@/components/shared/leave-request-button'

interface DashboardStats {
    totalEmployees?: number
    activeEmployees?: number
    totalProjects?: number
    activeProjects?: number
    completedProjects?: number
    pendingProjects?: number
    todayAttendance?: number
    totalReportsToday?: number
    // Employee specific
    myProjects?: number
    myCompletedProjects?: number
    myReportsThisMonth?: number
    myAttendanceThisMonth?: number
}

interface RecentProject {
    id: string
    title: string
    status: string
    priority: string
    assignedTo?: { id: string; name: string } | null
}

interface RecentReport {
    id: string
    date: string
    reportText: string
    user: { id: string; name: string }
    project: { id: string; title: string }
}

export default function DashboardPage() {
    const { user } = useAuth()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
    const [recentReports, setRecentReports] = useState<RecentReport[]>([])
    const [approvedLeavesCount, setApprovedLeavesCount] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await fetch('/api/dashboard/stats')
                if (res.ok) {
                    const data = await res.json()
                    setStats(data.stats)
                    setRecentProjects(data.recentProjects || [])
                    setRecentReports(data.recentReports || [])
                }

                // Fetch approved leaves count for leave request feature
                const leavesRes = await fetch('/api/leaves?status=APPROVED')
                if (leavesRes.ok) {
                    const leavesData = await leavesRes.json()
                    setApprovedLeavesCount(leavesData.leaves?.length || 0)
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen">
                <Header title="Dashboard" description="Welcome back!" />
                <PageLoader />
            </div>
        )
    }

    const isEmployee = user?.role === 'EMPLOYEE'

    return (
        <div className="min-h-screen">
            <div className="flex items-center justify-between px-6 pt-6">
                <Header
                    title={`Welcome, ${user?.name?.split(' ')[0] || 'User'}!`}
                    description={`Here's your ${isEmployee ? 'work' : 'team'} overview for today`}
                />
                {/* Leave Request Button - Show for all except Admin */}
                {user?.role !== 'ADMIN' && (
                    <div className="ml-4">
                        <LeaveRequestButton approvedLeavesCount={approvedLeavesCount} />
                    </div>
                )}
            </div>

            <div className="p-6 space-y-6">
                {/* Stats Grid */}
                {isEmployee ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatsCard
                            title="My Projects"
                            value={stats?.myProjects || 0}
                            icon={FolderKanban}
                            variant="gradient"
                            gradientFrom="from-violet-500"
                            gradientTo="to-purple-600"
                        />
                        <StatsCard
                            title="Completed"
                            value={stats?.myCompletedProjects || 0}
                            icon={CheckCircle2}
                            variant="gradient"
                            gradientFrom="from-emerald-500"
                            gradientTo="to-teal-600"
                        />
                        <StatsCard
                            title="Reports This Month"
                            value={stats?.myReportsThisMonth || 0}
                            icon={FileText}
                            variant="gradient"
                            gradientFrom="from-amber-500"
                            gradientTo="to-orange-600"
                        />
                        <StatsCard
                            title="Days Present"
                            value={stats?.myAttendanceThisMonth || 0}
                            icon={CalendarCheck}
                            variant="gradient"
                            gradientFrom="from-cyan-500"
                            gradientTo="to-blue-600"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatsCard
                            title="Total Employees"
                            value={stats?.totalEmployees || 0}
                            icon={Users}
                            variant="gradient"
                            gradientFrom="from-violet-500"
                            gradientTo="to-purple-600"
                            description={`${stats?.activeEmployees || 0} active`}
                        />
                        <StatsCard
                            title="Active Projects"
                            value={stats?.activeProjects || 0}
                            icon={Activity}
                            variant="gradient"
                            gradientFrom="from-emerald-500"
                            gradientTo="to-teal-600"
                            description={`${stats?.totalProjects || 0} total`}
                        />
                        <StatsCard
                            title="Completed Projects"
                            value={stats?.completedProjects || 0}
                            icon={CheckCircle2}
                            variant="gradient"
                            gradientFrom="from-amber-500"
                            gradientTo="to-orange-600"
                        />
                        <StatsCard
                            title="Today's Attendance"
                            value={stats?.todayAttendance || 0}
                            icon={CalendarCheck}
                            variant="gradient"
                            gradientFrom="from-cyan-500"
                            gradientTo="to-blue-600"
                            description={`${stats?.totalReportsToday || 0} reports`}
                        />
                    </div>
                )}

                {/* Employee Activity Monitor - Admin Only */}
                {user?.role === 'ADMIN' && (
                    <Link href="/employee-activity">
                        <Card className="p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 border-0 hover:shadow-xl transition-all cursor-pointer group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Activity className="h-7 w-7 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">
                                            Employee Activity Monitor
                                        </h3>
                                        <p className="text-blue-100 text-sm">
                                            Real-time view of employee online/offline status, login/logout times, and work hours
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-white">
                                    <span className="text-sm font-medium">View Details</span>
                                    <svg className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Card>
                    </Link>
                )}

                {/* Employee Working Hours - Admin Only */}
                {user?.role === 'ADMIN' && (
                    <div className="mb-6">
                        <EmployeeWorkingHoursCard />
                    </div>
                )}

                {/* Content sections */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Projects */}
                    <Card className="lg:col-span-2 p-6 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    Recent Projects
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Latest project activity
                                </p>
                            </div>
                            <Link
                                href="/projects"
                                className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
                            >
                                View all
                            </Link>
                        </div>

                        {recentProjects.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No projects yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentProjects.map((project) => (
                                    <Link
                                        key={project.id}
                                        href={`/projects/${project.id}`}
                                        className="block p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-violet-300 dark:hover:border-violet-500/30 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
                                                    <FolderKanban className="h-5 w-5 text-violet-500" />
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-slate-900 dark:text-white">
                                                        {project.title}
                                                    </h3>
                                                    {project.assignedTo && (
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                                            {project.assignedTo.name}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    project.status === 'COMPLETED'
                                                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                        : project.status === 'IN_PROGRESS'
                                                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                            : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                }
                                            >
                                                {project.status.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Recent Activity / Reports */}
                    <Card className="p-6 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    Recent Activity
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Latest reports
                                </p>
                            </div>
                            <Link
                                href="/reports"
                                className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
                            >
                                View all
                            </Link>
                        </div>

                        <ScrollArea className="h-[400px] pr-4">
                            {recentReports.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No reports yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {recentReports.map((report) => (
                                        <div
                                            key={report.id}
                                            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-medium text-sm text-slate-900 dark:text-white">
                                                    {report.user.name}
                                                </span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    • {formatDate(report.date)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                                                {report.reportText}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                                Project: {report.project.title}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </Card>
                </div>

                {/* Quick Actions for Employees */}
                {isEmployee && (
                    <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50">
                        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Link
                                href="/attendance"
                                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                    <CalendarCheck className="h-5 w-5 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-white">Mark Attendance</p>
                                    <p className="text-xs text-slate-400">Log your attendance</p>
                                </div>
                            </Link>
                            <Link
                                href="/reports"
                                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-amber-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-white">Submit Report</p>
                                    <p className="text-xs text-slate-400">Daily work report</p>
                                </div>
                            </Link>
                            <Link
                                href="/projects"
                                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                                    <FolderKanban className="h-5 w-5 text-violet-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-white">My Projects</p>
                                    <p className="text-xs text-slate-400">View assigned projects</p>
                                </div>
                            </Link>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    )
}
