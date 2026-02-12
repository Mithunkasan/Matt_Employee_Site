# 🚀 Quick Reference Card

## 🔑 Admin Login
```
URL:      http://localhost:3000/login
Email:    admin@mattengg.com
Password: Matt@4321admin
```

## 📦 Common Commands

### Development
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
```

### Database
```bash
npm run db:seed          # Create/Reset admin account
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Prisma Studio
npx prisma migrate reset # Reset database (auto-seeds admin)
```

## 👥 User Roles

| Role | Description | Can Be Created By |
|------|-------------|-------------------|
| **ADMIN** | Full system access | ADMIN only |
| **HR** | Manage employees, attendance, leaves | ADMIN only |
| **MANAGER** | Manage projects/tasks for Team Leaders & Employees | ADMIN, HR |
| **TEAM_LEADER** | Manage tasks for Employees | ADMIN, HR |
| **BA** | Business Associate - Create projects/tasks | ADMIN, HR |
| **EMPLOYEE** | Basic access to assigned work | ADMIN, HR |

## 🎨 Brand Colors
- Primary Blue: `#13498a`
- Primary Red: `#b12024`

## 📁 Key Files
- Schema: `prisma/schema.prisma`
- Seed: `prisma/seed.ts`
- Auth: `src/lib/auth.ts`
- Validation: `src/lib/validations.ts`

## 🔧 Recent Updates
✅ Manager & Team Leader roles added to HR registration form  
✅ Permanent admin account configured  
✅ Auto-seeding enabled for database resets
