-- AlterTable
ALTER TABLE "users" ADD COLUMN     "designation" TEXT;

-- CreateIndex
CREATE INDEX "attendances_date_status_idx" ON "attendances"("date", "status");

-- CreateIndex
CREATE INDEX "daily_reports_userId_idx" ON "daily_reports"("userId");

-- CreateIndex
CREATE INDEX "daily_reports_projectId_idx" ON "daily_reports"("projectId");

-- CreateIndex
CREATE INDEX "daily_reports_taskId_idx" ON "daily_reports"("taskId");

-- CreateIndex
CREATE INDEX "projects_assignedToId_idx" ON "projects"("assignedToId");

-- CreateIndex
CREATE INDEX "projects_createdById_idx" ON "projects"("createdById");

-- CreateIndex
CREATE INDEX "tasks_projectId_idx" ON "tasks"("projectId");

-- CreateIndex
CREATE INDEX "tasks_assignedToId_idx" ON "tasks"("assignedToId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_lastActivityAt_idx" ON "users"("lastActivityAt");
