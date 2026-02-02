'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { Header } from '@/components/layout/header'
import { ProjectCard } from '@/components/shared/project-card'
import { PageLoader } from '@/components/shared/loading-spinner'
import { LoadingButton } from '@/components/shared/loading-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Filter } from 'lucide-react'
import { toast } from 'sonner'

interface Project {
    id: string
    title: string
    description?: string | null
    status: string
    priority: string
    startDate?: string | null
    endDate?: string | null
    githubLink?: string | null
    assignedTo?: {
        id: string
        name: string
        email?: string
    } | null
    createdBy?: {
        id: string
        name: string
    } | null
    _count?: {
        dailyReports: number
    }
}

interface User {
    id: string
    name: string
    email: string
    role: string
}

export default function ProjectsPage() {
    const { user } = useAuth()
    const [projects, setProjects] = useState<Project[]>([])
    const [employees, setEmployees] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingProject, setEditingProject] = useState<Project | null>(null)
    const [saving, setSaving] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        startDate: '',
        endDate: '',
        assignedToId: '',
        githubLink: '',
    })

    const canManageProjects = user?.role === 'ADMIN' || user?.role === 'BA'

    useEffect(() => {
        fetchProjects()
        if (canManageProjects) {
            fetchEmployees()
        }
    }, [])

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects')
            if (res.ok) {
                const data = await res.json()
                setProjects(data.projects)
            }
        } catch (error) {
            toast.error('Failed to load projects')
        } finally {
            setLoading(false)
        }
    }

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/users?role=EMPLOYEE')
            if (res.ok) {
                const data = await res.json()
                setEmployees(data.users)
            }
        } catch (error) {
            console.error('Failed to load employees')
        }
    }

    const openCreateDialog = () => {
        setEditingProject(null)
        setFormData({
            title: '',
            description: '',
            priority: 'MEDIUM',
            startDate: '',
            endDate: '',
            assignedToId: '',
            githubLink: '',
        })
        setDialogOpen(true)
    }

    const openEditDialog = (project: Project) => {
        setEditingProject(project)
        setFormData({
            title: project.title,
            description: project.description || '',
            priority: project.priority,
            startDate: project.startDate?.split('T')[0] || '',
            endDate: project.endDate?.split('T')[0] || '',
            assignedToId: project.assignedTo?.id || '',
            githubLink: project.githubLink || '',
        })
        setDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const url = editingProject
                ? `/api/projects/${editingProject.id}`
                : '/api/projects'
            const method = editingProject ? 'PATCH' : 'POST'

            // Transform unassigned employee value
            const payload = {
                ...formData,
                assignedToId: formData.assignedToId === 'none' ? '' : formData.assignedToId,
            };
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                toast.success(editingProject ? 'Project updated' : 'Project created')
                setDialogOpen(false)
                fetchProjects()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to save project')
            }
        } catch (error) {
            toast.error('Network error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (project: Project) => {
        if (!confirm('Are you sure you want to delete this project?')) return

        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                toast.success('Project deleted')
                fetchProjects()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to delete project')
            }
        } catch (error) {
            toast.error('Network error')
        }
    }

    const filteredProjects = projects.filter((project) => {
        const matchesSearch = project.title.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter
        return matchesSearch && matchesStatus
    })

    if (loading) {
        return (
            <div className="min-h-screen">
                <Header title="Projects" description="Manage your projects" />
                <PageLoader />
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <Header
                title="Projects"
                description={`${projects.length} total projects`}
            />

            <div className="p-6">
                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search projects..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                    {canManageProjects && (
                        <Button onClick={openCreateDialog} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                            <Plus className="h-4 w-4 mr-2" />
                            New Project
                        </Button>
                    )}
                </div>

                {/* Projects Tabs */}
                <Tabs defaultValue="grid" className="w-full">
                    <TabsList className="mb-6">
                        <TabsTrigger value="grid">Grid View</TabsTrigger>
                        <TabsTrigger value="list">List View</TabsTrigger>
                    </TabsList>

                    <TabsContent value="grid">
                        {filteredProjects.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-500 dark:text-slate-400">No projects found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProjects.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        onEdit={canManageProjects ? openEditDialog : undefined}
                                        onDelete={user?.role === 'ADMIN' ? handleDelete : undefined}
                                        showActions={canManageProjects}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="list">
                        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700/50">
                                        <th className="text-left p-4 font-medium text-slate-500 dark:text-slate-400">Project</th>
                                        <th className="text-left p-4 font-medium text-slate-500 dark:text-slate-400">Status</th>
                                        <th className="text-left p-4 font-medium text-slate-500 dark:text-slate-400">Priority</th>
                                        <th className="text-left p-4 font-medium text-slate-500 dark:text-slate-400">Assigned To</th>
                                        <th className="text-left p-4 font-medium text-slate-500 dark:text-slate-400">Deadline</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProjects.map((project) => (
                                        <tr key={project.id} className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="p-4">
                                                <p className="font-medium text-slate-900 dark:text-white">{project.title}</p>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${project.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                                                    project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                                                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                                                    }`}>
                                                    {project.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${project.priority === 'HIGH' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                                                    project.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                                        'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400'
                                                    }`}>
                                                    {project.priority}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">
                                                {project.assignedTo?.name || '-'}
                                            </td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">
                                                {project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingProject ? 'Edit Project' : 'Create New Project'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingProject ? 'Update project details' : 'Add a new project to your workspace'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Project Title</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter project title"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Project description..."
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Low</SelectItem>
                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                        <SelectItem value="HIGH">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="assignedTo">Assign To</Label>
                                <Select
                                    value={formData.assignedToId}
                                    onValueChange={(value) => setFormData({ ...formData, assignedToId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Unassigned</SelectItem>
                                        {employees.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="githubLink">GitHub Repository (Optional)</Label>
                            <Input
                                id="githubLink"
                                type="url"
                                value={formData.githubLink}
                                onChange={(e) => setFormData({ ...formData, githubLink: e.target.value })}
                                placeholder="https://github.com/..."
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <LoadingButton type="submit" loading={saving}>
                                {editingProject ? 'Save Changes' : 'Create Project'}
                            </LoadingButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
