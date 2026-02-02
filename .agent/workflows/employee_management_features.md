---
description: Implement Employee Management Features (Registration, Attendance, Leave, Notifications, Role Update)
---

## Overview
This workflow adds the required backend and frontend capabilities to support:
- Employee registration under specific departments and skill categories.
- Automatic login time tracking and logout timestamp recording.
- Leave request submission, admin approval/rejection, and loss‑of‑pay notifications.
- Role rename: change **PA** (Personal Assistant) to **Business Associate (BA)**.
- Notification system for leave decisions and pay loss alerts.

## Prerequisites
- Existing Next.js project with Prisma ORM (already present).
- Admin and HR roles configured.
- Running development server (`npm run dev`).

## Steps
1. **Update Prisma schema**
   ```prisma
   // d:/company website/project-management/prisma/schema.prisma
   model Attendance {
     id        Int      @id @default(autoincrement())
     userId    Int
     loginAt   DateTime @default(now())
     logoutAt  DateTime?
     user      User     @relation(fields: [userId], references: [id])
   }

   model LeaveRequest {
     id          Int      @id @default(autoincrement())
     userId      Int
     startDate   DateTime
     endDate     DateTime
     reason      String
     status      LeaveStatus @default(PENDING)
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
     user        User      @relation(fields: [userId], references: [id])
   }

   enum LeaveStatus {
     PENDING
     APPROVED
     REJECTED
   }

   model Notification {
     id          Int      @id @default(autoincrement())
     userId      Int
     title       String
     message     String
     read        Boolean @default(false)
     createdAt   DateTime @default(now())
     user        User    @relation(fields: [userId], references: [id])
   }

   // Rename role PA to BA in the User model (if enum exists)
   enum Role {
     ADMIN
     HR
     EMPLOYEE
     BA   // formerly PA
   }
   ```
   // Run migration
   // turbo
   ```bash
   npx prisma migrate dev --name add_attendance_leave_notification
   ```

2. **Create API route for attendance** (`src/app/api/attendance/route.ts`)
   - `POST /attendance` records login (creates Attendance record).
   - `PATCH /attendance/:id` records logout (sets `logoutAt`).
   - Protect with `getSession` and ensure the user matches the record.

3. **Create API route for leave requests** (`src/app/api/leaves/route.ts`)
   - `POST` creates a `LeaveRequest` with status `PENDING`.
   - `GET` (admin/HR) lists pending requests.
   - `PATCH /leaves/:id` allows admin to set `status` to `APPROVED` or `REJECTED`.
   - On status change, create a `Notification` for the employee.
   - If `APPROVED` and it results in unpaid days, add a loss‑of‑pay notification.

4. **Create API route for notifications** (`src/app/api/notifications/route.ts`)
   - `GET` returns list of notifications for the logged‑in user.
   - `PATCH /notifications/:id` marks as read.

5. **Update authentication/session logic** (`src/app/api/auth/session/route.ts`)
   - On successful login, also create an `Attendance` entry (login timestamp).
   - Expose a `logout` endpoint that updates the latest Attendance record's `logoutAt`.

6. **Frontend adjustments** (high‑level, implement later)
   - Add **Register Employee** form with department dropdown and skill categories.
   - Show **Attendance** button (Login/Logout) that calls the new endpoints.
   - Add **Leave Request** page with form.
   - Add **Admin Dashboard** to approve/reject leaves.
   - Add **Notifications** bell icon to display messages.
   - Update role selection UI to replace **PA** with **Business Associate (BA)**.

7. **Testing**
   - Verify login creates Attendance record.
   - Verify logout updates the record.
   - Submit a leave request and ensure admin can approve/reject.
   - Confirm notifications appear correctly.
   - Ensure role rename does not break existing permission checks.

## // turbo-all
All steps that involve `run_command` (migration) are marked with `// turbo` and will be auto‑executed when the workflow is run.

---

**End of workflow**
