-- AlterTable
ALTER TABLE "Column" ADD COLUMN     "isMilestone" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "completedAt" TIMESTAMP(3);
