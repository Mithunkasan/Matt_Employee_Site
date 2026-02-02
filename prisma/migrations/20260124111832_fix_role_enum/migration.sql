/*
  Warnings:

  - You are about to drop the column `loginAt` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `logoutAt` on the `attendances` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PA';

-- AlterTable
ALTER TABLE "attendances" DROP COLUMN "loginAt",
DROP COLUMN "logoutAt",
ADD COLUMN     "checkIn" TIMESTAMP(3),
ADD COLUMN     "checkOut" TIMESTAMP(3),
ADD COLUMN     "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT';
