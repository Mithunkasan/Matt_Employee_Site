'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Role } from '@/lib/auth'

interface User {
    userId: string
    name: string
    email: string
    role: Role
}

interface AuthContextType {
    user: User | null
    loading: boolean
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
    logout: () => Promise<void>
    refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const refreshSession = async () => {
        try {
            const res = await fetch('/api/auth/session')
            if (res.ok) {
                const data = await res.json()
                setUser(data.user)
            } else {
                setUser(null)
            }
        } catch {
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refreshSession()
    }, [])

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            const data = await res.json()

            if (res.ok) {
                setUser({
                    userId: data.user.id,
                    name: data.user.name,
                    email: data.user.email,
                    role: data.user.role,
                })
                router.push('/dashboard')
                return { success: true }
            } else {
                return { success: false, error: data.error }
            }
        } catch {
            return { success: false, error: 'Network error. Please try again.' }
        }
    }

    const logout = async () => {
        try {
            // Record checkout time for employees
            if (user?.role === 'EMPLOYEE' || user?.role === 'BA' || user?.role === 'HR') {
                try {
                    await fetch('/api/attendance/checkout', { method: 'POST' })
                } catch (error) {
                    console.error('Failed to record checkout:', error)
                    // Continue with logout even if checkout fails
                }
            }

            await fetch('/api/auth/logout', { method: 'POST' })
        } finally {
            setUser(null)
            router.push('/login')
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshSession }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
