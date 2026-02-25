'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, User, Calendar, Activity } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface EmployeeWorkingHours {
    id: string
    user: {
        id: string
        name: string
        email: string
        role: string
        department: string | null
    }
    checkIn: string | null
    checkOut: string | null
    workingHours: number
    overtimeHours: number
    isActive: boolean
    isOvertime: boolean
    date: string
}

interface WorkingHoursSummary {
    totalEmployeesPresent: number
    activeEmployees: number
    totalHoursToday: number
    totalOvertimeToday: number
}

export function EmployeeWorkingHoursCard() {
    const [employees, setEmployees] = useState<EmployeeWorkingHours[]>([])
    const [summary, setSummary] = useState<WorkingHoursSummary | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchWorkingHours = async () => {
            try {
                const res = await fetch('/api/attendance/working-hours')
                if (res.ok) {
                    const data = await res.json()
                    setEmployees(data.employees)
                    setSummary(data.summary)
                }
            } catch (error) {
                console.error('Failed to fetch working hours:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchWorkingHours()

        // Refresh every 60 seconds to show real-time working hours
        const interval = setInterval(fetchWorkingHours, 60000)
        return () => clearInterval(interval)
    }, [])

    const formatWorkingHours = (hours: number) => {
        const wholeHours = Math.floor(hours)
        const minutes = Math.round((hours - wholeHours) * 60)

        if (wholeHours === 0) {
            return `${minutes}m`
        }
        if (minutes === 0) {
            return `${wholeHours}h`
        }
        return `${wholeHours}h ${minutes}m`
    }

    const formatTime = (dateString: string | null) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        })
    }

    if (loading) {
        return (
            <Card className="p-6 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Employee Working Hours
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Loading...
                        </p>
                    </div>
                </div>
            </Card>
        )
    }

    return (
        <Card className="p-6 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Employee Working Hours
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Today's attendance and working hours
                    </p>
                </div>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    {summary?.totalEmployeesPresent || 0} Present
                </Badge>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-emerald-500" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Total Present
                        </p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {summary?.totalEmployeesPresent || 0}
                    </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Currently Working
                        </p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {summary?.activeEmployees || 0}
                    </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-violet-500" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Total Hours
                        </p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatWorkingHours(summary?.totalHoursToday || 0)}
                    </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-amber-500" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Total Overtime
                        </p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatWorkingHours(summary?.totalOvertimeToday || 0)}
                    </p>
                </div>
            </div>

            {/* Employee List */}
            {employees.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No employees present today</p>
                </div>
            ) : (
                <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                        {employees.map((emp) => (
                            <div
                                key={emp.id}
                                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                                            <User className="h-5 w-5 text-violet-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-medium text-slate-900 dark:text-white truncate">
                                                    {emp.user.name}
                                                </h3>
                                                {emp.isActive && (
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-green-500/10 text-green-500 border-green-500/20 text-xs"
                                                    >
                                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                                                        Active
                                                    </Badge>
                                                )}
                                                {emp.isOvertime && (
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs"
                                                    >
                                                        OT: {formatWorkingHours(emp.overtimeHours)}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {emp.user.department || emp.user.role}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right ml-4">
                                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                            {formatWorkingHours(emp.workingHours)}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            working hours
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                            Check In
                                        </p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {formatTime(emp.checkIn)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                            Check Out
                                        </p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {formatTime(emp.checkOut)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </Card>
    )
}
