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
import { Check, Clock3, X } from 'lucide-react'
import { toast } from 'sonner'

interface OvertimeRequest {
    id: string
    requestDate: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    createdAt: string
    user: {
        id: string
        name: string
        email: string
        department: string | null
    }
}

function getStatusClass(status: OvertimeRequest['status']) {
    if (status === 'APPROVED') return 'bg-green-500/10 text-green-600 border-green-500/20'
    if (status === 'REJECTED') return 'bg-red-500/10 text-red-600 border-red-500/20'
    return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString()
}

export default function OvertimeRequestsPage() {
    const { user } = useAuth()
    const [requests, setRequests] = useState<OvertimeRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

    const isAdmin = user?.role === 'ADMIN'

    const fetchRequests = async () => {
        try {
            const statusParam = filter === 'all' ? '' : `?status=${filter.toUpperCase()}`
            const res = await fetch(`/api/overtime-requests${statusParam}`)
            if (!res.ok) throw new Error('Failed to load requests')
            const data = await res.json()
            setRequests(data.requests || [])
        } catch (error) {
            toast.error('Failed to load overtime requests')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [filter])

    const updateRequestStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            const res = await fetch(`/api/overtime-requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data?.error || 'Failed to update request')
            }

            toast.success(`Request ${status === 'APPROVED' ? 'approved' : 'rejected'}`)
            fetchRequests()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Network error')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen">
                <Header title="Overtime Requests" description="Manage after-hours login approvals" />
                <PageLoader />
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <Header
                title="Overtime Requests"
                description={isAdmin ? 'Approve or reject after-hours login access' : 'Track your after-hours login requests'}
            />

            <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Clock3 className="h-5 w-5 text-blue-500" />
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
                                <Clock3 className="h-5 w-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {requests.filter((r) => r.status === 'PENDING').length}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Pending</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                        <Button
                            key={status}
                            variant={filter === status ? 'default' : 'outline'}
                            className="capitalize"
                            onClick={() => setFilter(status)}
                        >
                            {status}
                        </Button>
                    ))}
                </div>

                <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-200 dark:border-slate-700/50">
                                {isAdmin && <TableHead>Employee</TableHead>}
                                <TableHead>Request Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Requested On</TableHead>
                                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={isAdmin ? 5 : 3}
                                        className="text-center py-12 text-slate-500 dark:text-slate-400"
                                    >
                                        No overtime requests found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                requests.map((request) => (
                                    <TableRow key={request.id} className="border-slate-100 dark:border-slate-700/30">
                                        {isAdmin && (
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{request.user.name}</p>
                                                    <p className="text-xs text-slate-500">{request.user.email}</p>
                                                </div>
                                            </TableCell>
                                        )}
                                        <TableCell>{formatDate(request.requestDate)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getStatusClass(request.status)}>
                                                {request.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                                        {isAdmin && (
                                            <TableCell className="text-right">
                                                {request.status === 'PENDING' ? (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/20"
                                                            onClick={() => updateRequestStatus(request.id, 'APPROVED')}
                                                        >
                                                            <Check className="h-4 w-4 mr-1" />
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-500/20"
                                                            onClick={() => updateRequestStatus(request.id, 'REJECTED')}
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
