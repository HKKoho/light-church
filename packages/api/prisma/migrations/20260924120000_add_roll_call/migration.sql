-- CreateTable
CREATE TABLE "RollCallGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RollCallGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RollCallMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RollCallMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RollCallSession" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "guestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RollCallSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RollCallMark" (
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RollCallMark_pkey" PRIMARY KEY ("sessionId","memberId")
);

-- CreateIndex
CREATE INDEX "RollCallMember_groupId_idx" ON "RollCallMember"("groupId");

-- CreateIndex
CREATE INDEX "RollCallSession_groupId_date_idx" ON "RollCallSession"("groupId", "date");

-- CreateIndex
CREATE INDEX "RollCallMark_memberId_idx" ON "RollCallMark"("memberId");

-- AddForeignKey
ALTER TABLE "RollCallMember" ADD CONSTRAINT "RollCallMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RollCallGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollCallSession" ADD CONSTRAINT "RollCallSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RollCallGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollCallMark" ADD CONSTRAINT "RollCallMark_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RollCallSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollCallMark" ADD CONSTRAINT "RollCallMark_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "RollCallMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

