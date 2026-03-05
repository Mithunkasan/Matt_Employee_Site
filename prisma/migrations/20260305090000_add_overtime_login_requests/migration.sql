-- CreateTable
CREATE TABLE "overtime_login_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestDate" DATE NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "overtime_login_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "overtime_login_requests_userId_requestDate_key" ON "overtime_login_requests"("userId", "requestDate");

-- CreateIndex
CREATE INDEX "overtime_login_requests_requestDate_status_idx" ON "overtime_login_requests"("requestDate", "status");

-- AddForeignKey
ALTER TABLE "overtime_login_requests" ADD CONSTRAINT "overtime_login_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_login_requests" ADD CONSTRAINT "overtime_login_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
