import { z } from 'zod'

// User schemas
export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const createUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['ADMIN', 'HR', 'BA', 'PA', 'EMPLOYEE']),
    department: z.string().optional(),
    phone: z.string().optional(),
})

export const updateUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
    role: z.enum(['ADMIN', 'HR', 'BA', 'PA', 'EMPLOYEE']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    department: z.string().optional(),
    phone: z.string().optional(),
})

// Project schemas
export const createProjectSchema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    assignedToId: z.string().optional(),
    githubLink: z.string().url().optional().or(z.literal('')),
})

export const updateProjectSchema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters').optional(),
    description: z.string().optional(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    assignedToId: z.string().optional().nullable(),
    githubLink: z.string().url().optional().or(z.literal('')),
    fileUrl: z.string().optional(),
})

// Daily Report schemas
export const createReportSchema = z.object({
    projectId: z.string().min(1, 'Project is required'),
    reportText: z.string().min(10, 'Report must be at least 10 characters'),
    hoursWorked: z.number().min(0).max(24).optional(),
    date: z.string().optional(),
})

export const updateReportSchema = z.object({
    reportText: z.string().min(10, 'Report must be at least 10 characters').optional(),
    hoursWorked: z.number().min(0).max(24).optional(),
})

// Attendance schemas
export const markAttendanceSchema = z.object({
    status: z.enum(['PRESENT', 'ABSENT', 'LEAVE']),
    date: z.string().optional(),
    notes: z.string().optional(),
})

export const updateAttendanceSchema = z.object({
    status: z.enum(['PRESENT', 'ABSENT', 'LEAVE']).optional(),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    notes: z.string().optional(),
})

// Leave schemas
export const createLeaveSchema = z.object({
    startDate: z.string(),
    endDate: z.string(),
    reason: z.string().min(5, 'Reason must be at least 5 characters'),
})

export const updateLeaveSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
})

// Types
export type LoginInput = z.infer<typeof loginSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type CreateReportInput = z.infer<typeof createReportSchema>
export type UpdateReportInput = z.infer<typeof updateReportSchema>
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>
export type CreateLeaveInput = z.infer<typeof createLeaveSchema>
export type UpdateLeaveInput = z.infer<typeof updateLeaveSchema>
