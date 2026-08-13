-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Department" ADD VALUE 'discipleship';
ALTER TYPE "Department" ADD VALUE 'church_administration';

-- AlterTable
ALTER TABLE "AgentDefinition" ADD COLUMN     "toolConfig" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "allowBrowserCdp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxConcurrentBrowserSessions" INTEGER NOT NULL DEFAULT 2;
