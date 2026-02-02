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
import { Check, X, Calendar, User } from 'lucide-react'
import { formatDate } from '@/lib/utils'
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
    }
}

export default function LeaveRequestsPage() {
    const { user } = useAuth()
    const [leaves, setLeaves] = useState<LeaveRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

    const isAdmin = user?.role === 'ADMIN'

    useEffect(() => {
        fetchLeaves()
    }, [filter])

    const fetchLeaves = async () => {
        try {
            const url = filter === 'all' ? '/api/leaves' : `/api/leaves?status=${filter.toUpperCase()}`
            const res = await fetch(url)
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

                {/* Filter Buttons */}
                <div className="flex gap-2 mb-6">
                    <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </Button>
                    <Button
                        variant={filter === 'pending' ? 'default' : 'outline'}
                        onClick={() => setFilter('pending')}
                    >
                        Pending
                    </Button>
                    <Button
                        variant={filter === 'approved' ? 'default' : 'outline'}
                        onClick={() => setFilter('approved')}
                    >
                        Approved
                    </Button>
                    <Button
                        variant={filter === 'rejected' ? 'default' : 'outline'}
                        onClick={() => setFilter('rejected')}
                    >
                        Rejected
                    </Button>
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
