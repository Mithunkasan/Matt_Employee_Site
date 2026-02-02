'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { Header } from '@/components/layout/header'
import { PageLoader } from '@/components/shared/loading-spinner'
import { LoadingButton } from '@/components/shared/loading-button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { CalendarCheck, Clock, LogIn, LogOut, CheckCircle2, XCircle, Calendar } from 'lucide-react'
import { formatDate, getStatusColor } from '@/lib/utils'
import { toast } from 'sonner'

interface Attendance {
    id: string
    date: string
    status: string
    checkIn?: string | null
    checkOut?: string | null
    workingHours?: number | null
    notes?: string | null
    user: {
        id: string
        name: string
        email?: string
        department?: string
    }
}

export default function AttendancePage() {
    const { user } = useAuth()
    const [attendances, setAttendances] = useState<Attendance[]>([])
    const [loading, setLoading] = useState(true)
    const [markDialogOpen, setMarkDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null)
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })

    // Form state
    const [formData, setFormData] = useState({
        status: 'PRESENT' as string,
        notes: '',
    })

    const canViewAll = user?.role === 'ADMIN' || user?.role === 'HR'

    useEffect(() => {
        fetchAttendances()
    }, [selectedMonth])

    const fetchAttendances = async () => {
        try {
            const url = canViewAll
                ? `/api/attendance?month=${selectedMonth}`
                : `/api/attendance?month=${selectedMonth}`
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setAttendances(data.attendances)

                // Check if today's attendance exists
                const today = new Date().toISOString().split('T')[0]
                const todayRecord = data.attendances.find(
                    (a: Attendance) => a.date.split('T')[0] === today && a.user.id === user?.userId
                )
                setTodayAttendance(todayRecord || null)
            }
        } catch (error) {
            toast.error('Failed to load attendance')
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAttendance = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                toast.success('Attendance marked')
                setMarkDialogOpen(false)
                fetchAttendances()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to mark attendance')
            }
        } catch (error) {
            toast.error('Network error')
        } finally {
            setSaving(false)
        }
    }

    const handleCheckout = async () => {
        if (!todayAttendance) return

        try {
            const res = await fetch('/api/attendance/checkout', {
                method: 'POST',
            })

            if (res.ok) {
                const data = await res.json()
                toast.success(`Checked out successfully! Total hours today: ${data.attendance.totalHours?.toFixed(2)} hours`)
                fetchAttendances()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to checkout')
            }
        } catch (error) {
            toast.error('Network error')
        }
    }

    // Calculate stats
    const myAttendances = attendances.filter((a) => a.user.id === user?.userId)
    const presentDays = myAttendances.filter((a) => a.status === 'PRESENT').length
    const absentDays = myAttendances.filter((a) => a.status === 'ABSENT').length
    const leaveDays = myAttendances.filter((a) => a.status === 'LEAVE').length

    if (loading) {
        return (
            <div className="min-h-screen">
                <Header title="Attendance" description="Track your attendance" />
                <PageLoader />
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <Header
                title="Attendance"
                description={canViewAll ? 'Team attendance overview' : 'Track your work hours'}
            />

            <div className="p-6">
                {/* Today's Status Card */}
                <Card className="p-6 mb-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-1">Today's Attendance</h2>
                            <p className="text-slate-400 text-sm">
                                {new Date().toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </p>
                        </div>

                        {todayAttendance ? (
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={getStatusColor(todayAttendance.status)}
                                    >
                                        {todayAttendance.status}
                                    </Badge>
                                    {todayAttendance.checkIn && (
                                        <span className="text-sm text-slate-400">
                                            <LogIn className="inline h-4 w-4 mr-1" />
                                            {new Date(todayAttendance.checkIn).toLocaleTimeString()}
                                        </span>
                                    )}
                                    {todayAttendance.checkOut && (
                                        <span className="text-sm text-slate-400">
                                            <LogOut className="inline h-4 w-4 mr-1" />
                                            {new Date(todayAttendance.checkOut).toLocaleTimeString()}
                                        </span>
                                    )}
                                </div>
                                {todayAttendance.status === 'PRESENT' && !todayAttendance.checkOut && (
                                    <Button onClick={handleCheckout} variant="secondary">
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Check Out
                                    </Button>
                                )}
                            </div>
                        ) : (
                            // Hide Mark Attendance button for Admin users
                            user?.role !== 'ADMIN' && (
                                <Button
                                    onClick={() => setMarkDialogOpen(true)}
                                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                                >
                                    <CalendarCheck className="h-4 w-4 mr-2" />
                                    Mark Attendance
                                </Button>
                            )
                        )}
                    </div>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{presentDays}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Present</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                <XCircle className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{absentDays}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Absent</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{leaveDays}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Leave</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-violet-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {Math.round((presentDays / (presentDays + absentDays || 1)) * 100)}%
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Rate</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Month Filter */}
                <div className="flex items-center gap-4 mb-6">
                    <Label className="text-slate-600 dark:text-slate-300">Month:</Label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                </div>

                {/* Attendance Table */}
                <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-200 dark:border-slate-700/50">
                                {canViewAll && <TableHead>Employee</TableHead>}
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Check In</TableHead>
                                <TableHead>Check Out</TableHead>
                                <TableHead>Hours</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attendances.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={canViewAll ? 7 : 6} className="text-center py-12 text-slate-500 dark:text-slate-400">
                                        No attendance records for this month
                                    </TableCell>
                                </TableRow>
                            ) : (
                                attendances.map((attendance) => (
                                    <TableRow key={attendance.id} className="border-slate-100 dark:border-slate-700/30">
                                        {canViewAll && (
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">
                                                        {attendance.user.name}
                                                    </p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                                        {attendance.user.department || '-'}
                                                    </p>
                                                </div>
                                            </TableCell>
                                        )}
                                        <TableCell className="text-slate-900 dark:text-white">
                                            {formatDate(attendance.date)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getStatusColor(attendance.status)}>
                                                {attendance.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">
                                            {attendance.checkIn
                                                ? new Date(attendance.checkIn).toLocaleTimeString()
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">
                                            {attendance.checkOut
                                                ? new Date(attendance.checkOut).toLocaleTimeString()
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-slate-900 dark:text-white font-medium">
                                            {attendance.workingHours
                                                ? `${attendance.workingHours.toFixed(2)}h`
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                                            {attendance.notes || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* Mark Attendance Dialog */}
            <Dialog open={markDialogOpen} onOpenChange={setMarkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mark Attendance</DialogTitle>
                        <DialogDescription>
                            Record your attendance for today
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleMarkAttendance} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PRESENT">Present</SelectItem>
                                    <SelectItem value="LEAVE">Leave</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes (Optional)</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Any additional notes..."
                                rows={3}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setMarkDialogOpen(false)}>
                                Cancel
                            </Button>
                            <LoadingButton type="submit" loading={saving}>
                                Mark Attendance
                            </LoadingButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
