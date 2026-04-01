'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { Header } from '@/components/layout/header'
import { PageLoader } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { FileDown, Download } from 'lucide-react'
import { toast } from 'sonner'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { cn } from '@/lib/utils'
import { isHrLike } from '@/lib/auth'

interface Session {
    checkIn: string
    checkOut: string | null
    hoursWorked: number
}

interface DailyAttendance {
    id?: string
    status: string
    totalHours: number
    sessions: Session[]
    reason?: string
}

interface EmployeeReport {
    id: string
    name: string
    email: string
    department?: string
    role: string
    dailyData: Record<string, DailyAttendance>
    totalMonthlyHours: number
    presentDays: number
    absentDays: number
    leaveDays: number
    absentOrLeaveDays: number
}

function pad2(value: number) {
    return value.toString().padStart(2, '0')
}

function formatDateInputValue(date: Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function formatMonthInputValue(date: Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`
}

function formatHeaderLabel(dateKey: string, reportType: 'monthly' | 'weekly') {
    const date = new Date(`${dateKey}T00:00:00`)
    return reportType === 'monthly'
        ? date.getDate().toString()
        : `${date.toLocaleDateString('default', { weekday: 'short' })} ${date.getDate()}`
}

function formatLongDate(dateKey: string) {
    return new Date(`${dateKey}T00:00:00`).toLocaleDateString('default', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

function getDisplayStatus(attendance?: DailyAttendance) {
    if (!attendance) return ''
    if (attendance.status === 'LEAVE') return 'L'
    if (attendance.status === 'ABSENT') return 'A'
    return 'P'
}

export default function AttendanceReportPage() {
    const { user } = useAuth()
    const isHrUser = isHrLike(user?.role ?? 'EMPLOYEE', user?.designation ?? null)
    const [loading, setLoading] = useState(true)
    const [reportData, setReportData] = useState<EmployeeReport[]>([])
    const [reportDates, setReportDates] = useState<string[]>([])
    const [reportType, setReportType] = useState<'monthly' | 'weekly'>('monthly')

    const currentMonth = formatMonthInputValue(new Date())
    const getStartOfWeek = (inputDate: Date) => {
        const date = new Date(inputDate)
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        date.setDate(diff)
        return formatDateInputValue(date)
    }

    const [selectedDate, setSelectedDate] = useState(currentMonth)

    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedDayDetail, setSelectedDayDetail] = useState<{
        employeeName: string
        date: string
        attendance: DailyAttendance
    } | null>(null)
    const [empSummaryOpen, setEmpSummaryOpen] = useState(false)
    const [selectedEmpSummary, setSelectedEmpSummary] = useState<EmployeeReport | null>(null)

    const canView = user?.role === 'ADMIN' || isHrUser
    const getAbsentLeaveCount = (emp: EmployeeReport) =>
        emp.absentOrLeaveDays
        ?? Object.values(emp.dailyData || {}).filter((d: any) => d.status === 'ABSENT' || d.status === 'LEAVE').length

    useEffect(() => {
        if (canView) {
            fetchReport()
        }
    }, [canView, selectedDate, reportType])

    const fetchReport = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/admin/attendance-report?type=${reportType}&date=${selectedDate}`)
            if (res.ok) {
                const data = await res.json()
                setReportData(data.reportData || [])
                setReportDates(data.reportDates || [])
            } else {
                toast.error('Failed to load report')
            }
        } catch {
            toast.error('Network error')
        } finally {
            setLoading(false)
        }
    }

    const downloadCSV = () => {
        let csv = `Attendance Report (${reportType}) - ${selectedDate}\n`
        csv += 'Employee,Department,'
        reportDates.forEach((dateKey) => {
            csv += `${formatHeaderLabel(dateKey, reportType)},`
        })
        csv += 'Total Hours,Present,A/L\n'

        reportData.forEach(emp => {
            csv += `"${emp.name}","${emp.department || '-'}",`
            reportDates.forEach((dateKey) => {
                csv += `${getDisplayStatus(emp.dailyData[dateKey])},`
            })
            csv += `${emp.totalMonthlyHours.toFixed(2)},${emp.presentDays},${getAbsentLeaveCount(emp)}\n`
        })

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `Attendance_Report_${reportType}_${selectedDate}.csv`)
        link.click()
    }

    const downloadPDF = () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a3',
        })

        doc.setFontSize(18)
        doc.text(`Attendance Report (${reportType}) - ${selectedDate}`, 14, 15)
        doc.setFontSize(11)
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22)

        const headers = [[
            'Employee',
            'Department',
            ...reportDates.map((dateKey) => formatHeaderLabel(dateKey, reportType)),
            'Total',
            'P',
            'A/L',
        ]]

        const body = reportData.map(emp => {
            const row = [emp.name, emp.department || '-']
            reportDates.forEach((dateKey) => {
                row.push(getDisplayStatus(emp.dailyData[dateKey]))
            })
            row.push(
                emp.totalMonthlyHours.toFixed(1),
                emp.presentDays.toString(),
                getAbsentLeaveCount(emp).toString()
            )
            return row
        })

        autoTable(doc, {
            head: headers,
            body,
            startY: 30,
            styles: { fontSize: 8, cellPadding: 1 },
            headStyles: { fillColor: [79, 70, 229] },
        })

        doc.save(`Attendance_Report_${reportType}_${selectedDate}.pdf`)
    }

    const handleCellClick = (empName: string, dateKey: string, attendance: DailyAttendance) => {
        setSelectedDayDetail({
            employeeName: empName,
            date: formatLongDate(dateKey),
            attendance,
        })
        setDetailOpen(true)
    }

    const handleEmployeeClick = (emp: EmployeeReport) => {
        setSelectedEmpSummary(emp)
        setEmpSummaryOpen(true)
    }

    if (!canView) return <div className="p-4 sm:p-6 text-center">Unauthorized</div>

    return (
        <div className="min-h-screen pb-10">
            <Header
                title="Attendance Report"
                description={`View ${reportType} attendance for your team`}
            />

            <div className="p-4 sm:p-6">
                <Card className="p-4 mb-6 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 uppercase font-bold">Type</Label>
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
                                <Label className="text-xs text-slate-500 uppercase font-bold">Date</Label>
                                <input
                                    type={reportType === 'monthly' ? 'month' : 'date'}
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="block px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                            <div className="hidden lg:flex items-center gap-4 ml-6 pl-6 border-l border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 rounded bg-slate-100 dark:bg-slate-900 border flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-300 font-bold">A</div>
                                    <span className="text-xs text-slate-500">Absent</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 rounded bg-orange-50 dark:bg-orange-900/10 border border-orange-100 flex items-center justify-center text-[10px] text-orange-600 font-bold">L</div>
                                    <span className="text-xs text-slate-500">Leave</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 rounded bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 flex items-center justify-center text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">P</div>
                                    <span className="text-xs text-slate-500">Present</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button onClick={downloadCSV} variant="outline">
                                <Download className="h-4 w-4 mr-2" />
                                CSV
                            </Button>
                            <Button onClick={downloadPDF} className="bg-violet-600 hover:bg-violet-700 text-white border-none">
                                <FileDown className="h-4 w-4 mr-2" />
                                PDF
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 overflow-hidden flex-1">
                    <ScrollArea className="w-full h-[calc(100vh-280px)] rounded-md border">
                        <div className="min-w-max">
                            <Table className="whitespace-nowrap relative min-w-max">
                                <TableHeader className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 shadow-sm">
                                    <TableRow className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <TableHead className="sticky left-0 top-0 z-30 bg-slate-50 dark:bg-slate-900 min-w-[180px] border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Employee</TableHead>
                                        <TableHead className="min-w-[100px] bg-slate-50 dark:bg-slate-900">Dept</TableHead>
                                        {reportDates.map((dateKey) => (
                                            <TableHead
                                                key={dateKey}
                                                className={`text-center ${reportType === 'monthly' ? 'min-w-[40px]' : 'min-w-[60px]'} text-[10px] bg-slate-50 dark:bg-slate-900`}
                                            >
                                                {formatHeaderLabel(dateKey, reportType)}
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-center min-w-[80px] border-l bg-slate-50 dark:bg-slate-900">Total</TableHead>
                                        <TableHead className="text-center min-w-[60px] bg-slate-50 dark:bg-slate-900">P</TableHead>
                                        <TableHead className="text-center min-w-[60px] bg-slate-50 dark:bg-slate-900">A/L</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={reportDates.length + 5} className="text-center py-20">
                                                <PageLoader />
                                            </TableCell>
                                        </TableRow>
                                    ) : reportData.map((emp) => (
                                        <TableRow key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                            <TableCell
                                                className="sticky left-0 bg-white dark:bg-slate-800 border-r font-medium cursor-pointer hover:text-violet-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10"
                                                onClick={() => handleEmployeeClick(emp)}
                                            >
                                                {emp.name}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500">{emp.department || '-'}</TableCell>
                                            {reportDates.map((dateKey) => {
                                                const dayData = emp.dailyData[dateKey]
                                                const displayStatus = getDisplayStatus(dayData)
                                                const canOpenDetail = !!dayData && dayData.sessions.length > 0

                                                return (
                                                    <TableCell
                                                        key={dateKey}
                                                        className={`text-center p-0 border-r ${canOpenDetail ? 'cursor-pointer hover:bg-violet-50' : ''}`}
                                                        onClick={() => canOpenDetail && handleCellClick(emp.name, dateKey, dayData)}
                                                    >
                                                        <div className={cn(
                                                            "py-3 px-1 text-[11px] font-bold",
                                                            dayData?.status === 'PRESENT' && "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400",
                                                            dayData?.status === 'WFH' && "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400",
                                                            dayData?.status === 'ABSENT' && "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300",
                                                            dayData?.status === 'LEAVE' && "bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400"
                                                        )}>
                                                            {displayStatus}
                                                        </div>
                                                    </TableCell>
                                                )
                                            })}
                                            <TableCell className="text-center font-bold border-l">{emp.totalMonthlyHours.toFixed(1)}h</TableCell>
                                            <TableCell className="text-center font-bold text-emerald-600">{emp.presentDays}</TableCell>
                                            <TableCell className="text-center font-bold text-orange-500">{getAbsentLeaveCount(emp)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </Card>
            </div>

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Details for {selectedDayDetail?.date}</DialogTitle>
                    </DialogHeader>
                    {selectedDayDetail && (
                        <div className="space-y-4">
                            {selectedDayDetail.attendance.sessions.map((s, i) => (
                                <div key={i} className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                    <span>{new Date(s.checkIn).toLocaleTimeString()} - {s.checkOut ? new Date(s.checkOut).toLocaleTimeString() : 'Working'}</span>
                                    <b>{s.hoursWorked.toFixed(2)}h</b>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={empSummaryOpen} onOpenChange={setEmpSummaryOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Summary: {selectedEmpSummary?.name}</DialogTitle>
                    </DialogHeader>
                    {selectedEmpSummary && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Card className="p-4 text-center bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50">
                                <b className="text-xl text-blue-600 dark:text-blue-400">{selectedEmpSummary.totalMonthlyHours.toFixed(1)}h</b>
                                <p className="text-xs text-slate-500 uppercase font-bold mt-1">Total Hours</p>
                            </Card>
                            <Card className="p-4 text-center bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50">
                                <b className="text-xl text-emerald-600 dark:text-emerald-400">{selectedEmpSummary.presentDays}</b>
                                <p className="text-xs text-slate-500 uppercase font-bold mt-1">Present Days</p>
                            </Card>
                            <Card className="p-4 text-center bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/50">
                                <b className="text-xl text-orange-600 dark:text-orange-400">{getAbsentLeaveCount(selectedEmpSummary)}</b>
                                <p className="text-xs text-slate-500 uppercase font-bold mt-1">Absent / Leave Days</p>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
