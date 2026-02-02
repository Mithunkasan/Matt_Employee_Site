'use client'

import { useAuth } from '@/context/auth-context'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NotificationDropdown } from '@/components/shared/notification-dropdown'
import { ThemeToggle } from '@/components/shared/theme-toggle'

interface HeaderProps {
    title: string
    description?: string
}

export function Header({ title, description }: HeaderProps) {
    const { user } = useAuth()

    return (
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50 px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="ml-12 lg:ml-0">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
                    {description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="hidden md:flex relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search..."
                            className="pl-10 w-64 bg-slate-100 dark:bg-slate-800 border-0"
                        />
                    </div>

                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Notifications */}
                    <NotificationDropdown />
                </div>
            </div>
        </header>
    )
}
