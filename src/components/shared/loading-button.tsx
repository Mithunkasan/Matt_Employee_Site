'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean
    children: React.ReactNode
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function LoadingButton({
    loading,
    children,
    disabled,
    variant = 'default',
    size = 'default',
    ...props
}: LoadingButtonProps) {
    return (
        <Button
            variant={variant}
            size={size}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <div className="mr-2 h-4 w-4 relative animate-pulse">
                    <img src="/logo.png" alt="" className="h-full w-full object-contain" />
                </div>
            )}
            {children}
        </Button>
    )
}
