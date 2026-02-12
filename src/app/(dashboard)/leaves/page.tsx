'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { Header } from '@/components/layout/header'
import { PageLoader } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Check, X, Calendar, User, Download } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface LeaveRequest {
    id: number
    startDate: string
    endDate: string
    reason: string
    status: string
    createdAt: string
    user: {
        id: string
        name: string
        department: string | null
        email?: string
    }
}

export default function LeaveRequestsPage() {
    const { user } = useAuth()
    const [leaves, setLeaves] = useState<LeaveRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR'

    useEffect(() => {
        fetchLeaves()
    }, [filter, selectedMonth])

    const fetchLeaves = async () => {
        try {
            const statusParam = filter === 'all' ? '' : `&status=${filter.toUpperCase()}`
            const monthParam = `&month=${selectedMonth}`
            const res = await fetch(`/api/leaves?${statusParam}${monthParam}`)
            if (res.ok) {
                const data = await res.json()
                setLeaves(data.leaves || [])
            }
        } catch (error) {
            toast.error('Failed to load leave requests')
        } finally {
            setLoading(false)
        }
    }

    const downloadCSV = () => {
        if (leaves.length === 0) {
            toast.error('No leave requests to download')
            return
        }

        // CSV Headers
        const headers = ['Employee Name', 'Department', 'Start Date', 'End Date', 'Reason', 'Status', 'Requested On']

        // Convert data to CSV rows
        const rows = leaves.map(l => [
            l.user.name,
            l.user.department || '-',
            formatDate(l.startDate),
            formatDate(l.endDate),
            l.reason.replace(/,/g, ';'),
            l.status,
            formatDate(l.createdAt)
        ])

        // Join headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n')

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `Leave_Requests_Report_${selectedMonth}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Leave report downloaded')
    }

    const handleAction = async (leaveId: number, action: 'approve' | 'reject') => {
        try {
            const res = await fetch(`/api/leaves/${leaveId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: action === 'approve' ? 'APPROVED' : 'REJECTED' }),
            })

            if (res.ok) {
                toast.success(`Leave request ${action === 'approve' ? 'approved' : 'rejected'}`)
                fetchLeaves()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to update leave request')
            }
        } catch (error) {
            toast.error('Network error')
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-green-500/10 text-green-500 border-green-500/20'
            case 'REJECTED':
                return 'bg-red-500/10 text-red-500 border-red-500/20'
            case 'PENDING':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
            default:
                return ''
        }
    }

    const stats = {
        total: leaves.length,
        pending: leaves.filter((l) => l.status === 'PENDING').length,
        approved: leaves.filter((l) => l.status === 'APPROVED').length,
        rejected: leaves.filter((l) => l.status === 'REJECTED').length,
    }

    if (loading) {
        return (
            <div className="min-h-screen">
                <Header title="Leave Requests" description="Manage employee leave requests" />
                <PageLoader />
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <Header
                title="Leave Requests"
                description={isAdmin ? 'Review and manage leave requests' : 'Your leave requests'}
            />

            <div className="p-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Pending</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                <Check className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.approved}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Approved</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                <X className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.rejected}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Rejected</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Filter & Actions Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                                <Button
                                    key={f}
                                    size="sm"
                                    variant={filter === f ? 'default' : 'ghost'}
                                    onClick={() => setFilter(f)}
                                    className={filter === f ? 'bg-[#13498a] text-white' : ''}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </Button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                            <Label className="text-sm font-medium">Month:</Label>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-transparent border-none focus:outline-none text-sm"
                            />
                        </div>
                    </div>

                    {isAdmin && (
                        <Button
                            onClick={downloadCSV}
                            className="bg-[#13498a] hover:bg-[#13498a]/90 text-white shadow-lg shadow-blue-500/10"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download CSV
                        </Button>
                    )}
                </div>

                {/* Leave Requests Table */}
                <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-200 dark:border-slate-700/50">
                                {isAdmin && <TableHead>Employee</TableHead>}
                                <TableHead>Start Date</TableHead>
                                <TableHead>End Date</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Requested</TableHead>
                                {isAdmin && <TableHead>Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaves.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isAdmin ? 7 : 5} className="text-center py-12 text-slate-500 dark:text-slate-400">
                                        No leave requests found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                leaves.map((leave) => (
                                    <TableRow key={leave.id} className="border-slate-100 dark:border-slate-700/30">
                                        {isAdmin && (
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                                                        <User className="h-4 w-4 text-violet-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white">
                                                            {leave.user.name}
                                                        </p>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                                            {leave.user.department || 'No dept'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        )}
                                        <TableCell className="text-slate-900 dark:text-white">
                                            {formatDate(leave.startDate)}
                                        </TableCell>
                                        <TableCell className="text-slate-900 dark:text-white">
                                            {formatDate(leave.endDate)}
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300 max-w-[300px] truncate">
                                            {leave.reason}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getStatusColor(leave.status)}>
                                                {leave.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">
                                            {formatDate(leave.createdAt)}
                                        </TableCell>
                                        {isAdmin && (
                                            <TableCell>
                                                {leave.status === 'PENDING' ? (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/20"
                                                            onClick={() => handleAction(leave.id, 'approve')}
                                                        >
                                                            <Check className="h-4 w-4 mr-1" />
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-500/20"
                                                            onClick={() => handleAction(leave.id, 'reject')}
                                                        >
                                                            <X className="h-4 w-4 mr-1" />
                                                            Reject
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400">-</span>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </div>
    )
}
