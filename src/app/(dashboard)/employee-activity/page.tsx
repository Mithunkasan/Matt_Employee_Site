'use client'

import { Header } from '@/components/layout/header'
import { EmployeeActivityDashboard } from '@/components/admin/employee-activity-dashboard'

export default function EmployeeActivityPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <Header
                title="Employee Activity Monitor"
                description="Real-time view of employee online/offline status and work hours"
            />
            <div className="p-6">
                <EmployeeActivityDashboard />
            </div>
        </div>
    )
}
