-- AlterTable
ALTER TABLE "User" ADD COLUMN     "plannedDayTypes" TEXT[] DEFAULT ARRAY['PUSH', 'PULL', 'LEGS', 'UPPER']::TEXT[];
