-- CreateTable
CREATE TABLE "SundayBulletin" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "sourceArchiveId" TEXT,
    "updatedById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SundayBulletin_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "SundayBulletin_sourceArchiveId_key" ON "SundayBulletin"("sourceArchiveId");
-- CreateIndex
CREATE INDEX "SundayBulletin_archivedAt_createdAt_idx" ON "SundayBulletin"("archivedAt", "createdAt");
-- AddForeignKey
ALTER TABLE "SundayBulletin" ADD CONSTRAINT "SundayBulletin_sourceArchiveId_fkey" FOREIGN KEY ("sourceArchiveId") REFERENCES "BulletinArchive"("id") ON DELETE SET NULL ON UPDATE CASCADE;
