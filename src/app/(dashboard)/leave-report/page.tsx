'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { PageLoader } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { FileDown, Download, Calendar as CalendarIcon, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-context'

interface LeaveReportUser {
    id: string
    name: string
    department: string | null
    role: string
    leaveDays: number
    requests: Array<{
        id: number
        startDate: string
        endDate: string
        reason: string
    }>
}

export default function LeaveReportPage() {
    const { user } = useAuth()
    const [reportData, setReportData] = useState<LeaveReportUser[]>([])
    const [loading, setLoading] = useState(true)
    const [reportType, setReportType] = useState<'monthly' | 'weekly'>('monthly')

    // Default to current month
    const currentMonth = new Date().toISOString().slice(0, 7)
    // Default to start of current week (Monday)
    const getStartOfWeek = (d: Date) => {
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        return new Date(d.setDate(diff)).toISOString().slice(0, 10)
    }
    const [selectedDate, setSelectedDate] = useState(currentMonth)

    const canView = user?.role === 'ADMIN' || user?.role === 'HR'

    useEffect(() => {
        if (canView) {
            fetchReport()
        }
    }, [selectedDate, reportType])

    const fetchReport = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/leave-report?type=${reportType}&date=${selectedDate}`)
            if (res.ok) {
                const data = await res.json()
                setReportData(data.reportData || [])
            } else {
                toast.error('Failed to fetch leave report')
            }
        } catch (error) {
            toast.error('Network error')
        } finally {
            setLoading(false)
        }
    }

    const downloadCSV = () => {
        const headers = ['Employee', 'Department', 'Leave Days', 'Requests']
        const csvRows = [
            headers.join(','),
            ...reportData.map(emp => [
                `"${emp.name}"`,
                `"${emp.department || '-'}"`,
                emp.leaveDays,
                `"${emp.requests.length} requests"`
            ].join(','))
        ]

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Leave_Report_${reportType}_${selectedDate}.csv`
        a.click()
    }

    if (!canView) {
        return <div className="p-6 text-center">Unauthorized</div>
    }

    return (
        <div className="min-h-screen pb-10">
            <Header
                title="Leave Report"
                description={`View ${reportType} leave summaries for all employees`}
            />

            <div className="p-6">
                <Card className="p-4 mb-6 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 uppercase font-bold">Report Type</Label>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant={reportType === 'monthly' ? 'default' : 'outline'}
                                        onClick={() => {
                                            setReportType('monthly')
                                            setSelectedDate(currentMonth)
                                        }}
                                    >
                                        Monthly
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={reportType === 'weekly' ? 'default' : 'outline'}
                                        onClick={() => {
                                            setReportType('weekly')
                                            setSelectedDate(getStartOfWeek(new Date()))
                                        }}
                                    >
                                        Weekly
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 uppercase font-bold">
                                    {reportType === 'monthly' ? 'Select Month' : 'Select Week (Starts on)'}
                                </Label>
                                <input
                                    type={reportType === 'monthly' ? 'month' : 'date'}
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="block px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button onClick={downloadCSV} variant="outline" className="border-slate-200 dark:border-slate-700">
                                <Download className="h-4 w-4 mr-2" />
                                CSV Export
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                    <ScrollArea className="w-full">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead className="text-center">Leave Days</TableHead>
                                    <TableHead>Active Leaves in Period</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-20">
                                            <PageLoader />
                                        </TableCell>
                                    </TableRow>
                                ) : reportData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-20 text-slate-500">
                                            No data found for this period
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reportData.map((emp) => (
                                        <TableRow key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                            <TableCell className="font-medium text-slate-900 dark:text-white">
                                                {emp.name}
                                            </TableCell>
                                            <TableCell className="text-slate-500">
                                                {emp.department || '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={emp.leaveDays > 0 ? 'default' : 'secondary'} className={emp.leaveDays > 2 ? 'bg-red-500 hover:bg-red-600' : ''}>
                                                    {emp.leaveDays} {emp.leaveDays === 1 ? 'day' : 'days'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {emp.requests.map((req, idx) => (
                                                        <div key={idx} className="text-xs bg-slate-100 dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700">
                                                            <span className="font-bold">{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</span>
                                                            <p className="text-slate-500 truncate">{req.reason}</p>
                                                        </div>
                                                    ))}
                                                    {emp.requests.length === 0 && <span className="text-slate-400 text-xs">No leaves</span>}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </Card>
            </div>
        </div>
    )
}
