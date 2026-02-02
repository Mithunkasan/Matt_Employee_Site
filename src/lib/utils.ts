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
    PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/20',
    PRESENT: 'bg-green-500/10 text-green-500 border-green-500/20',
    ABSENT: 'bg-red-500/10 text-red-500 border-red-500/20',
    LEAVE: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    ACTIVE: 'bg-green-500/10 text-green-500 border-green-500/20',
    INACTIVE: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  }
  return colors[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    MEDIUM: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    HIGH: 'bg-red-500/10 text-red-500 border-red-500/20',
  }
  return colors[priority] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    ADMIN: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    HR: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    PA: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    BA: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    EMPLOYEE: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  }
  return colors[role] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'
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
