/*
  Warnings:

  - The `defaultDayType` column on the `Exercise` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Exercise" DROP COLUMN "defaultDayType",
ADD COLUMN     "defaultDayType" TEXT[] DEFAULT ARRAY[]::TEXT[];
