# ProjectHub - Project & Employee Management System

A full-stack internal web application for managing projects, employees, attendance, and daily reports for web development companies.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)

## Features

### 🔐 Authentication & Authorization
- Secure login with JWT-based sessions
- Role-based access control (Admin, HR, PA, Employee)
- Protected routes with middleware

### 📊 Role-Specific Dashboards
- **Admin**: Full access with analytics overview
- **HR**: Employee management and attendance monitoring
- **PA (Project Admin)**: Project creation and allocation
- **Employee**: Personal projects, reports, and attendance

### 📁 Project Management
- Create, update, and delete projects
- Assign projects to employees
- Track project status (Pending, In Progress, Completed)
- Priority levels (Low, Medium, High)
- GitHub repository linking
- Timeline and progress tracking

### 📝 Daily Reporting
- Employees submit daily work reports
- Reports linked to projects and dates
- Hours worked tracking
- Admin & PA can review all reports

### ✅ Attendance System
- Daily check-in/check-out
- Status tracking (Present, Absent, Leave)
- Monthly attendance summaries
- HR & Admin can view all attendance

### 👥 Employee Management
- Register new employees (HR & Admin)
- Manage employee profiles
- Activate/deactivate users
- Role assignment

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **Authentication**: JWT with jose library
- **State**: React hooks
- **UI Components**: Radix UI primitives

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your database connection:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/project_management"
   JWT_SECRET="your-secure-secret-key"
   ```

4. **Initialize the database**
   ```bash
   # Generate Prisma client
   npm run db:generate

   # Push schema to database
   npm run db:push

   # Seed demo data
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open the application**
   ```
   http://localhost:3000
   ```

## Demo Accounts

After seeding, you can login with these demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | admin123 |
| HR | hr@demo.com | hr123456 |
| PA | pa@demo.com | pa123456 |
| Employee | john@demo.com | emp123456 |
| Employee | emily@demo.com | emp123456 |
| Employee | alex@demo.com | emp123456 |

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── dashboard/      # Main dashboard
│   │   ├── projects/       # Project management
│   │   ├── employees/      # Employee management
│   │   ├── attendance/     # Attendance tracking
│   │   ├── reports/        # Daily reports
│   │   └── settings/       # User settings
│   ├── api/                # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   ├── users/          # User CRUD
│   │   ├── projects/       # Project CRUD
│   │   ├── attendance/     # Attendance endpoints
│   │   ├── reports/        # Report endpoints
│   │   └── dashboard/      # Dashboard stats
│   └── login/              # Login page
├── components/
│   ├── layout/             # Layout components
│   ├── shared/             # Reusable components
│   └── ui/                 # shadcn/ui components
├── context/                # React contexts
├── lib/                    # Utilities & configs
│   ├── auth.ts             # Authentication helpers
│   ├── prisma.ts           # Prisma client
│   ├── utils.ts            # Utility functions
│   └── validations.ts      # Zod schemas
└── middleware.ts           # Auth middleware
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/session` - Get current session

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/[id]` - Get user
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/[id]` - Get project
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Attendance
- `GET /api/attendance` - List attendance
- `POST /api/attendance` - Mark attendance
- `PATCH /api/attendance/[id]` - Update (checkout)

### Reports
- `GET /api/reports` - List reports
- `POST /api/reports` - Create report
- `PATCH /api/reports/[id]` - Update report
- `DELETE /api/reports/[id]` - Delete report

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio
```

## License

MIT License - feel free to use for personal or commercial projects.
