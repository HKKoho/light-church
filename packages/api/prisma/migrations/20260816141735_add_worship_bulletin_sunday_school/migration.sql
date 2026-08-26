-- CreateEnum
CREATE TYPE "public"."BulletinStatus" AS ENUM ('pending', 'generated', 'published');

-- CreateEnum
CREATE TYPE "public"."SundaySchoolAgeGroup" AS ENUM ('nursery', 'kindergarten', 'junior', 'preteen', 'juniorHigh', 'seniorHigh');

-- CreateTable
CREATE TABLE "public"."ServiceAttendance" (
    "id" TEXT NOT NULL,
    "worshipServiceId" TEXT NOT NULL,
    "headcount" INTEGER NOT NULL,
    "breakdown" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByUserId" TEXT,

    CONSTRAINT "ServiceAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SundaySchoolClass" (
    "id" TEXT NOT NULL,
    "ageGroup" "public"."SundaySchoolAgeGroup" NOT NULL,
    "className" TEXT NOT NULL,
    "teacherName" TEXT,
    "curriculumTheme" TEXT,
    "lastLessonFilePath" TEXT,
    "lastGeneratedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SundaySchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorshipService" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "serviceLabel" TEXT NOT NULL,
    "preacher" TEXT,
    "sermonTitle" TEXT,
    "scriptureRef" TEXT,
    "worshipLeader" TEXT,
    "bulletinStatus" "public"."BulletinStatus" NOT NULL DEFAULT 'pending',
    "bulletinFilePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorshipService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceAttendance_worshipServiceId_idx" ON "public"."ServiceAttendance"("worshipServiceId" ASC);

-- CreateIndex
CREATE INDEX "SundaySchoolClass_ageGroup_idx" ON "public"."SundaySchoolClass"("ageGroup" ASC);

-- CreateIndex
CREATE INDEX "WorshipService_date_idx" ON "public"."WorshipService"("date" ASC);

-- AddForeignKey
ALTER TABLE "public"."ServiceAttendance" ADD CONSTRAINT "ServiceAttendance_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceAttendance" ADD CONSTRAINT "ServiceAttendance_worshipServiceId_fkey" FOREIGN KEY ("worshipServiceId") REFERENCES "public"."WorshipService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

