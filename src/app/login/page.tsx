'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingButton } from '@/components/shared/loading-button'
import { Building2, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const { login, user } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (user) {
            router.push('/dashboard')
        }
    }, [user, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await login(email, password)

        if (result.success) {
            toast.success('Welcome back!')
        } else {
            toast.error(result.error || 'Login failed')
        }

        setLoading(false)
    }

    return (
        <div className="min-h-screen flex">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0">
                    <img
                        src="/logo.png"
                        alt="Engineering Background"
                        className="h-full w-full object-cover"
                    />
                    {/* Dark Overlay with Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#13498a]/95 via-[#1a3a61]/90 to-[#b12024]/70" />
                </div>

                {/* Background patterns */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl opacity-50" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#b12024]/20 rounded-full blur-3xl opacity-50" />
                </div>

                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center px-16 text-white">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-16 w-16 rounded-2xl bg-white backdrop-blur-sm flex items-center justify-center shadow-xl">
                            <img src="/logo.png" alt="Matt Engineering Solutions" className="h-14 w-14" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Matt Engineering Solutions</h1>
                            <p className="text-white/70">Est. 2014</p>
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold leading-tight mb-6">
                        Engineering Excellence <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-100 to-white">
                            Since 2014
                        </span>
                    </h2>

                    <p className="text-lg text-white/80 max-w-md">
                        Streamline project management, track attendance, and boost team productivity with our comprehensive solution.
                    </p>

                    <div className="mt-12 grid grid-cols-2 gap-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            <p className="text-3xl font-bold">10+</p>
                            <p className="text-white/70 text-sm mt-1">Years of Excellence</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            <p className="text-3xl font-bold">100%</p>
                            <p className="text-white/70 text-sm mt-1">Client Satisfaction</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side - Login form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 dark:bg-[#0a1e3a]">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#13498a] to-[#b12024] flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <img src="/logo.png" alt="Matt Engineering Solutions" className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Matt Engineering</h1>
                            <p className="text-xs text-slate-500">Est. 2014</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#13498a]/20 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none p-8 border border-slate-200 dark:border-white/10">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">
                                Sign in to access your dashboard
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">
                                    Email Address
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-12 h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl focus:ring-[#13498a]"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-12 pr-12 h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl focus:ring-[#13498a]"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <LoadingButton
                                type="submit"
                                loading={loading}
                                className="w-full h-12 bg-gradient-to-r from-[#13498a] to-[#1a3a61] hover:from-[#1a3a61] hover:to-[#13498a] text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all border-none"
                            >
                                Sign In
                            </LoadingButton>
                        </form>
                    </div>

                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                        © 2014-{new Date().getFullYear()} Matt Engineering Solutions. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}
