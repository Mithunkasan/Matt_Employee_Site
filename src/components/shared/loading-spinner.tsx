'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
    text?: string
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'h-8 w-8',
        md: 'h-16 w-16',
        lg: 'h-24 w-24',
    }

    return (
        <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
            <div className={cn('relative animate-pulse', sizeClasses[size])}>
                <Image
                    src="/logo.png"
                    alt="Loading..."
                    fill
                    className="object-contain"
                    priority
                />
            </div>
            {text && (
                <p className="text-sm font-medium animate-pulse text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                    {text}
                </p>
            )}
        </div>
    )
}

export function PageLoader() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <LoadingSpinner size="lg" text="Processing..." />
            <div className="w-48 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 animate-progress origin-left" />
            </div>
        </div>
    )
}
