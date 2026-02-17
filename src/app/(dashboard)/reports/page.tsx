'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { Header } from '@/components/layout/header'
import { PageLoader } from '@/components/shared/loading-spinner'
import { LoadingButton } from '@/components/shared/loading-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { FileText, Plus, Search, Filter, Clock, Calendar, User, ListChecks, Inbox, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

interface Report {
    id: string
    reportText: string
    hoursWorked?: number | null
    date: string
    user: {
        id: string
        name: string
        email?: string
    }
    project: {
        id: string
        title: string
        status: string
    }
    task?: {
        id: string
        title: string
    } | null
    replyText?: string | null
    repliedBy?: {
        id: string
        name: string
    } | null
    repliedAt?: string | null
}

interface Project {
    id: string
    title: string
}

export default function ReportsPage() {
    const { user } = useAuth()
    const [reports, setReports] = useState<Report[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [projectFilter, setProjectFilter] = useState('all')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [reportMode, setReportMode] = useState<'my' | 'received'>('my')
    const [allUsers, setAllUsers] = useState<any[]>([])

    // Form state
    const [formData, setFormData] = useState({
        projectId: '',
        taskId: '',
        reportText: '',
        hoursWorked: '',
    })

    const [tasks, setTasks] = useState<any[]>([])
    const [fetchingTasks, setFetchingTasks] = useState(false)
    const [replyDialogOpen, setReplyDialogOpen] = useState(false)
    const [replyingTo, setReplyingTo] = useState<Report | null>(null)
    const [replyText, setReplyText] = useState('')
    const [sendingReply, setSendingReply] = useState(false)

    useEffect(() => {
        if (formData.projectId) {
            fetchProjectTasks(formData.projectId)
        } else {
            setTasks([])
        }
    }, [formData.projectId])

    const fetchProjectTasks = async (projId: string) => {
        setFetchingTasks(true)
        try {
            const res = await fetch(`/api/tasks?projectId=${projId}`)
            if (res.ok) {
                const data = await res.json()
                setTasks(data.tasks)
            }
        } catch (error) {
            console.error('Failed to fetch tasks')
        } finally {
            setFetchingTasks(false)
        }
    }

    const canSubmit = ['EMPLOYEE', 'BA', 'INTERN', 'TEAM_COORDINATOR', 'TEAM_LEADER', 'PA', 'MANAGER', 'ADMIN', 'HR'].includes(user?.role || '')

    useEffect(() => {
        fetchReports(reportMode)
    }, [reportMode])

    useEffect(() => {
        if (dialogOpen) {
            fetchMyProjects()
        }
    }, [dialogOpen])

    useEffect(() => {
        if (user?.userId) {
            fetchDirectory()
        }
    }, [user])

    const fetchReports = async (mode: 'my' | 'received' = reportMode) => {
        setLoading(true)
        try {
            const url = mode === 'received' ? '/api/reports?filter=received' : '/api/reports'
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setReports(data.reports)
            }
        } catch (error) {
            toast.error('Failed to load reports')
        } finally {
            setLoading(false)
        }
    }

    const fetchDirectory = async () => {
        try {
            const isHighLevel = ['ADMIN', 'HR', 'BA', 'PA'].includes(user?.role || '')
            const url = isHighLevel ? '/api/users' : `/api/users?managerId=${user?.userId}`
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setAllUsers(data.users)
            }
        } catch (error) {
            console.error('Failed to load user directory')
        }
    }

    const fetchMyProjects = async () => {
        try {
            const res = await fetch('/api/projects')
            if (res.ok) {
                const data = await res.json()
                setProjects(data.projects)
            }
        } catch (error) {
            console.error('Failed to load projects')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    taskId: formData.taskId || undefined,
                    hoursWorked: formData.hoursWorked !== '' ? parseFloat(formData.hoursWorked) : undefined,
                }),
            })
            if (res.ok) {
                toast.success('Report submitted')
                setDialogOpen(false)
                setFormData({ projectId: '', taskId: '', reportText: '', hoursWorked: '' })
                fetchReports(reportMode)
            } else {
                const data = await res.json()
                console.error('Submission failed:', data)
                toast.error(data.error || 'Failed to submit report')
            }
        } catch (error) {
            toast.error('Network error')
        } finally {
            setSaving(false)
        }
    }

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!replyingTo || !replyText) return
        setSendingReply(true)
        try {
            const res = await fetch(`/api/reports/${replyingTo.id}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ replyText }),
            })
            if (res.ok) {
                toast.success('Reply sent')
                setReplyDialogOpen(false)
                setReplyText('')
                setReplyingTo(null)
                fetchReports(reportMode)
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to send reply')
            }
        } catch (error) {
            toast.error('Network error')
        } finally {
            setSendingReply(false)
        }
    }

    const filteredReports = reports.filter((report) => {
        const matchesSearch =
            report.reportText.toLowerCase().includes(search.toLowerCase()) ||
            report.project.title.toLowerCase().includes(search.toLowerCase()) ||
            report.user.name.toLowerCase().includes(search.toLowerCase())
        const matchesProject = projectFilter === 'all' || report.project.id === projectFilter
        return matchesSearch && matchesProject
    })

    const groupedReports = filteredReports.reduce((acc, report) => {
        const date = report.date.split('T')[0]
        if (!acc[date]) acc[date] = []
        acc[date].push(report)
        return acc
    }, {} as Record<string, Report[]>)

    const sortedDates = Object.keys(groupedReports).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
    )

    const uniqueProjects = Array.from(
        new Set(reports.map((r) => JSON.stringify({ id: r.project.id, title: r.project.title })))
    ).map((s) => JSON.parse(s))

    const canReply = ['ADMIN', 'HR', 'BA', 'PA', 'MANAGER', 'TEAM_LEADER', 'TEAM_COORDINATOR', 'EMPLOYEE'].includes(user?.role || '')

    const sidebarGroups = {
        hr: allUsers.filter(u => u.role === 'HR'),
        ba: allUsers.filter(u => u.role === 'BA'),
        pa: allUsers.filter(u => u.role === 'PA'),
        manager: allUsers.filter(u => u.role === 'MANAGER'),
        employees: allUsers.filter(u => !['HR', 'BA', 'PA', 'MANAGER', 'ADMIN'].includes(u.role))
    }

    const UserItem = ({ sub }: { sub: any }) => (
        <Button
            key={sub.id}
            variant="ghost"
            className="w-full justify-start h-12 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 group"
            onClick={() => {
                setReportMode('received')
                setSearch(sub.name)
            }}
        >
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold mr-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors">
                {sub.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 text-left">
                <p className="text-sm font-semibold truncate">{sub.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{sub.role}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1" />
        </Button>
    )

    if (loading && reports.length === 0) {
        return (
            <div className="min-h-screen">
                <Header title="Hourly Reports" description="Track work hours and progress" />
                <PageLoader />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 flex flex-col h-screen">
            <Header
                title="Hourly Work Reports"
                description={reportMode === 'my' ? "My recent task updates" : "Reports submitted by your team"}
            />

            <div className="flex flex-1 overflow-hidden">
                {/* Reports Sidebar */}
                <div className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden lg:flex">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                        <Button
                            className="w-full bg-[#13498a] hover:bg-[#13498a]/90 text-white shadow-lg shadow-blue-500/10 h-11"
                            onClick={() => setDialogOpen(true)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Submit New Report
                        </Button>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-6">
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-2">Navigation</h3>
                                <div className="space-y-1">
                                    <Button
                                        variant={reportMode === 'my' ? 'secondary' : 'ghost'}
                                        className={`w-full justify-start h-11 ${reportMode === 'my' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}
                                        onClick={() => {
                                            setReportMode('my')
                                            setSearch('')
                                        }}
                                    >
                                        <ListChecks className="mr-3 h-5 w-5" />
                                        My Reports
                                    </Button>
                                    <Button
                                        variant={reportMode === 'received' ? 'secondary' : 'ghost'}
                                        className={`w-full justify-start h-11 ${reportMode === 'received' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}
                                        onClick={() => {
                                            setReportMode('received')
                                            setSearch('')
                                        }}
                                    >
                                        <Inbox className="mr-3 h-5 w-5" />
                                        Received / Team
                                    </Button>
                                </div>
                            </div>

                            {sidebarGroups.hr.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 mb-3 px-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        HR Department
                                    </h3>
                                    <div className="space-y-1">
                                        {sidebarGroups.hr.map(sub => <UserItem key={sub.id} sub={sub} />)}
                                    </div>
                                </div>
                            )}

                            {sidebarGroups.ba.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-3 px-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        Business Analysts
                                    </h3>
                                    <div className="space-y-1">
                                        {sidebarGroups.ba.map(sub => <UserItem key={sub.id} sub={sub} />)}
                                    </div>
                                </div>
                            )}

                            {sidebarGroups.pa.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400 mb-3 px-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        Project Assistants
                                    </h3>
                                    <div className="space-y-1">
                                        {sidebarGroups.pa.map(sub => <UserItem key={sub.id} sub={sub} />)}
                                    </div>
                                </div>
                            )}

                            {sidebarGroups.manager.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-3 px-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        Managers
                                    </h3>
                                    <div className="space-y-1">
                                        {sidebarGroups.manager.map(sub => <UserItem key={sub.id} sub={sub} />)}
                                    </div>
                                </div>
                            )}

                            {sidebarGroups.employees.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                        All Employees
                                    </h3>
                                    <div className="space-y-1">
                                        {sidebarGroups.employees.map(sub => <UserItem key={sub.id} sub={sub} />)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
                    <div className="sticky top-0 z-20 p-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                        <div className="flex flex-col sm:flex-row gap-4 max-w-5xl mx-auto w-full">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search reports by text, project or employee..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 h-11 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-blue-500"
                                />
                            </div>
                            <Select value={projectFilter} onValueChange={setProjectFilter}>
                                <SelectTrigger className="w-full sm:w-[240px] h-11 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="All Projects" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Projects</SelectItem>
                                    {uniqueProjects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-6 max-w-5xl mx-auto w-full">
                            {sortedDates.length === 0 ? (
                                <Card className="p-16 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-dashed">
                                    <div className="h-20 w-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FileText className="h-10 w-10 text-slate-300" />
                                    </div>
                                    <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">No reports found</p>
                                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Try adjusting your filters or search terms.</p>
                                </Card>
                            ) : (
                                <div className="space-y-10">
                                    {sortedDates.map((date) => (
                                        <div key={date}>
                                            <div className="flex items-center gap-3 mb-6 sticky top-0 z-10 py-3">
                                                <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30 shadow-sm border border-violet-200/50 dark:border-violet-500/20">
                                                    <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                                </div>
                                                <h2 className="font-bold text-slate-900 dark:text-white text-xl">
                                                    {formatDate(date)}
                                                </h2>
                                                <Badge variant="secondary" className="bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 font-semibold rounded-full">
                                                    {groupedReports[date].length}
                                                </Badge>
                                            </div>

                                            <div className="grid gap-6">
                                                {groupedReports[date].map((report) => (
                                                    <Card
                                                        key={report.id}
                                                        className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400/50 dark:hover:border-blue-500/30 transition-all hover:shadow-xl hover:-translate-y-1 group"
                                                    >
                                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#13498a] to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                                                                    {report.user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-bold text-slate-900 dark:text-white text-lg">
                                                                            {report.user.name}
                                                                        </p>
                                                                        <Badge variant="outline" className="text-[10px] h-5 px-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                                            {new Date(report.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                                        <Link
                                                                            href={`/projects/${report.project.id}`}
                                                                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1.5"
                                                                        >
                                                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                                            {report.project.title}
                                                                        </Link>
                                                                        {report.task && (
                                                                            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium border-none px-2 h-5">
                                                                                {report.task.title}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {report.hoursWorked && (
                                                                <div className="flex items-center self-start px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-400">
                                                                    <Clock className="h-4 w-4 mr-2" />
                                                                    <span className="text-sm font-bold">{report.hoursWorked} Hours</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-5 border border-slate-100/50 dark:border-slate-800/50 shadow-inner">
                                                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed font-normal">
                                                                {report.reportText}
                                                            </p>
                                                        </div>

                                                        {report.replyText && (
                                                            <div className="mt-6 ml-4 md:ml-10 p-5 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/10 dark:to-indigo-900/10 border border-violet-100 dark:border-violet-500/20 rounded-3xl shadow-sm relative">
                                                                <div className="absolute -left-3 top-6 w-6 h-6 bg-violet-100 dark:bg-violet-900 border border-violet-200 dark:border-violet-700 rounded-full flex items-center justify-center transform -rotate-12">
                                                                    <Inbox className="h-3 w-3 text-violet-600" />
                                                                </div>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-bold text-violet-800 dark:text-violet-300 bg-violet-100 dark:bg-violet-800/50 px-2 py-0.5 rounded-lg">
                                                                            Feedback
                                                                        </span>
                                                                        <span className="text-[11px] font-semibold text-violet-600/70 dark:text-violet-400/50">
                                                                            from {report.repliedBy?.name}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium italic">
                                                                    "{report.replyText}"
                                                                </p>
                                                            </div>
                                                        )}

                                                        {canReply && !report.replyText && (
                                                            <div className="mt-5 flex justify-end">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="rounded-full px-5 border-violet-200 dark:border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-300 transition-all font-semibold"
                                                                    onClick={() => {
                                                                        setReplyingTo(report)
                                                                        setReplyDialogOpen(true)
                                                                    }}
                                                                >
                                                                    <FileText className="h-4 w-4 mr-2" />
                                                                    Add Reply
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            {/* Add Report Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                    <div className="bg-gradient-to-br from-[#13498a] to-blue-700 p-8 text-white relative">
                        <DialogTitle className="text-2xl font-bold">Submit Hourly Report</DialogTitle>
                        <DialogDescription className="text-blue-100 mt-2">
                            Provide high-level details about your progress.
                        </DialogDescription>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white dark:bg-slate-950">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Select Project</Label>
                                <Select
                                    value={formData.projectId}
                                    onValueChange={(value) => setFormData({ ...formData, projectId: value, taskId: '' })}
                                >
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                        <SelectValue placeholder="Project Name" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.map((project) => (
                                            <SelectItem key={project.id} value={project.id} className="rounded-lg">
                                                {project.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Target Task</Label>
                                <Select
                                    value={formData.taskId}
                                    onValueChange={(value) => setFormData({ ...formData, taskId: value })}
                                    disabled={!formData.projectId || fetchingTasks}
                                >
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                        <SelectValue placeholder={fetchingTasks ? "Searching..." : "Choose task"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tasks.length === 0 ? (
                                            <SelectItem value="none" disabled>No active tasks</SelectItem>
                                        ) : (
                                            tasks.map((task) => (
                                                <SelectItem key={task.id} value={task.id} className="rounded-lg">
                                                    {task.title}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Daily Work Summary</Label>
                            <Textarea
                                value={formData.reportText}
                                onChange={(e) => setFormData({ ...formData, reportText: e.target.value })}
                                placeholder="Describe your achievements today..."
                                rows={5}
                                required
                                className="rounded-2xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Hours Invested</Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="24"
                                    value={formData.hoursWorked}
                                    onChange={(e) => setFormData({ ...formData, hoursWorked: e.target.value })}
                                    placeholder="e.g. 6.5"
                                    className="pl-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl h-12">
                                Cancel
                            </Button>
                            <LoadingButton
                                type="submit"
                                loading={saving}
                                disabled={!formData.projectId}
                                className="rounded-xl h-12 px-10 bg-gradient-to-r from-[#13498a] to-blue-600 hover:opacity-90"
                            >
                                Publish Report
                            </LoadingButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Reply Dialog */}
            <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
                <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                    <div className="bg-[#5c2d91] p-6 text-white">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Inbox className="h-5 w-5" />
                            Send Feedback
                        </DialogTitle>
                        <DialogDescription className="text-violet-100 text-xs">
                            Direct feedback to {replyingTo?.user.name}.
                        </DialogDescription>
                    </div>

                    <form onSubmit={handleReply} className="p-6 space-y-5 bg-white dark:bg-slate-950">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-400">Your Message</Label>
                            <Textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Enter constructive feedback..."
                                rows={4}
                                required
                                className="rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 resize-none"
                            />
                        </div>

                        <DialogFooter className="gap-2">
                            <Button type="button" variant="ghost" onClick={() => setReplyDialogOpen(false)} className="rounded-xl">
                                Dismiss
                            </Button>
                            <LoadingButton
                                type="submit"
                                loading={sendingReply}
                                className="bg-[#5c2d91] hover:bg-[#4b2476] rounded-xl px-6"
                                disabled={!replyText}
                            >
                                Post Reply
                            </LoadingButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
