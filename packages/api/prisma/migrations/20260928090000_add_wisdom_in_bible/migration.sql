-- CreateTable
CREATE TABLE "WisdomCycle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WisdomCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WisdomModule" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "lifeQuestions" JSONB NOT NULL DEFAULT '[]',
    "perspectives" JSONB NOT NULL DEFAULT '{}',
    "tensionGuide" TEXT NOT NULL DEFAULT '',
    "tensionGuideAudioUrl" TEXT NOT NULL DEFAULT '',
    "discussionPrompts" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WisdomModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WisdomResponse" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WisdomResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WisdomCycle_sortOrder_idx" ON "WisdomCycle"("sortOrder");

-- CreateIndex
CREATE INDEX "WisdomModule_cycleId_sortOrder_idx" ON "WisdomModule"("cycleId", "sortOrder");

-- CreateIndex
CREATE INDEX "WisdomResponse_moduleId_idx" ON "WisdomResponse"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "WisdomResponse_userId_moduleId_key" ON "WisdomResponse"("userId", "moduleId");

-- AddForeignKey
ALTER TABLE "WisdomModule" ADD CONSTRAINT "WisdomModule_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "WisdomCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WisdomResponse" ADD CONSTRAINT "WisdomResponse_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "WisdomModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WisdomResponse" ADD CONSTRAINT "WisdomResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
