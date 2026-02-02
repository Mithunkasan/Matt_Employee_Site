'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { Header } from '@/components/layout/header'
import { PageLoader } from '@/components/shared/loading-spinner'
import { LoadingButton } from '@/components/shared/loading-button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    ArrowLeft,
    Calendar,
    Clock,
    ExternalLink,
    FileText,
    Github,
    Link as LinkIcon,
    User,
    Edit,
    Plus,
} from 'lucide-react'
import { formatDate, getStatusColor, getPriorityColor, calculateProgress } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

interface Project {
    id: string
    title: string
    description?: string | null
    status: string
    priority: string
    startDate?: string | null
    endDate?: string | null
    githubLink?: string | null
    fileUrl?: string | null
    assignedTo?: {
        id: string
        name: string
        email: string
        department?: string
    } | null
    createdBy?: {
        id: string
        name: string
    } | null
    dailyReports: Array<{
        id: string
        reportText: string
        date: string
        hoursWorked?: number | null
        user: {
            id: string
            name: string
        }
    }>
}

export default function ProjectDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const [project, setProject] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
    const [reportDialogOpen, setReportDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // Update form state
    const [updateData, setUpdateData] = useState({
        status: '',
        githubLink: '',
    })

    // Report form state
    const [reportData, setReportData] = useState({
        reportText: '',
        hoursWorked: '',
    })

    const canManageProject = user?.role === 'ADMIN' || user?.role === 'BA'
    const isAssigned = project?.assignedTo?.id === user?.userId

    useEffect(() => {
        fetchProject()
    }, [params.id])

    const fetchProject = async () => {
        try {
            const res = await fetch(`/api/projects/${params.id}`)
            if (res.ok) {
                const data = await res.json()
                setProject(data.project)
                setUpdateData({
                    status: data.project.status,
                    githubLink: data.project.githubLink || '',
                })
            } else if (res.status === 404) {
                toast.error('Project not found')
                router.push('/projects')
            }
        } catch (error) {
            toast.error('Failed to load project')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const res = await fetch(`/api/projects/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            })

            if (res.ok) {
                toast.success('Project updated')
                setUpdateDialogOpen(false)
                fetchProject()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to update project')
            }
        } catch (error) {
            toast.error('Network error')
        } finally {
            setSaving(false)
        }
    }

    const handleSubmitReport = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: params.id,
                    reportText: reportData.reportText,
                    hoursWorked: reportData.hoursWorked ? parseFloat(reportData.hoursWorked) : undefined,
                }),
            })

            if (res.ok) {
                toast.success('Report submitted')
                setReportDialogOpen(false)
                setReportData({ reportText: '', hoursWorked: '' })
                fetchProject()
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

    if (loading) {
        return (
            <div className="min-h-screen">
                <Header title="Project Details" />
                <PageLoader />
            </div>
        )
    }

    if (!project) {
        return null
    }

    const progress = calculateProgress(
        project.startDate ? new Date(project.startDate) : null,
        project.endDate ? new Date(project.endDate) : null
    )

    return (
        <div className="min-h-screen">
            <Header title="Project Details" />

            <div className="p-6">
                {/* Back button */}
                <Button
                    variant="ghost"
                    onClick={() => router.push('/projects')}
                    className="mb-6"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Projects
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Project Header */}
                        <Card className="p-6 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <Badge variant="outline" className={getStatusColor(project.status)}>
                                        {project.status.replace('_', ' ')}
                                    </Badge>
                                    <Badge variant="outline" className={getPriorityColor(project.priority)}>
                                        {project.priority} Priority
                                    </Badge>
                                </div>
                                {(canManageProject || isAssigned) && (
                                    <Button variant="outline" size="sm" onClick={() => setUpdateDialogOpen(true)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Update
                                    </Button>
                                )}
                            </div>

                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                {project.title}
                            </h1>

                            {project.description && (
                                <p className="text-slate-600 dark:text-slate-300 mb-6">
                                    {project.description}
                                </p>
                            )}

                            {/* Progress */}
                            {project.startDate && project.endDate && (
                                <div className="mb-6">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-slate-500 dark:text-slate-400">Timeline Progress</span>
                                        <span className="font-medium text-slate-900 dark:text-white">{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-3" />
                                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                                        <span>{formatDate(project.startDate)}</span>
                                        <span>{formatDate(project.endDate)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Links */}
                            <div className="flex flex-wrap gap-3">
                                {project.githubLink && (
                                    <a
                                        href={project.githubLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <Github className="h-4 w-4" />
                                        Repository
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                                {project.fileUrl && (
                                    <a
                                        href={project.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <LinkIcon className="h-4 w-4" />
                                        Project Files
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                            </div>
                        </Card>

                        {/* Daily Reports */}
                        <Card className="p-6 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                        Daily Reports
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {project.dailyReports.length} reports submitted
                                    </p>
                                </div>
                                {isAssigned && (
                                    <Button onClick={() => setReportDialogOpen(true)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Report
                                    </Button>
                                )}
                            </div>

                            <ScrollArea className="h-[400px] pr-4">
                                {project.dailyReports.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No reports yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {project.dailyReports.map((report) => (
                                            <div
                                                key={report.id}
                                                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-slate-900 dark:text-white">
                                                            {report.user.name}
                                                        </span>
                                                        {report.hoursWorked && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                {report.hoursWorked}h
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                                        {formatDate(report.date)}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                                    {report.reportText}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Assigned User */}
                        <Card className="p-6 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
                                Assigned To
                            </h3>
                            {project.assignedTo ? (
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                        {project.assignedTo.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {project.assignedTo.name}
                                        </p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {project.assignedTo.email}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-500 dark:text-slate-400">Unassigned</p>
                            )}
                        </Card>

                        {/* Project Info */}
                        <Card className="p-6 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
                                Project Details
                            </h3>
                            <div className="space-y-4">
                                {project.startDate && (
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Start Date</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {formatDate(project.startDate)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {project.endDate && (
                                    <div className="flex items-center gap-3">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Deadline</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {formatDate(project.endDate)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {project.createdBy && (
                                    <div className="flex items-center gap-3">
                                        <User className="h-4 w-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Created By</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {project.createdBy.name}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Update Dialog */}
            <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Project</DialogTitle>
                        <DialogDescription>
                            Update project status and links
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleStatusUpdate} className="space-y-4">
                        {canManageProject && (
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={updateData.status}
                                    onValueChange={(value) => setUpdateData({ ...updateData, status: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>GitHub Repository</Label>
                            <Input
                                type="url"
                                value={updateData.githubLink}
                                onChange={(e) => setUpdateData({ ...updateData, githubLink: e.target.value })}
                                placeholder="https://github.com/..."
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                                Cancel
                            </Button>
                            <LoadingButton type="submit" loading={saving}>
                                Save Changes
                            </LoadingButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Report Dialog */}
            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit Daily Report</DialogTitle>
                        <DialogDescription>
                            Add your work update for today
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmitReport} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Report</Label>
                            <Textarea
                                value={reportData.reportText}
                                onChange={(e) => setReportData({ ...reportData, reportText: e.target.value })}
                                placeholder="What did you work on today?"
                                rows={5}
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
                                value={reportData.hoursWorked}
                                onChange={(e) => setReportData({ ...reportData, hoursWorked: e.target.value })}
                                placeholder="e.g., 8"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setReportDialogOpen(false)}>
                                Cancel
                            </Button>
                            <LoadingButton type="submit" loading={saving}>
                                Submit Report
                            </LoadingButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
