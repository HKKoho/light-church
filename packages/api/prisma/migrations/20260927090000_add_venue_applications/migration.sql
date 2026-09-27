[dotenv@17.3.1] injecting env (30) from ../../.env -- tip: ⚙️  enable debug logging with { debug: true }
-- CreateTable
CREATE TABLE "VenueApplication" (
    "id" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactTitle" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "venueType" TEXT NOT NULL,
    "roomCount" INTEGER,
    "sessions" JSONB NOT NULL,
    "activityNature" TEXT NOT NULL,
    "activityMode" TEXT NOT NULL,
    "activityFee" DECIMAL(10,2),
    "targetAudience" TEXT[],
    "attendanceRange" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "repName" TEXT NOT NULL,
    "repTitle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenueApplication_status_createdAt_idx" ON "VenueApplication"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "VenueApplication" ADD CONSTRAINT "VenueApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

