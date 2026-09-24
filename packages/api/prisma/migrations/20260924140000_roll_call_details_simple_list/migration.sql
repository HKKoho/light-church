-- AlterTable
ALTER TABLE "RollCallMember" ADD COLUMN     "birthYear" INTEGER,
ADD COLUMN     "followUpNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "followedUpAt" TIMESTAMP(3),
ADD COLUMN     "sex" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "RollCallSimpleList" (
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RollCallSimpleList_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "RollCallSimpleList" ADD CONSTRAINT "RollCallSimpleList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

