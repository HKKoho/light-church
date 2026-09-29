-- AlterTable
ALTER TABLE "RollCallMember" ADD COLUMN     "department" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phoneLast4" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "RollCallMark" ADD COLUMN     "method" TEXT NOT NULL DEFAULT 'roll';

-- CreateTable
CREATE TABLE "RollCallCareNote" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "authorId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'other',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RollCallCareNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RollCallCareNote_memberId_createdAt_idx" ON "RollCallCareNote"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "RollCallMember_groupId_phoneLast4_idx" ON "RollCallMember"("groupId", "phoneLast4");

-- AddForeignKey
ALTER TABLE "RollCallCareNote" ADD CONSTRAINT "RollCallCareNote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "RollCallMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollCallCareNote" ADD CONSTRAINT "RollCallCareNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing follow-ups become the first entry of each member's care log.
INSERT INTO "RollCallCareNote" ("id", "memberId", "kind", "note", "createdAt")
SELECT 'rcn_' || "id", "id", 'other', "followUpNote", "followedUpAt"
FROM "RollCallMember"
WHERE "followedUpAt" IS NOT NULL;
