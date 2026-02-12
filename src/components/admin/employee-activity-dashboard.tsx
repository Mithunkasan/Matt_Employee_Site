'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import {
    Activity,
    Clock,
    LogIn,
    LogOut,
    User,
    Users,
    Zap,
    Moon
} from 'lucide-react'
import { toast } from 'sonner'

interface AttendanceSession {
    id: string
    checkIn: string
    checkOut: string | null
    hoursWorked: number
}

interface EmployeeActivity {
    id: string
    user: {
        id: string
        name: string
        email: string
        role: string
        department: string | null
        stuckKeyAlert: boolean
        isIdle: boolean
    }
    date: string
    status: string
    totalHours: number
    sessions: AttendanceSession[]
    isOnline: boolean
    sessionCount: number
}

export function EmployeeActivityDashboard() {
    const [employees, setEmployees] = useState<EmployeeActivity[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

    const fetchEmployeeActivity = async () => {
        try {
            const res = await fetch('/api/admin/employee-activity')
            if (res.ok) {
                const data = await res.json()
                setEmployees(data.employees)
                setLastUpdate(new Date())
            } else {
                toast.error('Failed to fetch employee activity')
            }
        } catch (error) {
            console.error('Error fetching employee activity:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEmployeeActivity()

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchEmployeeActivity()
        }, 30000)

        return () => clearInterval(interval)
    }, [])

    const onlineEmployees = employees.filter(e => e.isOnline)
    const offlineEmployees = employees.filter(e => !e.isOnline)
    const totalHoursToday = employees.reduce((sum, e) => sum + e.totalHours, 0)

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    }

    const formatDuration = (hours: number) => {
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        if (h === 0) return `${m}m`
        if (m === 0) return `${h}h`
        return `${h}h ${m}m`
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <Activity className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-slate-600 dark:text-slate-400">Loading employee activity...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-emerald-100 text-sm font-medium">Online Now</p>
                            <p className="text-3xl font-bold mt-1">{onlineEmployees.length}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                            <Zap className="h-6 w-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-slate-500 to-slate-700 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-100 text-sm font-medium">Offline</p>
                            <p className="text-3xl font-bold mt-1">{offlineEmployees.length}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                            <Moon className="h-6 w-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Total Hours Today</p>
                            <p className="text-3xl font-bold mt-1">{formatDuration(totalHoursToday)}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                            <Clock className="h-6 w-6" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-violet-100 text-sm font-medium">Total Employees</p>
                            <p className="text-3xl font-bold mt-1">{employees.length}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                            <Users className="h-6 w-6" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Last Update Timestamp */}
            <div className="text-sm text-slate-500 dark:text-slate-400 text-right">
                Last updated: {lastUpdate.toLocaleTimeString()}
            </div>

            {/* Employee Activity Table */}
            <Card className="overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                            Employee Activity Monitor
                        </h2>
                        <Badge variant="outline" className="text-xs">
                            Auto-refreshes every 30s
                        </Badge>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Sessions Today</TableHead>
                            <TableHead>Total Hours</TableHead>
                            <TableHead>Login/Logout Times</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    No employee activity today
                                </TableCell>
                            </TableRow>
                        ) : (
                            employees.map((employee) => (
                                <TableRow key={employee.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                                                {employee.user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {employee.user.name}
                                                </p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    {employee.user.department || 'No Department'}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-2">
                                            <Badge
                                                variant="outline"
                                                className={employee.isOnline
                                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                                    : employee.user.isIdle
                                                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                                                        : 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20'
                                                }
                                            >
                                                <div className={`h-2 w-2 rounded-full mr-2 ${employee.isOnline ? 'bg-emerald-500 animate-pulse' :
                                                    employee.user.isIdle ? 'bg-amber-500 animate-pulse' : 'bg-slate-500'}`} />
                                                {employee.isOnline ? 'Online' : employee.user.isIdle ? 'Idle' : 'Offline'}
                                            </Badge>
                                            {employee.user.stuckKeyAlert && (
                                                <Badge variant="destructive" className="text-[10px] py-0 px-2 animate-bounce">
                                                    <Zap className="h-3 w-3 mr-1" />
                                                    KEY ALERT
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-slate-900 dark:text-white font-medium">
                                            {employee.sessionCount} {employee.sessionCount === 1 ? 'session' : 'sessions'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-slate-400" />
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {formatDuration(employee.totalHours)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-2">
                                            {employee.sessions.length === 0 ? (
                                                <p className="text-sm text-slate-500">No sessions</p>
                                            ) : (
                                                employee.sessions.map((session, index) => (
                                                    <div
                                                        key={session.id}
                                                        className="flex items-center gap-4 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                                                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                                {formatTime(session.checkIn)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <LogOut className="h-3.5 w-3.5 text-slate-600" />
                                                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                                {session.checkOut ? formatTime(session.checkOut) : (
                                                                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                                                                        Active
                                                                    </Badge>
                                                                )}
                                                            </span>
                                                        </div>
                                                        {session.checkOut && (
                                                            <span className="text-xs text-slate-500 ml-auto">
                                                                ({formatDuration(session.hoursWorked)})
                                                            </span>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
