-- CreateEnum
CREATE TYPE "GovernanceModel" AS ENUM ('centralized', 'decentralized');

-- AlterTable
ALTER TABLE "CongregationProfile" ADD COLUMN     "governanceModel" "GovernanceModel" NOT NULL DEFAULT 'centralized';
