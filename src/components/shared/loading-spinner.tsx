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
        md: 'h-20 w-20',
        lg: 'h-28 w-28',
    }

    const logoSizes = {
        sm: 'h-7 w-7',
        md: 'h-11 w-11',
        lg: 'h-16 w-16',
    }

    const ringThickness = {
        sm: 'border-[2px]',
        md: 'border-[3px]',
        lg: 'border-[4px]',
    }

    return (
        <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
            <div className={cn('relative flex items-center justify-center', sizeClasses[size])}>
                <div
                    className={cn(
                        'absolute inset-0 rounded-full animate-spin border-slate-200 dark:border-slate-700 border-t-slate-500 dark:border-t-slate-200',
                        ringThickness[size]
                    )}
                    style={{ animationDuration: '0.9s', animationTimingFunction: 'linear' }}
                />

                <div className="absolute inset-[24%] rounded-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px]" />
                <div className={cn('relative rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center p-1', logoSizes[size])}>
                    <div className="relative w-full h-full">
                        <Image
                            src="/logo.png"
                            alt="Loading..."
                            fill
                            className="object-contain"
                            priority={size === 'lg'}
                            sizes="90px"
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
