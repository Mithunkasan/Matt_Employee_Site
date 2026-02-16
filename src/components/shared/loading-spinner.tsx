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
        sm: 'h-12 w-12',
        md: 'h-24 w-24',
        lg: 'h-32 w-32',
    }

    const logoSizes = {
        sm: 'h-6 w-6',
        md: 'h-12 w-12',
        lg: 'h-16 w-16',
    }

    // Apple-like loading often uses a subtle, smooth spinner. 
    // We'll use a ring that spins around the logo.
    return (
        <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
            <div className={cn('relative flex items-center justify-center', sizeClasses[size])}>
                {/* Spinning Ring */}
                <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-800" />
                <div className="absolute inset-0 rounded-full border-[3px] border-t-violet-600 border-r-transparent border-b-transparent border-l-transparent animate-spin" />

                {/* Central Logo */}
                <div className={cn('relative rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center p-1', logoSizes[size])}>
                    <div className="relative w-full h-full">
                        <Image
                            src="/logo.png"
                            alt="Loading..."
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>
            </div>
            {text && (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wider uppercase animate-pulse">
                    {text}
                </p>
            )}
        </div>
    )
}

export function PageLoader() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <LoadingSpinner size="lg" />
        </div>
    )
}
