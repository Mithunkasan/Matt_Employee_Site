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
import { FileText, Plus, Search, Filter, Clock, Calendar, User } from 'lucide-react'
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

    // Form state
    const [formData, setFormData] = useState({
        projectId: '',
        taskId: '',
        reportText: '',
        hoursWorked: '',
    })

    const [tasks, setTasks] = useState<any[]>([])
    const [fetchingTasks, setFetchingTasks] = useState(false)

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

    const canViewAll = user?.role === 'ADMIN' || user?.role === 'BA'
    const canSubmit = user?.role === 'EMPLOYEE' || user?.role === 'BA'

    useEffect(() => {
        fetchReports()
        if (canSubmit) {
            fetchMyProjects()
        }
    }, [canSubmit])

    const fetchReports = async () => {
        try {
            const res = await fetch('/api/reports')
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
                    hoursWorked: formData.hoursWorked ? parseFloat(formData.hoursWorked) : undefined,
                }),
            })

            if (res.ok) {
                toast.success('Report submitted')
                setDialogOpen(false)
                setFormData({ projectId: '', taskId: '', reportText: '', hoursWorked: '' })
                fetchReports()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to submit report')
            }
        } catch (error) {
            toast.error('Network error')
        } finally {
            setSaving(false)
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

    // Group reports by date
    const groupedReports = filteredReports.reduce((acc, report) => {
        const date = report.date.split('T')[0]
        if (!acc[date]) {
            acc[date] = []
        }
        acc[date].push(report)
        return acc
    }, {} as Record<string, Report[]>)

    const sortedDates = Object.keys(groupedReports).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
    )

    // Unique projects for filter
    const uniqueProjects = Array.from(
        new Set(reports.map((r) => JSON.stringify({ id: r.project.id, title: r.project.title })))
    ).map((s) => JSON.parse(s))

    if (loading) {
        return (
            <div className="min-h-screen">
                <Header title="Hourly Reports" description="Track work hours and progress" />
                <PageLoader />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="Hourly Work Reports"
                description={`${reports.length} total reports submitted`}
            />

            <div className="p-6">
                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search reports by text, project or employee..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-11"
                        />
                    </div>
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                        <SelectTrigger className="w-full sm:w-[240px] h-11">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Filter by project" />
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
                    {canSubmit && (
                        <Button
                            onClick={() => setDialogOpen(true)}
                            className="bg-[#13498a] hover:bg-[#13498a]/90 text-white shadow-lg shadow-blue-500/10 px-6 h-11"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Submit Report
                        </Button>
                    )}
                </div>

                {/* Reports List */}
                {sortedDates.length === 0 ? (
                    <Card className="p-12 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-dashed">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-500 dark:text-slate-400">No reports found matching your criteria</p>
                        {canSubmit && (
                            <Button onClick={() => setDialogOpen(true)} className="mt-4 bg-[#13498a]">
                                Submit Your First Report
                            </Button>
                        )}
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {sortedDates.map((date) => (
                            <div key={date}>
                                <div className="flex items-center gap-3 mb-4 sticky top-[73px] z-10 bg-slate-50/95 dark:bg-slate-950/95 py-2 backdrop-blur-sm">
                                    <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                                        <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <h2 className="font-bold text-slate-900 dark:text-white text-lg">
                                        {formatDate(date)}
                                    </h2>
                                    <Badge variant="secondary" className="bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                        {groupedReports[date].length} reports
                                    </Badge>
                                </div>

                                <div className="grid gap-4">
                                    {groupedReports[date].map((report) => (
                                        <Card
                                            key={report.id}
                                            className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-500/30 transition-all hover:shadow-md"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#13498a] to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                                        {report.user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                                {report.user.name}
                                                            </p>
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-slate-200 dark:border-slate-800">
                                                                {new Date(report.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </Badge>
                                                        </div>
                                                        <Link
                                                            href={`/projects/${report.project.id}`}
                                                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                                                        >
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                            {report.project.title}
                                                        </Link>
                                                        {report.task && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-none text-[10px] h-4 px-1.5 font-medium">
                                                                    Task: {report.task.title}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {report.hoursWorked && (
                                                    <div className="flex flex-col items-end">
                                                        <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/20 px-3 py-1">
                                                            <Clock className="h-3.5 w-3.5 mr-1.5" />
                                                            {report.hoursWorked} Hours
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800/50">
                                                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
                                                    {report.reportText}
                                                </p>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Report Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Submit Hourly Report</DialogTitle>
                        <DialogDescription>
                            Provide a detailed update on your work hours and project progress
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Select Project</Label>
                                <Select
                                    value={formData.projectId}
                                    onValueChange={(value) => setFormData({ ...formData, projectId: value, taskId: '' })}
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Choose project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.map((project) => (
                                            <SelectItem key={project.id} value={project.id}>
                                                {project.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Select Task (Optional)</Label>
                                <Select
                                    value={formData.taskId}
                                    onValueChange={(value) => setFormData({ ...formData, taskId: value })}
                                    disabled={!formData.projectId || fetchingTasks}
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder={fetchingTasks ? "Loading..." : "Assign to task"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tasks.length === 0 ? (
                                            <SelectItem value="none" disabled>No tasks found</SelectItem>
                                        ) : (
                                            tasks.map((task) => (
                                                <SelectItem key={task.id} value={task.id}>
                                                    {task.title}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Work Summary & Progress</Label>
                            <Textarea
                                value={formData.reportText}
                                onChange={(e) => setFormData({ ...formData, reportText: e.target.value })}
                                placeholder="What tasks did you complete? Mention any blockers or next steps..."
                                rows={6}
                                required
                                className="resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Hours Worked</Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="24"
                                    value={formData.hoursWorked}
                                    onChange={(e) => setFormData({ ...formData, hoursWorked: e.target.value })}
                                    placeholder="Enter total hours, e.g., 4.5"
                                    className="pl-10 h-11"
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="h-11 px-6">
                                Cancel
                            </Button>
                            <LoadingButton
                                type="submit"
                                loading={saving}
                                disabled={!formData.projectId}
                                className="h-11 px-8 bg-[#13498a] hover:bg-[#13498a]/90"
                            >
                                Submit Report
                            </LoadingButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
