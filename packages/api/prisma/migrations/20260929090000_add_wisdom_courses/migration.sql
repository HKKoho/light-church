-- Courses on the Wisdom in Bible structure. Existing cycles move into the
-- original course, which stays on the church website as before.

-- CreateTable
CREATE TABLE "WisdomCourse" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "readingLabels" JSONB NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WisdomCourse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WisdomCourse_sortOrder_idx" ON "WisdomCourse"("sortOrder");

INSERT INTO "WisdomCourse" ("id", "title", "published", "sortOrder", "updatedAt")
VALUES ('wisdom-in-bible', 'Wisdom in Bible', true, 0, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "WisdomCycle" ADD COLUMN "courseId" TEXT;
UPDATE "WisdomCycle" SET "courseId" = 'wisdom-in-bible';
ALTER TABLE "WisdomCycle" ALTER COLUMN "courseId" SET NOT NULL;

-- DropIndex
DROP INDEX "WisdomCycle_sortOrder_idx";

-- CreateIndex
CREATE INDEX "WisdomCycle_courseId_sortOrder_idx" ON "WisdomCycle"("courseId", "sortOrder");

-- AddForeignKey
ALTER TABLE "WisdomCycle" ADD CONSTRAINT "WisdomCycle_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "WisdomCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
