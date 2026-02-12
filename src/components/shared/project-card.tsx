'use client'

import { cn, getStatusColor, getPriorityColor, formatDate, calculateProgress } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Calendar, Clock, ExternalLink, Github, MoreHorizontal, User } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

interface Project {
    id: string
    title: string
    description?: string | null
    status: string
    priority: string
    startDate?: string | null
    endDate?: string | null
    githubLink?: string | null
    assignedTo?: {
        id: string
        name: string
        email?: string
    } | null
    createdBy?: {
        id: string
        name: string
    } | null
    _count?: {
        dailyReports: number
    }
}

interface ProjectCardProps {
    project: Project
    onEdit?: (project: Project) => void
    onDelete?: (project: Project) => void
    showActions?: boolean
    isAllocationView?: boolean
}

export function ProjectCard({ project, onEdit, onDelete, showActions = true, isAllocationView = false }: ProjectCardProps) {
    const progress = calculateProgress(
        project.startDate ? new Date(project.startDate) : null,
        project.endDate ? new Date(project.endDate) : null
    )

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-6 transition-all hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:border-violet-300 dark:hover:border-violet-500/30">
            {/* Gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={getStatusColor(project.status)}>
                            {project.status === 'IN_PROGRESS' ? 'Ongoing' : project.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(project.priority)}>
                            {project.priority}
                        </Badge>
                    </div>

                    <Link href={`/projects/${project.id}`}>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                            {project.title}
                        </h3>
                    </Link>

                    {project.description && (
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                            {project.description}
                        </p>
                    )}
                </div>

                {showActions && (onEdit || onDelete) && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {onEdit && (
                                <DropdownMenuItem onClick={() => onEdit(project)}>
                                    Edit Project
                                </DropdownMenuItem>
                            )}
                            {onDelete && (
                                <DropdownMenuItem
                                    onClick={() => onDelete(project)}
                                    className="text-red-500 focus:text-red-500"
                                >
                                    Delete Project
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Progress */}
            {project.startDate && project.endDate && (
                <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <span>Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}

            {/* Meta info */}
            <div className="mt-4 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                {project.assignedTo && (
                    <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        <span>{project.assignedTo.name}</span>
                    </div>
                )}

                {project.endDate && (
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(project.endDate)}</span>
                    </div>
                )}

                {project._count?.dailyReports !== undefined && (
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{project._count.dailyReports} reports</span>
                    </div>
                )}
            </div>

            {/* Allocate Button - Highlighted for Managers/Team Leaders */}
            {showActions && onEdit && isAllocationView && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    <Button
                        onClick={() => onEdit(project)}
                        className="w-full bg-[#13498a] hover:bg-[#13498a]/90 text-white gap-2"
                        variant="default"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Allocate Project
                    </Button>
                </div>
            )}

            {/* Links */}
            {project.githubLink && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    <a
                        href={project.githubLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:underline"
                    >
                        <Github className="h-4 w-4" />
                        View Repository
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            )}
        </div>
    )
}
