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
    DialogDescription,
} from '@/components/ui/dialog'
import { FileDown, FileText, Download, Clock, Calendar as CalendarIcon, User as UserIcon, Filter, Info } from 'lucide-react'
import { toast } from 'sonner'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { cn } from '@/lib/utils'

interface Session {
    checkIn: string
    checkOut: string | null
    hoursWorked: number
}

interface DailyAttendance {
    id: string
    status: string
    totalHours: number
    sessions: Session[]
}

interface EmployeeReport {
    id: string
    name: string
    email: string
    department?: string
    role: string
    dailyData: Record<number, DailyAttendance>
    totalMonthlyHours: number
    presentDays: number
    leaveDays: number
}

export default function AttendanceReportPage() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [reportData, setReportData] = useState<EmployeeReport[]>([])
    const [daysInReport, setDaysInReport] = useState(30)
    const [reportType, setReportType] = useState<'monthly' | 'weekly'>('monthly')

    const currentMonth = new Date().toISOString().slice(0, 7)
    const getStartOfWeek = (d: Date) => {
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(d.setDate(diff))
        return monday.toISOString().slice(0, 10)
    }

    const [selectedDate, setSelectedDate] = useState(currentMonth)

    // Detail Modal State
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedDayDetail, setSelectedDayDetail] = useState<{
        employeeName: string
        date: string
        attendance: DailyAttendance
    } | null>(null)
    const [empSummaryOpen, setEmpSummaryOpen] = useState(false)
    const [selectedEmpSummary, setSelectedEmpSummary] = useState<EmployeeReport | null>(null)

    const canView = user?.role === 'ADMIN' || user?.role === 'HR'

    useEffect(() => {
        if (canView) {
            fetchReport()
        }
    }, [selectedDate, reportType])

    const fetchReport = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/admin/attendance-report?type=${reportType}&date=${selectedDate}`)
            if (res.ok) {
                const data = await res.json()
                setReportData(data.reportData)
                setDaysInReport(data.daysInReport)
            } else {
                toast.error('Failed to load report')
            }
        } catch (error) {
            toast.error('Network error')
        } finally {
            setLoading(false)
        }
    }

    const downloadCSV = () => {
        // Header
        let csv = `Attendance Report (${reportType}) - ${selectedDate}\n`
        csv += 'Employee,Department,'

        const startDay = reportType === 'monthly' ? 1 : 1
        const endDay = reportType === 'monthly' ? daysInReport : 7

        if (reportType === 'monthly') {
            for (let i = 1; i <= daysInReport; i++) csv += `${i},`
        } else {
            const startDate = new Date(selectedDate)
            for (let i = 0; i < 7; i++) {
                const d = new Date(startDate)
                d.setDate(startDate.getDate() + i)
                csv += `${d.toLocaleDateString('default', { weekday: 'short' })}(${d.getDate()}),`
            }
        }

        csv += 'Total Hours,Present,Leaves\n'

        // Rows
        reportData.forEach(emp => {
            csv += `"${emp.name}","${emp.department || '-'}",`
            if (reportType === 'monthly') {
                for (let i = 1; i <= daysInReport; i++) {
                    const dayData = emp.dailyData[i]
                    if (!dayData) csv += 'A,'
                    else if (dayData.status === 'LEAVE') csv += 'L,'
                    else csv += `${dayData.totalHours.toFixed(2)},`
                }
            } else {
                const startDate = new Date(selectedDate)
                for (let i = 0; i < 7; i++) {
                    const d = new Date(startDate)
                    d.setDate(startDate.getDate() + i)
                    const dayData = emp.dailyData[d.getDate()]
                    if (!dayData) csv += 'A,'
                    else if (dayData.status === 'LEAVE') csv += 'L,'
                    else csv += `${dayData.totalHours.toFixed(2)},`
                }
            }
            csv += `${emp.totalMonthlyHours.toFixed(2)},${emp.presentDays},${emp.leaveDays || 0}\n`
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

        let headers: string[][] = []
        if (reportType === 'monthly') {
            headers = [['Employee', 'Department', ...Array.from({ length: daysInReport }, (_, i) => (i + 1).toString()), 'Total', 'P', 'L']]
        } else {
            const startDate = new Date(selectedDate)
            const dayLabels = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(startDate)
                d.setDate(startDate.getDate() + i)
                return `${d.toLocaleDateString('default', { weekday: 'short' })} ${d.getDate()}`
            })
            headers = [['Employee', 'Department', ...dayLabels, 'Total', 'P', 'L']]
        }

        const body = reportData.map(emp => {
            const row = [emp.name, emp.department || '-']
            if (reportType === 'monthly') {
                for (let i = 1; i <= daysInReport; i++) {
                    const dayData = emp.dailyData[i]
                    if (!dayData) row.push('A')
                    else if (dayData.status === 'LEAVE') row.push('L')
                    else row.push(dayData.totalHours.toFixed(1))
                }
            } else {
                const startDate = new Date(selectedDate)
                for (let i = 0; i < 7; i++) {
                    const d = new Date(startDate)
                    d.setDate(startDate.getDate() + i)
                    const dayData = emp.dailyData[d.getDate()]
                    if (!dayData) row.push('A')
                    else if (dayData.status === 'LEAVE') row.push('L')
                    else row.push(dayData.totalHours.toFixed(1))
                }
            }
            row.push(emp.totalMonthlyHours.toFixed(1), emp.presentDays.toString(), (emp.leaveDays || 0).toString())
            return row
        })

        autoTable(doc, {
            head: headers,
            body: body,
            startY: 30,
            styles: { fontSize: 8, cellPadding: 1 },
            headStyles: { fillColor: [79, 70, 229] },
        })

        doc.save(`Attendance_Report_${reportType}_${selectedDate}.pdf`)
    }

    const handleCellClick = (empName: string, day: number, attendance: DailyAttendance) => {
        let dateStr = ''
        if (reportType === 'monthly') {
            const [year, month] = selectedDate.split('-')
            dateStr = `${day} ${new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' })} ${year}`
        } else {
            const startDate = new Date(selectedDate)
            const d = new Date(startDate)
            // Need to find the exact date for the clicked index
            // Actually 'day' is the date within the month from dailyData.
            // This works for both as long as we show the correct month name.
            dateStr = `${day} ${new Date(startDate).toLocaleString('default', { month: 'long', year: 'numeric' })}`
        }

        setSelectedDayDetail({
            employeeName: empName,
            date: dateStr,
            attendance
        })
        setDetailOpen(true)
    }

    const handleEmployeeClick = (emp: EmployeeReport) => {
        setSelectedEmpSummary(emp)
        setEmpSummaryOpen(true)
    }

    if (!canView) return <div className="p-6 text-center">Unauthorized</div>

    return (
        <div className="min-h-screen pb-10">
            <Header
                title="Attendance Report"
                description={`View ${reportType} attendance for your team`}
            />

            <div className="p-6">
                <Card className="p-4 mb-6 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 uppercase font-bold">Type</Label>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant={reportType === 'monthly' ? 'default' : 'outline'}
                                        onClick={() => { setReportType('monthly'); setSelectedDate(currentMonth); }}
                                    >
                                        Monthly
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={reportType === 'weekly' ? 'default' : 'outline'}
                                        onClick={() => { setReportType('weekly'); setSelectedDate(getStartOfWeek(new Date())); }}
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
                            {/* Legend */}
                            <div className="hidden lg:flex items-center gap-4 ml-6 pl-6 border-l border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 rounded bg-slate-100 dark:bg-slate-900 border flex items-center justify-center text-[10px] text-slate-300 font-bold">A</div>
                                    <span className="text-xs text-slate-500">Absent</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 rounded bg-orange-50 dark:bg-orange-900/10 border border-orange-100 flex items-center justify-center text-[10px] text-orange-600 font-bold">L</div>
                                    <span className="text-xs text-slate-500">Leave</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 rounded bg-white dark:bg-slate-800 border flex items-center justify-center text-[10px] text-slate-900 dark:text-white font-bold">8.5</div>
                                    <span className="text-xs text-slate-500">Hours</span>
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
                                        {reportType === 'monthly' ? (
                                            Array.from({ length: daysInReport }, (_, i) => (
                                                <TableHead key={i} className="text-center min-w-[40px] text-[10px] bg-slate-50 dark:bg-slate-900">{i + 1}</TableHead>
                                            ))
                                        ) : (
                                            Array.from({ length: 7 }, (_, i) => {
                                                const d = new Date(selectedDate)
                                                d.setDate(d.getDate() + i)
                                                return <TableHead key={i} className="text-center min-w-[60px] text-[10px] bg-slate-50 dark:bg-slate-900">{d.toLocaleDateString('default', { weekday: 'short' })} {d.getDate()}</TableHead>
                                            })
                                        )}
                                        <TableHead className="text-center min-w-[80px] border-l bg-slate-50 dark:bg-slate-900">Total</TableHead>
                                        <TableHead className="text-center min-w-[60px] bg-slate-50 dark:bg-slate-900">P</TableHead>
                                        <TableHead className="text-center min-w-[60px] bg-slate-50 dark:bg-slate-900">L</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={daysInReport + 4} className="text-center py-20"><PageLoader /></TableCell></TableRow>
                                    ) : reportData.map((emp) => (
                                        <TableRow key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                            <TableCell
                                                className="sticky left-0 bg-white dark:bg-slate-800 border-r font-medium cursor-pointer hover:text-violet-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10"
                                                onClick={() => handleEmployeeClick(emp)}
                                            >
                                                {emp.name}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500">{emp.department || '-'}</TableCell>
                                            {reportType === 'monthly' ? (
                                                Array.from({ length: daysInReport }, (_, i) => {
                                                    const day = i + 1
                                                    const dayData = emp.dailyData[day]
                                                    return (
                                                        <TableCell key={i} className={`text-center p-0 border-r ${dayData ? 'cursor-pointer hover:bg-violet-50' : ''}`} onClick={() => dayData && dayData.status !== 'LEAVE' && handleCellClick(emp.name, day, dayData)}>
                                                            <div className={cn(
                                                                "py-3 px-1 text-[11px]",
                                                                dayData?.status === 'LEAVE' && "bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400"
                                                            )}>
                                                                {dayData ? (
                                                                    dayData.status === 'LEAVE' ? <b>L</b> : <b>{dayData.totalHours.toFixed(1)}</b>
                                                                ) : (
                                                                    <span className="text-slate-200">A</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    )
                                                })
                                            ) : (
                                                Array.from({ length: 7 }, (_, i) => {
                                                    const d = new Date(selectedDate)
                                                    d.setDate(d.getDate() + i)
                                                    const day = d.getDate()
                                                    const dayData = emp.dailyData[day]
                                                    return (
                                                        <TableCell key={i} className={`text-center p-0 border-r ${dayData ? 'cursor-pointer hover:bg-violet-50' : ''}`} onClick={() => dayData && dayData.status !== 'LEAVE' && handleCellClick(emp.name, day, dayData)}>
                                                            <div className={cn(
                                                                "py-3 px-1 text-[11px]",
                                                                dayData?.status === 'LEAVE' && "bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400"
                                                            )}>
                                                                {dayData ? (
                                                                    dayData.status === 'LEAVE' ? <b>L</b> : <b>{dayData.totalHours.toFixed(1)}</b>
                                                                ) : (
                                                                    <span className="text-slate-200">A</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    )
                                                })
                                            )}
                                            <TableCell className="text-center font-bold border-l">{emp.totalMonthlyHours.toFixed(1)}h</TableCell>
                                            <TableCell className="text-center font-bold text-emerald-600">{emp.presentDays}</TableCell>
                                            <TableCell className="text-center font-bold text-orange-500">{emp.leaveDays || 0}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </Card>
            </div>

            {/* Reuse existing Dialogs */}
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
                    <DialogHeader><DialogTitle>Summary: {selectedEmpSummary?.name}</DialogTitle></DialogHeader>
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
                                <b className="text-xl text-orange-600 dark:text-orange-400">{selectedEmpSummary.leaveDays || 0}</b>
                                <p className="text-xs text-slate-500 uppercase font-bold mt-1">Leave Days</p>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
