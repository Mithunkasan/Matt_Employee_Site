'use client'

import { useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { Header } from '@/components/layout/header'
import { LoadingButton } from '@/components/shared/loading-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, Mail, Phone, Building, Shield, Save } from 'lucide-react'
import { getInitials, getRoleColor } from '@/lib/utils'
import { toast } from 'sonner'

export default function SettingsPage() {
    const { user, refreshSession } = useAuth()
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        name: user?.name || '',
        phone: '',
        department: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const res = await fetch(`/api/users/${user?.userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                toast.success('Profile updated')
                refreshSession()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to update profile')
            }
        } catch (error) {
            toast.error('Network error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen">
            <Header title="Settings" description="Manage your account" />

            <div className="p-6 max-w-4xl mx-auto">
                {/* Profile Card */}
                <Card className="p-8 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <Avatar className="h-24 w-24 border-4 border-violet-500/30">
                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-2xl font-bold">
                                {getInitials(user?.name || 'U')}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {user?.name}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                {user?.email}
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                                <Badge variant="outline" className={getRoleColor(user?.role || '')}>
                                    <Shield className="h-3 w-3 mr-1" />
                                    {user?.role}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Edit Profile Form */}
                <Card className="p-8 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                        Edit Profile
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Full Name
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="bg-slate-100 dark:bg-slate-900"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    Phone Number
                                </Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+1 234 567 8900"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="department" className="flex items-center gap-2">
                                    <Building className="h-4 w-4" />
                                    Department
                                </Label>
                                <Input
                                    id="department"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    placeholder="Development"
                                />
                            </div>
                        </div>

                        <Separator />

                        <div className="flex justify-end">
                            <LoadingButton type="submit" loading={saving}>
                                <Save className="h-4 w-4 mr-2" />
                                Save Changes
                            </LoadingButton>
                        </div>
                    </form>
                </Card>

                {/* Info Card */}
                <Card className="p-6 mt-6 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                        Need Help?
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Contact your administrator for password changes or role updates.
                    </p>
                </Card>
            </div>
        </div>
    )
}
