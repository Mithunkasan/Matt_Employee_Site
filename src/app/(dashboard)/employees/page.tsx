'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Plus, Search, Filter, MoreHorizontal, Mail, Phone, Edit, Trash2, UserPlus, Eye, EyeOff } from 'lucide-react'
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
    designation?: string | null
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
    const [domainFilter, setDomainFilter] = useState('all')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
    const [saving, setSaving] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
        department: '',
        designation: '',
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
        if (user?.role === 'ADMIN' || user?.role === 'HR') defaultRole = 'EMPLOYEE'

        setFormData({
            name: '',
            email: '',
            password: '',
            role: defaultRole,
            department: '',
            designation: '',
            phone: '',
            status: 'ACTIVE',
            managerId: '',
        })
        setDialogOpen(true)
    }

    const openEditDialog = (employee: Employee) => {
        setEditingEmployee(employee)

        // Determine if it should show "Administrative" in the dropdown
        let managerIdValue = employee.managerId || ''
        if (!employee.managerId && employee.department === 'Administration') {
            managerIdValue = 'Administrative'
        }

        setFormData({
            name: employee.name,
            email: employee.email,
            password: '',
            role: employee.role,
            department: employee.department || '',
            designation: employee.designation || '',
            phone: employee.phone || '',
            status: employee.status,
            managerId: managerIdValue,
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

    const domainOptions = useMemo(() => {
        const uniqueDomains = Array.from(
            new Set(
                employees
                    .map((emp) => emp.department?.trim())
                    .filter((dept): dept is string => Boolean(dept))
            )
        )

        return uniqueDomains.sort((a, b) => a.localeCompare(b))
    }, [employees])

    const filteredEmployees = employees.filter((emp) => {
        const matchesSearch =
            emp.name.toLowerCase().includes(search.toLowerCase()) ||
            emp.email.toLowerCase().includes(search.toLowerCase())
        const matchesRole = roleFilter === 'all' || emp.role === roleFilter
        const matchesStatus = statusFilter === 'all' || emp.status === statusFilter
        const matchesDomain = domainFilter === 'all' || (emp.department || '') === domainFilter
        return matchesSearch && matchesRole && matchesStatus && matchesDomain
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
                            <SelectItem value="INTERN">Intern</SelectItem>
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
                    <Select value={domainFilter} onValueChange={setDomainFilter}>
                        <SelectTrigger className="w-full sm:w-[220px]">
                            <SelectValue placeholder="Domain" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Domains</SelectItem>
                            {domainOptions.map((domain) => (
                                <SelectItem key={domain} value={domain}>
                                    {domain}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {canManageEmployees && (
                        <Button onClick={openCreateDialog} className="bg-[#13498a] hover:bg-[#0f3d73] text-white">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Employee
                        </Button>
                    )}
                </div>

                {/* Employees Table */}
                <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 overflow-hidden">
                    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                        <div className="w-[1000px] md:w-full">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-200 dark:border-slate-700/50">
                                        <TableHead className="sticky left-0 bg-white dark:bg-slate-800 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[250px]">Employee</TableHead>
                                        <TableHead className="min-w-[120px]">Role</TableHead>
                                        <TableHead className="min-w-[150px]">Reporting Person</TableHead>
                                        <TableHead className="min-w-[150px]">Department</TableHead>
                                        <TableHead className="min-w-[100px]">Status</TableHead>
                                        <TableHead className="min-w-[150px]">Registered</TableHead>
                                        {canManageEmployees && <TableHead className="text-right min-w-[80px]">Actions</TableHead>}
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
                                                <TableCell className="sticky left-0 bg-white dark:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                                                                {getInitials(employee.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
                                                                {employee.name}
                                                            </p>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                                                                {employee.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={getRoleColor(employee.role)}>
                                                        {employee.role}
                                                    </Badge>
                                                    {employee.designation && (
                                                        <div className="text-xs text-slate-500 mt-1 truncate max-w-[120px]">
                                                            {employee.designation}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-slate-300">
                                                    {(employee.managerId === 'Administrative' || (!employee.manager && employee.department === 'Administration')) ? (
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Administrative</span>
                                                    ) : employee.manager ? (
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
                                                                <Button variant="ghost" size="icon" className="text-[#13498a] hover:text-[#0f3d73]">
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
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </Card>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-0 gap-0">
                    <div className="p-6">
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                                <div className="space-y-2 min-w-0">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                                <div className="space-y-2 min-w-0">
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
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="••••••••"
                                        required={!editingEmployee}
                                        minLength={6}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                                <div className="space-y-2 min-w-0">
                                    <Label htmlFor="department">Domain (Team)</Label>
                                    <Select
                                        value={formData.department}
                                        onValueChange={(value) => {
                                            const nextRole = formData.role === 'INTERN' ? 'INTERN' : 'EMPLOYEE'
                                            const autoDesignation =
                                                value === 'Data Analytics Team'
                                                    ? (nextRole === 'INTERN' ? 'Intern' : 'Data Analyst')
                                                    : ''

                                            setFormData(prev => ({
                                                ...prev,
                                                department: value,
                                                designation: autoDesignation,
                                                managerId: ''
                                            }))
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Domain" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Fullstack Team">Fullstack Team</SelectItem>
                                            <SelectItem value="Artificial Intelligence Team">AI Team</SelectItem>
                                            <SelectItem value="Data Analytics Team">Data Analytics</SelectItem>
                                            <SelectItem value="Research & Development Team">R&D Team</SelectItem>
                                            <SelectItem value="Hardware Development Team">Hardware Development</SelectItem>
                                            <SelectItem value="Project Development Team">Project Development</SelectItem>
                                            <SelectItem value="Digital Marketing Team">Digital Marketing</SelectItem>
                                            <SelectItem value="Administration">Administration / Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 min-w-0">
                                    <Label htmlFor="role">Role</Label>
                                    <Select
                                        value={formData.role === 'INTERN' ? 'INTERN' : 'EMPLOYEE'}
                                        onValueChange={(value) => {
                                            const selectedRole = value as 'EMPLOYEE' | 'INTERN'
                                            const autoDesignation =
                                                formData.department === 'Data Analytics Team'
                                                    ? (selectedRole === 'INTERN' ? 'Intern' : 'Data Analyst')
                                                    : formData.designation

                                            setFormData(prev => ({
                                                ...prev,
                                                role: selectedRole,
                                                designation: autoDesignation,
                                                managerId: ''
                                            }))
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EMPLOYEE">Employee</SelectItem>
                                            <SelectItem value="INTERN">Intern</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                                <div className="space-y-2 min-w-0">
                                    <Label htmlFor="designation">Designation</Label>
                                    <Select
                                        value={formData.designation}
                                        onValueChange={(value) => {
                                            let role = formData.role
                                            let managerId = ''

                                            // Auto-derive DB Role from Designation
                                            if (value === 'Manager') role = 'MANAGER'
                                            else if (value === 'Team Leader') role = 'TEAM_LEADER'
                                            else if (value === 'Team Coordinator') role = 'TEAM_COORDINATOR'
                                            else if (value === 'HR') role = 'HR'
                                            else if (value === 'Business Associate') role = 'BA'
                                            else if (value === 'Intern') role = 'INTERN'
                                            else role = formData.role === 'INTERN' ? 'INTERN' : 'EMPLOYEE'

                                            // Auto-fill manager for certain rules
                                            if (['Manager', 'HR', 'Business Associate'].includes(value)) {
                                                managerId = 'Administrative'
                                            }

                                            setFormData(prev => ({ ...prev, designation: value, role, managerId }))
                                        }}
                                        disabled={!formData.department}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Designation" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(() => {
                                                const dept = formData.department
                                                if (dept === "Research & Development Team") return ["Manager", "Team Leader", "Team Coordinator", "Research Analyst", "Trainee"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)
                                                if (dept === "Fullstack Team") return ["Manager", "Team Leader", "Junior Web Developer", "Intern"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)
                                                if (dept === "Artificial Intelligence Team") return ["Team Leader", "Junior Web Developer", "Intern"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)
                                                if (dept === "Data Analytics Team") return ["Team Leader", "Team Coordinator", "Data Analyst", "Intern"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)
                                                if (dept === "Hardware Development Team") return ["Team Leader", "Hardware Developer", "Intern"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)
                                                if (dept === "Project Development Team") return ["Team Leader", "Developer", "Intern"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)
                                                if (dept === "Digital Marketing Team") return ["Manager", "Team Leader", "Marketing Executive", "Intern"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)
                                                if (dept === "Administration") return ["HR", "HR Trainee", "Business Associate"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)
                                                return null
                                            })()}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 min-w-0">
                                    <Label htmlFor="managerId">Reporting To *</Label>
                                    <Select
                                        value={formData.managerId}
                                        onValueChange={(value) => setFormData({ ...formData, managerId: value })}
                                        disabled={!formData.designation}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Reporting Person" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Administrative">Administrative</SelectItem>
                                            {employees
                                                .filter(emp => {
                                                    const d = formData.designation
                                                    const dept = formData.department

                                                    // 🔹 R&D Logic
                                                    if (dept === 'Research & Development Team') {
                                                        if (d === 'Team Leader') return emp.designation === 'Manager' && emp.department === dept
                                                        if (d === 'Team Coordinator') return emp.designation === 'Team Leader' && emp.department === dept
                                                        if (d === 'Research Analyst' || d === 'Trainee' || d === 'Intern') {
                                                            return (emp.designation === 'Team Coordinator' || emp.designation === 'Team Leader') && emp.department === dept
                                                        }
                                                    }
                                                    // 🔹 Fullstack Logic
                                                    if (dept === 'Fullstack Team') {
                                                        if (d === 'Team Leader') return emp.designation === 'Manager' && emp.department === dept
                                                        if (d === 'Junior Web Developer' || d === 'Intern') return emp.designation === 'Team Leader' && emp.department === dept
                                                    }
                                                    // 🔹 AI Logic
                                                    if (dept === 'Artificial Intelligence Team') {
                                                        if (d === 'Team Leader') return emp.designation === 'Manager' && (emp.department === 'Fullstack Team' || emp.department === 'Artificial Intelligence Team')
                                                        if (d === 'Junior Web Developer' || d === 'Intern') return emp.designation === 'Team Leader' && emp.department === dept
                                                    }
                                                    // 🔹 DA Logic
                                                    if (dept === 'Data Analytics Team') {
                                                        if (d === 'Team Leader') return emp.role === 'MANAGER' || (emp.designation === 'Manager')
                                                        if (d === 'Team Coordinator') return emp.designation === 'Team Leader' && emp.department === dept
                                                        if (d === 'Data Analyst' || d === 'Intern') return emp.designation === 'Team Leader' && emp.department === dept
                                                    }
                                                    // 🔹 Hardware Logic
                                                    if (dept === 'Hardware Development Team') {
                                                        if (d === 'Hardware Developer' || d === 'Intern') return emp.designation === 'Team Leader' && emp.department === dept
                                                    }
                                                    // 🔹 Project Logic
                                                    if (dept === 'Project Development Team') {
                                                        if (d === 'Developer' || d === 'Intern') return emp.designation === 'Team Leader' && emp.department === dept
                                                    }
                                                    // 🔹 Marketing Logic
                                                    if (dept === 'Digital Marketing Team') {
                                                        if (d === 'Team Leader') return emp.designation === 'Manager' && emp.department === dept
                                                        if (d === 'Marketing Executive' || d === 'Intern') return emp.designation === 'Team Leader' && emp.department === dept
                                                    }
                                                    // 🔹 Admin Logic
                                                    if (dept === 'Administration') {
                                                        if (d === 'HR Trainee') return emp.designation === 'HR'
                                                    }

                                                    return false
                                                })
                                                .map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.name} ({emp.designation})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                                <div className="space-y-2 min-w-0">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+1 234 567 8900"
                                    />
                                </div>
                                {editingEmployee && (
                                    <div className="space-y-2 min-w-0">
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

                            <DialogFooter className="mt-6 sticky bottom-0 bg-white dark:bg-slate-900 pt-4 border-t">
                                <Button type="button" onClick={() => setDialogOpen(false)} className="bg-[#13498a] hover:bg-[#0f3d73] text-white">
                                    Cancel
                                </Button>
                                <LoadingButton type="submit" loading={saving} className="bg-[#13498a] hover:bg-[#0f3d73] text-white">
                                    {editingEmployee ? 'Save Changes' : 'Add Employee'}
                                </LoadingButton>
                            </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    )
}
