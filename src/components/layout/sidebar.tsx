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
    LayoutGrid,
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
        roles: ['ADMIN', 'HR', 'BA', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE'],
    },
    {
        title: 'Projects',
        href: '/projects',
        icon: <FolderKanban className="h-5 w-5" />,
        roles: ['ADMIN', 'HR', 'BA', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE'],
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
        roles: ['ADMIN', 'HR', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE'],
    },
    {
        title: 'Leaves',
        href: '/leaves',
        icon: <Calendar className="h-5 w-5" />,
        roles: ['ADMIN', 'HR', 'BA', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE'],
    },
    {
        title: 'WFH Requests',
        href: '/wfh',
        icon: <Building2 className="h-5 w-5" />,
        roles: ['ADMIN', 'HR', 'BA', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE'],
    },
    {
        title: 'Task Allocation',
        href: '/tasks',
        icon: <LayoutGrid className="h-5 w-5" />,
        roles: ['ADMIN', 'PA', 'BA', 'MANAGER', 'TEAM_LEADER'],
    },
    {
        title: 'Reports',
        href: '/reports',
        icon: <FileText className="h-5 w-5" />,
        roles: ['ADMIN', 'BA', 'MANAGER', 'EMPLOYEE'],
    },
    {
        title: 'Attendance Report',
        href: '/attendance-report',
        icon: <Calendar className="h-5 w-5" />,
        roles: ['ADMIN', 'HR'],
    },
    {
        title: 'Leave Report',
        href: '/leave-report',
        icon: <FileText className="h-5 w-5" />,
        roles: ['ADMIN', 'HR'],
    },
]

export function Sidebar() {
    const pathname = usePathname()
    const { user, logout } = useAuth()
    const [collapsed, setCollapsed] = useState(false)

    if (!user) return null

    const filteredItems = navItems.filter((item) =>
        item.roles.includes(user.role)
    ).map(item => {
        if (item.href === '/projects' && ['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
            return { ...item, title: 'Project Allocation' }
        }
        return item
    })

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
                    'fixed left-0 top-0 z-40 h-screen bg-[#13498a] border-r border-[#13498a]/20 transition-all duration-300 flex flex-col overflow-y-auto shadow-2xl shadow-[#13498a]/20',
                    collapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'translate-x-0 w-72'
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#13498a]/20">
                    <div className={cn('flex items-center gap-3', collapsed && 'lg:hidden')}>
                        <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-black/10">
                            <img src="/logo.png" alt="Matt Engineering" className="h-9 w-9" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-white">Matt Engineering</h1>
                            <p className="text-xs text-white/60">Est. 2014</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden lg:flex text-white/60 hover:text-white hover:bg-white/10 transition-colors"
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
                            if (window.innerWidth < 1024) {
                                setCollapsed(true)
                            }
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-4',
                                    isActive
                                        ? 'bg-white/10 text-white border-white'
                                        : 'text-white/60 hover:text-white hover:bg-white/5 border-transparent'
                                )}
                                onClick={handleClick}
                            >
                                <span className={cn(isActive && 'text-white')}>{item.icon}</span>
                                <span className={cn('font-medium', collapsed && 'lg:hidden')}>
                                    {item.title}
                                </span>
                                {isActive && (
                                    <div className="ml-auto h-2 w-2 rounded-full bg-white shadow-lg shadow-white/50" />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-[#13498a]/20 bg-black/5">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className={cn(
                                    'w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors',
                                    collapsed && 'lg:justify-center'
                                )}
                            >
                                <Avatar className="h-10 w-10 border-2 border-white/20 shadow-lg shadow-black/10">
                                    <AvatarFallback className="bg-[#b12024] text-white font-semibold">
                                        {getInitials(user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={cn('flex-1 text-left', collapsed && 'lg:hidden')}>
                                    <p className="font-semibold text-white truncate">{user.name}</p>
                                    <Badge variant="outline" className={cn('text-[10px] mt-1 text-white border-white/30 h-4 px-1.5 uppercase font-bold tracking-wider', getRoleColor(user.role))}>
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
