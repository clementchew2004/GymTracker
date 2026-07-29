/*
  Warnings:

  - The `defaultDayType` column on the `Exercise` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `dayType` on the `Session` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Exercise" DROP COLUMN "defaultDayType",
ADD COLUMN     "defaultDayType" TEXT;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "dayType",
ADD COLUMN     "dayType" TEXT NOT NULL;

-- DropEnum
DROP TYPE "DayType";
