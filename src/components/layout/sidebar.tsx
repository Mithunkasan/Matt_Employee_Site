'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    CalendarCheck,
    FileText,
    LogOut,
    ChevronLeft,
    Menu,
    Settings,
    Calendar,
    Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import { getInitials, getRoleColor } from '@/lib/utils'

interface NavItem {
    title: string
    href: string
    icon: React.ReactNode
    roles: string[]
}

const navItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: <LayoutDashboard className="h-5 w-5" />,
        roles: ['ADMIN', 'HR', 'BA', 'EMPLOYEE'],
    },
    {
        title: 'Projects',
        href: '/projects',
        icon: <FolderKanban className="h-5 w-5" />,
        roles: ['ADMIN', 'HR', 'BA', 'EMPLOYEE'],
    },
    {
        title: 'Employees',
        href: '/employees',
        icon: <Users className="h-5 w-5" />,
        roles: ['ADMIN', 'HR'],
    },
    {
        title: 'Attendance',
        href: '/attendance',
        icon: <CalendarCheck className="h-5 w-5" />,
        roles: ['ADMIN', 'HR', 'EMPLOYEE'],
    },
    {
        title: 'Leaves',
        href: '/leaves',
        icon: <Calendar className="h-5 w-5" />,
        roles: ['ADMIN', 'HR', 'BA'],
    },
    {
        title: 'Reports',
        href: '/reports',
        icon: <FileText className="h-5 w-5" />,
        roles: ['ADMIN', 'BA', 'EMPLOYEE'],
    },
]

export function Sidebar() {
    const pathname = usePathname()
    const { user, logout } = useAuth()
    const [collapsed, setCollapsed] = useState(false)

    if (!user) return null

    const filteredItems = navItems.filter((item) =>
        item.roles.includes(user.role)
    )

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={cn(
                    'fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity',
                    collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
                )}
                onClick={() => setCollapsed(true)}
            />

            {/* Mobile menu button */}
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-4 left-4 z-50 lg:hidden"
                onClick={() => setCollapsed(!collapsed)}
            >
                <Menu className="h-6 w-6" />
            </Button>

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed left-0 top-0 z-40 h-screen bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/50 transition-all duration-300 flex flex-col overflow-y-auto',
                    collapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'translate-x-0 w-72'
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                    <div className={cn('flex items-center gap-3', collapsed && 'lg:hidden')}>
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                            {/* Logo placeholder: <Image src="/logo.png" alt="Matt Engineering" width={40} height={40} className="rounded-lg" /> */}
                            <img src="/logo.png" alt="Matt Engineering" className="h-9 w-9" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-white">Matt Engineering</h1>
                            <p className="text-xs text-slate-400">Est. 2014</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden lg:flex text-slate-400 hover:text-white hover:bg-slate-700/50"
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        <ChevronLeft className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')} />
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {filteredItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                        const handleClick = () => {
                            // Only close sidebar on mobile (< lg breakpoint)
                            if (window.innerWidth < 1024) {
                                setCollapsed(true)
                            }
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                                    isActive
                                        ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-white border border-violet-500/30'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                )}
                                onClick={handleClick}
                            >
                                <span className={cn(isActive && 'text-violet-400')}>{item.icon}</span>
                                <span className={cn('font-medium', collapsed && 'lg:hidden')}>
                                    {item.title}
                                </span>
                                {isActive && (
                                    <div className="ml-auto h-2 w-2 rounded-full bg-violet-400 shadow-lg shadow-violet-400/50" />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-slate-700/50">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className={cn(
                                    'w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-700/50 transition-colors',
                                    collapsed && 'lg:justify-center'
                                )}
                            >
                                <Avatar className="h-10 w-10 border-2 border-violet-500/30">
                                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold">
                                        {getInitials(user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={cn('flex-1 text-left', collapsed && 'lg:hidden')}>
                                    <p className="font-medium text-white truncate">{user.name}</p>
                                    <Badge variant="outline" className={cn('text-xs mt-1', getRoleColor(user.role))}>
                                        {user.role}
                                    </Badge>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/settings">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Settings
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout} className="text-red-500 focus:text-red-500">
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>
        </>
    )
}
