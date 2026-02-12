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
import { Plus, Search, Filter, Clock, Calendar, User, FolderKanban, CheckCircle2, MoreVertical, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

interface Task {
    id: string
    title: string
    description?: string | null
    status: string
    priority: string
    startDate?: string | null
    endDate?: string | null
    project: {
        id: string
        title: string
    }
    assignedTo?: {
        id: string
        name: string
    } | null
}

interface Project {
    id: string
    title: string
}

interface User {
    id: string
    name: string
    role: string
}

export default function TaskAllocationPage() {
    const { user } = useAuth()
    const [tasks, setTasks] = useState<Task[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [projectFilter, setProjectFilter] = useState('all')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingTask, setEditingTask] = useState<Task | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        projectId: '',
        assignedToId: '',
        startDate: '',
        endDate: '',
    })

    const canManageTasks = user?.role === 'ADMIN' || user?.role === 'PA' || user?.role === 'MANAGER' || user?.role === 'TEAM_LEADER' || user?.role === 'BA'
    const isAdmin = user?.role === 'ADMIN'

    useEffect(() => {
        if (canManageTasks) {
            fetchInitialData()
        }
    }, [user?.role])

    const fetchInitialData = async () => {
        try {
            const [tasksRes, projectsRes, usersRes] = await Promise.all([
                fetch('/api/tasks'),
                fetch('/api/projects'),
                fetchInitialAssignableUsers()
            ])

            if (tasksRes.ok) {
                const data = await tasksRes.json()
                setTasks(data.tasks)
            }
            if (projectsRes.ok) {
                const data = await projectsRes.json()
                setProjects(data.projects)
            }
            if (usersRes.ok) {
                const data = await usersRes.json()
                setUsers(data.users)
            }
        } catch (error) {
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    const fetchInitialAssignableUsers = async () => {
        if (!user) return fetch('/api/users?role=');

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

        return fetch(`/api/users?role=${roleQuery}${managerQuery}`);
    }

    const openCreateDialog = () => {
        setEditingTask(null)
        setFormData({
            title: '',
            description: '',
            priority: 'MEDIUM',
            projectId: '',
            assignedToId: '',
            startDate: '',
            endDate: '',
        })
        setDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                toast.success('Task allocated successfully')
                setDialogOpen(false)
                fetchInitialData()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to allocate task')
            }
        } catch (error) {
            toast.error('Network error')
        } finally {
            setSaving(false)
        }
    }

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
            task.project.title.toLowerCase().includes(search.toLowerCase())
        const matchesProject = projectFilter === 'all' || task.project.id === projectFilter
        return matchesSearch && matchesProject
    })

    if (!canManageTasks) return <div className="p-6 text-center text-red-500 font-bold">Unauthorized Access</div>

    if (loading) return <PageLoader />

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="Task Allocation"
                description="Assign specific tasks to Employees and Business Analysts"
            />

            <div className="p-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search tasks or projects..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-11"
                        />
                    </div>
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                        <SelectTrigger className="w-full sm:w-[240px] h-11">
                            <FolderKanban className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="All Projects" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={openCreateDialog} className="bg-[#13498a] hover:bg-[#13498a]/90 text-white h-11 px-6 shadow-lg shadow-blue-500/20">
                        <Plus className="h-4 w-4 mr-2" />
                        Allocate Task
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTasks.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 border border-dashed rounded-2xl">
                            <p className="text-slate-500">No tasks allocated yet.</p>
                        </div>
                    ) : (
                        filteredTasks.map(task => (
                            <Card key={task.id} className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <Badge variant="outline" className="bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 border-blue-100 dark:border-blue-800 text-[10px] uppercase font-bold tracking-tight">
                                        {task.project.title}
                                    </Badge>
                                    <Badge className={
                                        task.priority === 'HIGH' ? 'bg-red-500' :
                                            task.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-500'
                                    }>
                                        {task.priority}
                                    </Badge>
                                </div>

                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                                    {task.title}
                                </h3>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                                    {task.description || 'No description provided.'}
                                </p>

                                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                        <User className="h-4 w-4 text-slate-400" />
                                        <span>{task.assignedTo?.name || 'Unassigned'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <span>{task.endDate ? formatDate(task.endDate) : 'No Deadline'}</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`h-2 w-2 rounded-full ${task.status === 'COMPLETED' ? 'bg-emerald-500' :
                                            task.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-yellow-500'
                                            }`} />
                                        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                            {task.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Allocate New Task</DialogTitle>
                        <DialogDescription>Assign specialized tasks to employees within their projects</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-5 pt-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Task Title</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter task name"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Select Project</Label>
                            <Select
                                value={formData.projectId}
                                onValueChange={(v) => setFormData({ ...formData, projectId: v })}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Which project does this belong to?" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    {user?.role === 'MANAGER' ? 'Assign to Team Leader' : user?.role === 'TEAM_LEADER' ? 'Assign to Employee' : 'Assign To'}
                                </Label>
                                <Select
                                    value={formData.assignedToId}
                                    onValueChange={(v) => setFormData({ ...formData, assignedToId: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={user?.role === 'MANAGER' ? 'Select Team Leader' : 'Select User'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Unassigned</SelectItem>
                                        {users.map(u => (
                                            <SelectItem key={u.id} value={u.id}>
                                                {u.name} {user?.role === 'ADMIN' && `(${u.role})`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(v) => setFormData({ ...formData, priority: v })}
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
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Task Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the task details..."
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Start Date</Label>
                                <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Deadline</Label>
                                <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => setDialogOpen(false)} className="h-11 px-6">Cancel</Button>
                            <LoadingButton type="submit" loading={saving} className="bg-[#13498a] hover:bg-[#13498a]/90 h-11 px-8 shadow-md">
                                Confirm Allocation
                            </LoadingButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
