import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    description?: string
    trend?: {
        value: number
        isPositive: boolean
    }
    variant?: 'default' | 'gradient'
    gradientFrom?: string
    gradientTo?: string
}

export function StatsCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    variant = 'default',
    gradientFrom = 'from-violet-500',
    gradientTo = 'to-purple-600',
}: StatsCardProps) {
    if (variant === 'gradient') {
        return (
            <div
                className={cn(
                    'relative overflow-hidden rounded-2xl p-6 text-white',
                    `bg-gradient-to-br ${gradientFrom} ${gradientTo}`
                )}
            >
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

                <div className="relative">
                    <div className="flex items-center justify-between">
                        <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                            <Icon className="h-6 w-6" />
                        </div>
                        {trend && (
                            <span
                                className={cn(
                                    'text-sm font-medium px-2 py-1 rounded-full',
                                    trend.isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
                                )}
                            >
                                {trend.isPositive ? '+' : ''}{trend.value}%
                            </span>
                        )}
                    </div>

                    <div className="mt-4">
                        <p className="text-3xl font-bold">{value}</p>
                        <p className="text-sm text-white/80 mt-1">{title}</p>
                    </div>

                    {description && (
                        <p className="text-xs text-white/60 mt-2">{description}</p>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-6 transition-all hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50">
            <div className="flex items-center justify-between">
                <div className="rounded-xl bg-slate-100 dark:bg-slate-700/50 p-3">
                    <Icon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                </div>
                {trend && (
                    <span
                        className={cn(
                            'text-sm font-medium px-2 py-1 rounded-full',
                            trend.isPositive
                                ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400'
                                : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                        )}
                    >
                        {trend.isPositive ? '+' : ''}{trend.value}%
                    </span>
                )}
            </div>

            <div className="mt-4">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{title}</p>
            </div>

            {description && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{description}</p>
            )}
        </div>
    )
}
