'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
    text?: string
}

const SPOKES = Array.from({ length: 12 }, (_, index) => index)

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'h-12 w-12',
        md: 'h-20 w-20',
        lg: 'h-28 w-28',
    }

    const logoSizes = {
        sm: 'h-6 w-6',
        md: 'h-10 w-10',
        lg: 'h-14 w-14',
    }

    return (
        <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
            <div className={cn('relative flex items-center justify-center', sizeClasses[size])}>
                <div
                    className="absolute inset-0 animate-spin"
                    style={{ animationDuration: '0.9s', animationTimingFunction: 'linear' }}
                >
                    {SPOKES.map((spoke) => (
                        <span
                            key={spoke}
                            className="absolute inset-0"
                            style={{ transform: `rotate(${spoke * 30}deg)` }}
                        >
                            <span
                                className="absolute left-1/2 top-[7%] h-[20%] w-[2px] -translate-x-1/2 rounded-full bg-slate-500 dark:bg-slate-300"
                                style={{ opacity: (spoke + 1) / SPOKES.length }}
                            />
                        </span>
                    ))}
                </div>

                <div className="absolute inset-[24%] rounded-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px]" />
                <div className={cn('relative rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center p-1', logoSizes[size])}>
                    <div className="relative w-full h-full">
                        <Image
                            src="/logo.png"
                            alt="Loading..."
                            fill
                            className="object-contain"
                            priority={size === 'lg'}
                            sizes="64px"
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
