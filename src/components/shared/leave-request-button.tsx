'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingButton } from '@/components/shared/loading-button'

interface LeaveRequestButtonProps {
    approvedLeavesCount?: number
}

export function LeaveRequestButton({ approvedLeavesCount = 0 }: LeaveRequestButtonProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        reason: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/leaves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            const data = await res.json()

            if (res.ok) {
                // Check if this is first leave (free) or subsequent (loss of pay)
                if (approvedLeavesCount === 0) {
                    toast.success('Leave request submitted! This is your free leave.', {
                        description: 'Admin will review your request shortly.',
                    })
                } else {
                    toast.warning('Leave request submitted! This will be Loss of Pay (LOP).', {
                        description: `You've already used 1 free leave. Subsequent leaves are unpaid.`,
                        duration: 6000,
                    })
                }

                setOpen(false)
                setFormData({ startDate: '', endDate: '', reason: '' })

                // Refresh the page to show updated data
                window.location.reload()
            } else {
                toast.error(data.error || 'Failed to submit leave request')
            }
        } catch (error) {
            toast.error('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const isFirstLeave = approvedLeavesCount === 0

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
                >
                    <Calendar className="h-4 w-4 mr-2" />
                    Request Leave
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Request Leave</DialogTitle>
                    <DialogDescription>
                        Submit your leave request to admin for approval
                        {isFirstLeave && (
                            <span className="block mt-2 text-emerald-600 dark:text-emerald-400 font-medium">
                                ✓ Your first leave is free!
                            </span>
                        )}
                        {!isFirstLeave && (
                            <span className="block mt-2 text-orange-600 dark:text-orange-400 font-medium">
                                ⚠️ This will be a Loss of Pay (LOP) leave
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <input
                                id="startDate"
                                type="date"
                                required
                                value={formData.startDate}
                                onChange={(e) =>
                                    setFormData({ ...formData, startDate: e.target.value })
                                }
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <input
                                id="endDate"
                                type="date"
                                required
                                value={formData.endDate}
                                onChange={(e) =>
                                    setFormData({ ...formData, endDate: e.target.value })
                                }
                                min={formData.startDate || new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Leave</Label>
                        <Textarea
                            id="reason"
                            required
                            value={formData.reason}
                            onChange={(e) =>
                                setFormData({ ...formData, reason: e.target.value })
                            }
                            placeholder="Please provide a reason for your leave request..."
                            rows={4}
                            className="resize-none"
                        />
                    </div>

                    {!isFirstLeave && (
                        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                            <p className="text-sm text-orange-800 dark:text-orange-200">
                                <strong>Note:</strong> You have already used {approvedLeavesCount} free leave.
                                This leave will be marked as Loss of Pay (LOP).
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <LoadingButton type="submit" loading={loading}>
                            Submit Request
                        </LoadingButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
