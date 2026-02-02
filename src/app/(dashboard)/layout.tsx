'use client'

import { useAuth } from '@/context/auth-context'
import { Sidebar } from '@/components/layout/sidebar'
import { PageLoader } from '@/components/shared/loading-spinner'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login')
        }
    }, [user, loading, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <PageLoader />
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-72">
                {children}
            </main>
        </div>
    )
}
