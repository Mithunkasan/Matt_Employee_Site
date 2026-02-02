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
        reportText: '',
        hoursWorked: '',
    })

    const canViewAll = user?.role === 'ADMIN' || user?.role === 'BA'
    const isEmployee = user?.role === 'EMPLOYEE'

    useEffect(() => {
        fetchReports()
        if (isEmployee) {
            fetchMyProjects()
        }
    }, [])

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
                setFormData({ projectId: '', reportText: '', hoursWorked: '' })
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
            report.project.title.toLowerCase().includes(search.toLowerCase())
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
                <Header title="Reports" description="Daily work reports" />
                <PageLoader />
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <Header
                title="Daily Reports"
                description={`${reports.length} reports submitted`}
            />

            <div className="p-6">
                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search reports..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]">
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
                    {isEmployee && (
                        <Button
                            onClick={() => setDialogOpen(true)}
                            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Report
                        </Button>
                    )}
                </div>

                {/* Reports List */}
                {sortedDates.length === 0 ? (
                    <Card className="p-12 text-center bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                        <p className="text-slate-500 dark:text-slate-400">No reports found</p>
                        {isEmployee && (
                            <Button onClick={() => setDialogOpen(true)} className="mt-4">
                                Submit Your First Report
                            </Button>
                        )}
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {sortedDates.map((date) => (
                            <div key={date}>
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar className="h-4 w-4 text-violet-500" />
                                    <h2 className="font-semibold text-slate-900 dark:text-white">
                                        {formatDate(date)}
                                    </h2>
                                    <Badge variant="secondary" className="ml-2">
                                        {groupedReports[date].length} reports
                                    </Badge>
                                </div>

                                <div className="grid gap-4">
                                    {groupedReports[date].map((report) => (
                                        <Card
                                            key={report.id}
                                            className="p-6 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 hover:border-violet-300 dark:hover:border-violet-500/30 transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                                        {report.user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white">
                                                            {report.user.name}
                                                        </p>
                                                        <Link
                                                            href={`/projects/${report.project.id}`}
                                                            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
                                                        >
                                                            {report.project.title}
                                                        </Link>
                                                    </div>
                                                </div>
                                                {report.hoursWorked && (
                                                    <Badge variant="secondary" className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {report.hoursWorked}h
                                                    </Badge>
                                                )}
                                            </div>

                                            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                                {report.reportText}
                                            </p>
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
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Submit Daily Report</DialogTitle>
                        <DialogDescription>
                            Record your work progress for today
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Project</Label>
                            <Select
                                value={formData.projectId}
                                onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a project" />
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
                            <Label>Report</Label>
                            <Textarea
                                value={formData.reportText}
                                onChange={(e) => setFormData({ ...formData, reportText: e.target.value })}
                                placeholder="What did you work on today? Be specific about your progress, challenges, and next steps..."
                                rows={6}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Hours Worked (Optional)</Label>
                            <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                value={formData.hoursWorked}
                                onChange={(e) => setFormData({ ...formData, hoursWorked: e.target.value })}
                                placeholder="e.g., 8"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <LoadingButton type="submit" loading={saving} disabled={!formData.projectId}>
                                Submit Report
                            </LoadingButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
