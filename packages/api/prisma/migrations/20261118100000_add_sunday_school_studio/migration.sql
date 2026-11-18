-- Sunday School Studio: class profiles, AI-drafted courses and lessons.
-- One starter profile so teachers can draft a course straight away.

-- CreateTable
CREATE TABLE "SundaySchoolProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ageStage" TEXT NOT NULL,
    "literacyLevel" TEXT NOT NULL,
    "spiritualMaturity" TEXT NOT NULL,
    "bibleTranslation" TEXT NOT NULL,
    "tradition" TEXT NOT NULL,
    "guardrails" TEXT NOT NULL DEFAULT '',
    "classSize" INTEGER NOT NULL DEFAULT 12,
    "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 45,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SundaySchoolProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SundaySchoolCourse" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'zh-TW',
    "methodology" TEXT NOT NULL,
    "deliveryFormat" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "syllabusApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SundaySchoolCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SundaySchoolLesson" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "passage" TEXT NOT NULL,
    "bigIdea" TEXT NOT NULL DEFAULT '',
    "learningObjective" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'outline',
    "methodology" TEXT NOT NULL,
    "participationLevel" INTEGER NOT NULL DEFAULT 3,
    "deliveryFormat" TEXT NOT NULL,
    "targetDurationMinutes" INTEGER NOT NULL DEFAULT 45,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "exegesis" JSONB,
    "review" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SundaySchoolLesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SundaySchoolCourse_updatedAt_idx" ON "SundaySchoolCourse"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SundaySchoolLesson_courseId_weekNumber_key" ON "SundaySchoolLesson"("courseId", "weekNumber");

-- AddForeignKey
ALTER TABLE "SundaySchoolCourse" ADD CONSTRAINT "SundaySchoolCourse_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SundaySchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SundaySchoolLesson" ADD CONSTRAINT "SundaySchoolLesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "SundaySchoolCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;


INSERT INTO "SundaySchoolProfile" ("id", "name", "description", "ageStage", "literacyLevel", "spiritualMaturity", "bibleTranslation", "tradition", "guardrails", "classSize", "defaultDurationMinutes", "updatedAt")
VALUES ('ss-profile-adults', '成人主日學 Adult class', 'Adults reading a book of the Bible together.', 'mixed_adults', 'conversational', 'growing', 'CUNP', 'baptist', '', 15, 45, CURRENT_TIMESTAMP);
