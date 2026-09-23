-- CreateTable
CREATE TABLE "BulletinArchive" (
    "id" TEXT NOT NULL,
    "churchName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BulletinArchive_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "BulletinArchive_churchName_createdAt_idx" ON "BulletinArchive"("churchName", "createdAt");
-- CreateIndex
CREATE UNIQUE INDEX "BulletinArchive_churchName_sha256_key" ON "BulletinArchive"("churchName", "sha256");
-- AddForeignKey
ALTER TABLE "BulletinArchive" ADD CONSTRAINT "BulletinArchive_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
