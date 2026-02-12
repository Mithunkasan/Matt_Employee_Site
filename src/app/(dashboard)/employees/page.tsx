'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { Header } from '@/components/layout/header'
import { PageLoader } from '@/components/shared/loading-spinner'
import { LoadingButton } from '@/components/shared/loading-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Plus, Search, Filter, MoreHorizontal, Mail, Phone, Edit, Trash2, UserPlus } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials, getRoleColor, getStatusColor, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface Employee {
    id: string
    name: string
    email: string
    role: string
    status: string
    department?: string | null
    phone?: string | null
    managerId?: string | null
    manager?: {
        id: string
        name: string
        role: string
    } | null
    createdAt: string
}

export default function EmployeesPage() {
    const { user } = useAuth()
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
    const [saving, setSaving] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
        department: '',
        phone: '',
        status: 'ACTIVE',
        managerId: '',
    })

    const canManageEmployees = user?.role === 'ADMIN' || user?.role === 'HR'

    useEffect(() => {
        fetchEmployees()
    }, [])

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/users')
            if (res.ok) {
                const data = await res.json()
                setEmployees(data.users)
            }
        } catch (error) {
            toast.error('Failed to load employees')
        } finally {
            setLoading(false)
        }
    }

    const openCreateDialog = () => {
        setEditingEmployee(null)
        // Set default role based on user's role
        let defaultRole = 'BA'
        if (user?.role === 'ADMIN') defaultRole = 'EMPLOYEE'

        setFormData({
            name: '',
            email: '',
            password: '',
            role: defaultRole,
            department: '',
            phone: '',
            status: 'ACTIVE',
            managerId: '',
        })
        setDialogOpen(true)
    }

    const openEditDialog = (employee: Employee) => {
        setEditingEmployee(employee)
        setFormData({
            name: employee.name,
            email: employee.email,
            password: '',
            role: employee.role,
            department: employee.department || '',
            phone: employee.phone || '',
            status: employee.status,
            managerId: employee.managerId || '',
        })
        setDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const url = editingEmployee
                ? `/api/users/${editingEmployee.id}`
                : '/api/users'
            const method = editingEmployee ? 'PATCH' : 'POST'

            // Don't send password if empty on edit
            const payload = { ...formData }
            if (editingEmployee && !payload.password) {
                delete (payload as Record<string, unknown>).password
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                toast.success(editingEmployee ? 'Employee updated' : 'Employee created')
                setDialogOpen(false)
                fetchEmployees()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to save employee')
            }
        } catch (error) {
            toast.error('Network error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (employee: Employee) => {
        if (user?.role !== 'ADMIN') {
            toast.error('Only administrators can delete users')
            return
        }

        if (!confirm(`Are you sure you want to delete ${employee.name}?`)) return

        try {
            const res = await fetch(`/api/users/${employee.id}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                toast.success('Employee deleted')
                fetchEmployees()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to delete employee')
            }
        } catch (error) {
            toast.error('Network error')
        }
    }

    const handleToggleStatus = async (employee: Employee) => {
        const newStatus = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

        try {
            const res = await fetch(`/api/users/${employee.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })

            if (res.ok) {
                toast.success(`Employee ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`)
                fetchEmployees()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to update status')
            }
        } catch (error) {
            toast.error('Network error')
        }
    }

    const filteredEmployees = employees.filter((emp) => {
        const matchesSearch =
            emp.name.toLowerCase().includes(search.toLowerCase()) ||
            emp.email.toLowerCase().includes(search.toLowerCase())
        const matchesRole = roleFilter === 'all' || emp.role === roleFilter
        const matchesStatus = statusFilter === 'all' || emp.status === statusFilter
        return matchesSearch && matchesRole && matchesStatus
    })

    if (loading) {
        return (
            <div className="min-h-screen">
                <Header title="Employees" description="Manage your team" />
                <PageLoader />
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <Header
                title="Employees"
                description={`${employees.length} team members`}
            />

            <div className="p-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {employees.filter(e => e.status === 'ACTIVE').length}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
                    </Card>
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {employees.filter(e => e.role === 'MANAGER').length}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Managers</p>
                    </Card>
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {employees.filter(e => e.role === 'TEAM_LEADER').length}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Team Leaders</p>
                    </Card>
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {employees.filter(e => e.role === 'EMPLOYEE').length}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Employees</p>
                    </Card>
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {employees.filter(e => e.role === 'BA' || e.role === 'PA').length}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Business Associates</p>
                    </Card>
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {employees.filter(e => e.role === 'HR').length}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">HR</p>
                    </Card>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search employees..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="HR">HR</SelectItem>
                            <SelectItem value="MANAGER">Manager</SelectItem>
                            <SelectItem value="TEAM_LEADER">Team Leader</SelectItem>
                            <SelectItem value="BA">Business Associate</SelectItem>
                            <SelectItem value="EMPLOYEE">Employee</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    {canManageEmployees && (
                        <Button onClick={openCreateDialog} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Employee
                        </Button>
                    )}
                </div>

                {/* Employees Table */}
                <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-200 dark:border-slate-700/50">
                                <TableHead>Employee</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Manager</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                {canManageEmployees && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEmployees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-slate-500 dark:text-slate-400">
                                        No employees found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredEmployees.map((employee) => (
                                    <TableRow key={employee.id} className="border-slate-100 dark:border-slate-700/30">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                                                        {getInitials(employee.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">
                                                        {employee.name}
                                                    </p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                                        {employee.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getRoleColor(employee.role)}>
                                                {employee.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">
                                            {employee.manager ? (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                                                            {getInitials(employee.manager.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm">{employee.manager.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">
                                            {employee.department || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getStatusColor(employee.status)}>
                                                {employee.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">
                                            {formatDate(employee.createdAt)}
                                        </TableCell>
                                        {canManageEmployees && (
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openEditDialog(employee)}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleToggleStatus(employee)}>
                                                            {employee.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                                        </DropdownMenuItem>
                                                        {user?.role === 'ADMIN' && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(employee)}
                                                                className="text-red-500 focus:text-red-500"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingEmployee ? 'Update employee details' :
                                user?.role === 'HR' ? 'Register a new Manager' :
                                    user?.role === 'MANAGER' ? 'Register a new Team Leader' :
                                        user?.role === 'TEAM_LEADER' ? 'Register a new Employee' :
                                            'Register a new team member'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">
                                {editingEmployee ? 'New Password (leave empty to keep current)' : 'Password'}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                                required={!editingEmployee}
                                minLength={6}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {user?.role === 'ADMIN' && (
                                            <>
                                                <SelectItem value="ADMIN">Admin</SelectItem>
                                                <SelectItem value="HR">HR</SelectItem>
                                                <SelectItem value="MANAGER">Manager</SelectItem>
                                                <SelectItem value="TEAM_LEADER">Team Leader</SelectItem>
                                                <SelectItem value="BA">Business Associate (BA)</SelectItem>
                                                <SelectItem value="PA">Personal Assistant (PA)</SelectItem>
                                                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                                            </>
                                        )}
                                        {user?.role === 'HR' && (
                                            <>
                                                <SelectItem value="BA">Business Associate (BA)</SelectItem>
                                                <SelectItem value="MANAGER">Manager</SelectItem>
                                                <SelectItem value="TEAM_LEADER">Team Leader</SelectItem>
                                                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Manager Selection for TEAM_LEADER - Only show when creating */}
                            {formData.role === 'TEAM_LEADER' && !editingEmployee && (
                                <div className="space-y-2">
                                    <Label htmlFor="managerId">Manager *</Label>
                                    <Select
                                        value={formData.managerId}
                                        onValueChange={(value) => setFormData({ ...formData, managerId: value })}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Manager" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees
                                                .filter(emp => emp.role === 'MANAGER' && emp.status === 'ACTIVE')
                                                .map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Team Leader must be assigned to a Manager
                                    </p>
                                </div>
                            )}

                            {/* Manager Selection for EMPLOYEE - Only show when creating */}
                            {formData.role === 'EMPLOYEE' && !editingEmployee && (
                                <div className="space-y-2">
                                    <Label htmlFor="managerId">Team Leader (Manager) *</Label>
                                    <Select
                                        value={formData.managerId}
                                        onValueChange={(value) => setFormData({ ...formData, managerId: value })}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Team Leader" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees
                                                .filter(emp => emp.role === 'TEAM_LEADER' && emp.status === 'ACTIVE')
                                                .map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Employee must be assigned to a Team Leader
                                    </p>
                                </div>
                            )}

                            {/* Department - Only show when not selecting manager */}
                            {(formData.role !== 'EMPLOYEE' && formData.role !== 'TEAM_LEADER' || editingEmployee) && (
                                <div className="space-y-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Select
                                        value={formData.department}
                                        onValueChange={(value) => setFormData({ ...formData, department: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Web Development (React)">Web Development (React)</SelectItem>
                                            <SelectItem value="Web Development (Python)">Web Development (Python)</SelectItem>
                                            <SelectItem value="Machine Learning & Deep Learning">Machine Learning & Deep Learning</SelectItem>
                                            <SelectItem value="Research Writing">Research Writing</SelectItem>
                                            <SelectItem value="R&D">R&D</SelectItem>
                                            <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+1 234 567 8900"
                                />
                            </div>
                            {editingEmployee && (
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <LoadingButton type="submit" loading={saving}>
                                {editingEmployee ? 'Save Changes' : 'Add Employee'}
                            </LoadingButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div >
    )
}
