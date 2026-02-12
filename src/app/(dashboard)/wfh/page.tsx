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
import { Check, X, Building2, User, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { WfhRequestButton } from '@/components/shared/wfh-request-button'

interface WfhRequest {
    id: string
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

export default function WfhRequestsPage() {
    const { user } = useAuth()
    const [requests, setRequests] = useState<WfhRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

    const canManage = user?.role === 'ADMIN' || user?.role === 'HR'

    useEffect(() => {
        fetchRequests()
    }, [filter])

    const fetchRequests = async () => {
        try {
            const url = filter === 'all' ? '/api/wfh' : `/api/wfh?status=${filter.toUpperCase()}`
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setRequests(data.requests || [])
            }
        } catch (error) {
            toast.error('Failed to load WFH requests')
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
        try {
            const res = await fetch(`/api/wfh/${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: action === 'approve' ? 'APPROVED' : 'REJECTED' }),
            })

            if (res.ok) {
                toast.success(`WFH request ${action === 'approve' ? 'approved' : 'rejected'}`)
                fetchRequests()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to update request')
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

    if (loading) {
        return (
            <div className="min-h-screen">
                <Header title="WFH Requests" description="Manage Work From Home requests" />
                <PageLoader />
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <div className="flex items-center justify-between px-6 pt-6">
                <Header
                    title="WFH Requests"
                    description={canManage ? 'Review and manage employee WFH requests' : 'Your WFH requests'}
                />
                {!canManage && <WfhRequestButton />}
                {user?.role === 'BA' && <WfhRequestButton />}
            </div>

            <div className="p-6">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{requests.length}</p>
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
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {requests.filter(r => r.status === 'PENDING').length}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Pending</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
                        <Button
                            key={s}
                            variant={filter === s ? 'default' : 'outline'}
                            onClick={() => setFilter(s)}
                            className="capitalize"
                        >
                            {s}
                        </Button>
                    ))}
                </div>

                {/* Requests Table */}
                <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/50">
                                {canManage && <TableHead>Employee</TableHead>}
                                <TableHead>Period</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Requested On</TableHead>
                                {canManage && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={canManage ? 6 : 4} className="text-center py-20 text-slate-500">
                                        No WFH requests found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                requests.map((req) => (
                                    <TableRow key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors border-slate-100 dark:border-slate-700/30">
                                        {canManage && (
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                        {req.user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white">{req.user.name}</p>
                                                        <p className="text-xs text-slate-500">{req.user.department || 'No Dept'}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span className="font-medium text-slate-900 dark:text-white">
                                                    {formatDate(req.startDate)} - {formatDate(req.endDate)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[300px] truncate text-slate-600 dark:text-slate-300">
                                            {req.reason}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getStatusColor(req.status)}>
                                                {req.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-500">
                                            {formatDate(req.createdAt)}
                                        </TableCell>
                                        {canManage && (
                                            <TableCell className="text-right">
                                                {req.status === 'PENDING' ? (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/20"
                                                            onClick={() => handleAction(req.id, 'approve')}
                                                        >
                                                            <Check className="h-4 w-4 mr-1" />
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-500/20"
                                                            onClick={() => handleAction(req.id, 'reject')}
                                                        >
                                                            <X className="h-4 w-4 mr-1" />
                                                            Reject
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400">Processed</span>
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
