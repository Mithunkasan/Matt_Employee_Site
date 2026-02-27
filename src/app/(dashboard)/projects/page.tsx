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
import { Badge } from '@/components/ui/badge'
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
import { Plus, Search, Filter, Clock, AlertCircle, CheckCircle2, LayoutGrid, List, Kanban, X } from 'lucide-react'
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
    const [priorityFilter, setPriorityFilter] = useState('all')
    const [employeeFilter, setEmployeeFilter] = useState('all')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingProject, setEditingProject] = useState<Project | null>(null)
    const [saving, setSaving] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        status: 'PENDING',
        startDate: '',
        endDate: '',
        assignedToId: '',
        githubLink: '',
    })

    const canCreateProjects = user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'BA' || user?.role === 'PA'
    const canUpdateProjects = user?.role === 'ADMIN' || user?.role === 'BA' || user?.role === 'PA' || user?.role === 'MANAGER' || user?.role === 'TEAM_LEADER'
    const isAdmin = user?.role === 'ADMIN'

    useEffect(() => {
        fetchProjects()
        if (canUpdateProjects) {
            fetchAssignableUsers()
        }
    }, [user?.role])

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

    const fetchAssignableUsers = async () => {
        try {
            if (!user) return;

            let roleQuery = '';
            let managerQuery = '';

            if (user.role === 'ADMIN') {
                roleQuery = 'BA,MANAGER,TEAM_LEADER,EMPLOYEE';
            } else if (user.role === 'BA') {
                roleQuery = 'MANAGER';
            } else if (user.role === 'MANAGER') {
                roleQuery = 'TEAM_LEADER';
                managerQuery = `&managerId=${user.userId}`;
            } else if (user.role === 'TEAM_LEADER') {
                roleQuery = 'EMPLOYEE';
                managerQuery = `&managerId=${user.userId}`;
            }

            const res = await fetch(`/api/users?role=${roleQuery}${managerQuery}`);
            if (res.ok) {
                const data = await res.json();
                setEmployees(data.users);
            } else {
                console.error('Failed to load assignable users:', await res.text());
            }
        } catch (error) {
            console.error('Failed to load assignable users:', error);
        }
    }

    const openCreateDialog = () => {
        setEditingProject(null)
        setFormData({
            title: '',
            description: '',
            priority: 'MEDIUM',
            status: 'PENDING',
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
            status: project.status,
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

    const resetFilters = () => {
        setSearch('')
        setStatusFilter('all')
        setPriorityFilter('all')
        setEmployeeFilter('all')
    }

    const filteredProjects = projects.filter((project) => {
        const matchesSearch = project.title.toLowerCase().includes(search.toLowerCase()) ||
            project.description?.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter
        const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter
        const matchesEmployee = employeeFilter === 'all' || project.assignedTo?.id === employeeFilter
        return matchesSearch && matchesStatus && matchesPriority && matchesEmployee
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
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="Projects"
                description={`${projects.length} total projects in workspace`}
            />

            <div className="p-6 max-w-[1600px] mx-auto">
                {/* Customized Filter Section */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 shadow-sm">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Search */}
                        <div className="flex-1 space-y-2">
                            <Label className="text-sm font-medium text-slate-500">Search Projects</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search by title or description..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 h-11"
                                />
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:w-[60%]">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-500">Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="IN_PROGRESS">Ongoing</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-500">Priority</Label>
                                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="All Priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Priority</SelectItem>
                                        <SelectItem value="HIGH">High</SelectItem>
                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                        <SelectItem value="LOW">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-500">
                                    {user?.role === 'MANAGER' ? 'Team Leader' : user?.role === 'TEAM_LEADER' ? 'Employee' : 'Assigned To'}
                                </Label>
                                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder={user?.role === 'MANAGER' ? 'Select Team Leader' : 'All Employees'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            {user?.role === 'MANAGER' ? 'All Team Leaders' : 'All Employees'}
                                        </SelectItem>
                                        {employees.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.name} {user?.role === 'ADMIN' ? `(${emp.role})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6 gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Filter className="h-4 w-4" />
                            <span>{filteredProjects.length} projects found</span>
                            {(search || statusFilter !== 'all' || priorityFilter !== 'all' || employeeFilter !== 'all') && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetFilters}
                                    className="text-violet-600 hover:text-violet-700 h-8 px-2"
                                >
                                    <X className="h-3 w-3 mr-1" />
                                    Reset Filters
                                </Button>
                            )}
                        </div>
                        {canCreateProjects && (
                            <Button onClick={openCreateDialog} className="bg-[#13498a] hover:bg-[#13498a]/90 text-white shadow-lg shadow-blue-500/20 px-6 h-11">
                                <Plus className="h-4 w-4 mr-2" />
                                New Project
                            </Button>
                        )}
                    </div>
                </div>

                {/* Projects Tabs */}
                <Tabs defaultValue="board" className="w-full">
                    <div className="flex items-center justify-between mb-6">
                        <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1">
                            <TabsTrigger value="board" className="gap-2">
                                <Kanban className="h-4 w-4" />
                                Status Board
                            </TabsTrigger>
                            <TabsTrigger value="grid" className="gap-2">
                                <LayoutGrid className="h-4 w-4" />
                                Grid View
                            </TabsTrigger>
                            <TabsTrigger value="list" className="gap-2">
                                <List className="h-4 w-4" />
                                List View
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="board">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Pending Column */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-500/10">
                                            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                                        </div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">Pending</h3>
                                        <Badge variant="secondary" className="bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                            {filteredProjects.filter(p => p.status === 'PENDING').length}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4 min-h-[500px] p-2 rounded-2xl bg-slate-100/30 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800">
                                    {filteredProjects.filter(p => p.status === 'PENDING').map((project) => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            onEdit={canUpdateProjects ? openEditDialog : undefined}
                                            onDelete={user?.role === 'ADMIN' ? handleDelete : undefined}
                                            showActions={canUpdateProjects}
                                            isAllocationView={['MANAGER', 'TEAM_LEADER'].includes(user?.role || '')}
                                        />
                                    ))}
                                    {filteredProjects.filter(p => p.status === 'PENDING').length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                                                <Clock className="h-6 w-6 opacity-20" />
                                            </div>
                                            <p className="text-sm">No pending projects</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Ongoing Column */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/10">
                                            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                                        </div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">Ongoing</h3>
                                        <Badge variant="secondary" className="bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                            {filteredProjects.filter(p => p.status === 'IN_PROGRESS').length}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4 min-h-[500px] p-2 rounded-2xl bg-slate-100/30 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800">
                                    {filteredProjects.filter(p => p.status === 'IN_PROGRESS').map((project) => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            onEdit={canUpdateProjects ? openEditDialog : undefined}
                                            onDelete={user?.role === 'ADMIN' ? handleDelete : undefined}
                                            showActions={canUpdateProjects}
                                            isAllocationView={['MANAGER', 'TEAM_LEADER'].includes(user?.role || '')}
                                        />
                                    ))}
                                    {filteredProjects.filter(p => p.status === 'IN_PROGRESS').length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                                                <AlertCircle className="h-6 w-6 opacity-20" />
                                            </div>
                                            <p className="text-sm">No ongoing projects</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Completed Column */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-500/10">
                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                                        </div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">Completed</h3>
                                        <Badge variant="secondary" className="bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                            {filteredProjects.filter(p => p.status === 'COMPLETED').length}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4 min-h-[500px] p-2 rounded-2xl bg-slate-100/30 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800">
                                    {filteredProjects.filter(p => p.status === 'COMPLETED').map((project) => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            onEdit={canUpdateProjects ? openEditDialog : undefined}
                                            onDelete={user?.role === 'ADMIN' ? handleDelete : undefined}
                                            showActions={canUpdateProjects}
                                            isAllocationView={['MANAGER', 'TEAM_LEADER'].includes(user?.role || '')}
                                        />
                                    ))}
                                    {filteredProjects.filter(p => p.status === 'COMPLETED').length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                                                <CheckCircle2 className="h-6 w-6 opacity-20" />
                                            </div>
                                            <p className="text-sm">No completed projects</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="grid">
                        {filteredProjects.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
                                <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 w-fit mx-auto mb-4">
                                    <Search className="h-8 w-8 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white">No projects found</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-1">Try adjusting your filters or search terms</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProjects.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        onEdit={canUpdateProjects ? openEditDialog : undefined}
                                        onDelete={user?.role === 'ADMIN' ? handleDelete : undefined}
                                        showActions={canUpdateProjects}
                                        isAllocationView={['MANAGER', 'TEAM_LEADER'].includes(user?.role || '')}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="list">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="text-left p-4 font-semibold text-slate-900 dark:text-white">Project</th>
                                        <th className="text-left p-4 font-semibold text-slate-900 dark:text-white">Status</th>
                                        <th className="text-left p-4 font-semibold text-slate-900 dark:text-white">Priority</th>
                                        <th className="text-left p-4 font-semibold text-slate-900 dark:text-white">Assigned To</th>
                                        <th className="text-left p-4 font-semibold text-slate-900 dark:text-white">Deadline</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProjects.map((project) => (
                                        <tr key={project.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <td className="p-4">
                                                <p className="font-medium text-slate-900 dark:text-white">{project.title}</p>
                                                {project.description && (
                                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{project.description}</p>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <Badge variant="outline" className={project.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                    project.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                        'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                }>
                                                    {project.status === 'IN_PROGRESS' ? 'Ongoing' : project.status.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant="outline" className={project.priority === 'HIGH' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    project.priority === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                        'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                                }>
                                                    {project.priority}
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-[10px] font-bold text-violet-700 dark:text-violet-400">
                                                        {project.assignedTo?.name.charAt(0) || '-'}
                                                    </div>
                                                    <span className="text-sm text-slate-600 dark:text-slate-300">
                                                        {project.assignedTo?.name || 'Unassigned'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
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
                        <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                            {editingProject ? 'Edit Project' : 'Create New Project'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingProject ? 'Update project details and progress' : 'Add a new project to your team workspace'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-sm font-semibold">Project Title</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter project title"
                                required
                                className="h-11"
                                disabled={!!(editingProject && !canCreateProjects)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="What is this project about?"
                                rows={3}
                                className="resize-none"
                                disabled={!!(editingProject && !canCreateProjects)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="priority" className="text-sm font-semibold">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                                >
                                    <SelectTrigger className="h-11">
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
                                <Label htmlFor="status" className="text-sm font-semibold">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="IN_PROGRESS">Ongoing</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="assignedTo" className="text-sm font-semibold">
                                {user?.role === 'MANAGER' ? 'Assign to Team Leader' : user?.role === 'TEAM_LEADER' ? 'Assign to Employee' : 'Assign To'}
                            </Label>
                            <Select
                                value={formData.assignedToId}
                                onValueChange={(value) => setFormData({ ...formData, assignedToId: value })}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder={user?.role === 'MANAGER' ? 'Select team leader' : 'Select employee'} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Unassigned</SelectItem>
                                    {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.name} {user?.role === 'ADMIN' && `(${emp.role})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate" className="text-sm font-semibold">Start Date</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="endDate" className="text-sm font-semibold">End Date</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="h-11"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="githubLink" className="text-sm font-semibold">GitHub Repository (Optional)</Label>
                            <Input
                                id="githubLink"
                                type="url"
                                value={formData.githubLink}
                                onChange={(e) => setFormData({ ...formData, githubLink: e.target.value })}
                                placeholder="https://github.com/..."
                                className="h-11"
                            />
                        </div>

                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="h-11 px-6">
                                Cancel
                            </Button>
                            <LoadingButton type="submit" loading={saving} className="h-11 px-8 bg-[#13498a] hover:bg-[#13498a]/90">
                                {editingProject ? 'Save Changes' : 'Create Project'}
                            </LoadingButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
