import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    IN_PROGRESS: 'bg-blue-500/10 text-[#13498a] border-[#13498a]/20',
    COMPLETED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    PRESENT: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    ABSENT: 'bg-[#b12024]/10 text-[#b12024] border-[#b12024]/20',
    LEAVE: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    INACTIVE: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  }
  return colors[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    MEDIUM: 'bg-[#13498a]/10 text-[#13498a] border-[#13498a]/20',
    HIGH: 'bg-[#b12024]/10 text-[#b12024] border-[#b12024]/20',
  }
  return colors[priority] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    ADMIN: 'bg-[#b12024]/10 text-[#b12024] border-[#b12024]/20',
    HR: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    PA: 'bg-[#13498a]/10 text-[#13498a] border-[#13498a]/20',
    BA: 'bg-[#13498a]/10 text-[#13498a] border-[#13498a]/20',
    MANAGER: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    TEAM_LEADER: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    EMPLOYEE: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  }
  return colors[role] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'
}

export function calculateProgress(startDate?: Date | null, endDate?: Date | null): number {
  if (!startDate || !endDate) return 0
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (now < start) return 0
  if (now > end) return 100

  const total = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()
  return Math.round((elapsed / total) * 100)
}
