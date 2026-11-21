-- Theology Library (docs/RAGplan.md Option A).
-- Needs the lightchurch-postgres:16-pgvector image (infra/docker/postgres).
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateTable
CREATE TABLE "ReadingSource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'book',
    "language" TEXT NOT NULL DEFAULT 'zh-TW',
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "pageCount" INTEGER,
    "ocrPagesUsed" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'processing',
    "statusDetail" TEXT,
    "doctrineTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "copyrightConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "copyrightNote" TEXT,
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "embeddingModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingChunk" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "page" INTEGER,
    "heading" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "scriptureRefs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadingSource_status_idx" ON "ReadingSource"("status");

-- CreateIndex
CREATE INDEX "ReadingSource_updatedAt_idx" ON "ReadingSource"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingChunk_sourceId_chunkIndex_key" ON "ReadingChunk"("sourceId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "ReadingChunk" ADD CONSTRAINT "ReadingChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ReadingSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Raw-SQL indexes Prisma cannot express. If a later `prisma migrate diff`
-- proposes dropping these, delete those DROP lines from that migration.
-- Meaning search (cosine distance on the embedding).
CREATE INDEX "ReadingChunk_embedding_hnsw_idx" ON "ReadingChunk" USING hnsw ("embedding" vector_cosine_ops);
-- Keyword search that works for Chinese as well as English (trigrams, not tsvector).
CREATE INDEX "ReadingChunk_text_trgm_idx" ON "ReadingChunk" USING gin ("text" gin_trgm_ops);
-- Exact Scripture-reference lookup.
CREATE INDEX "ReadingChunk_scriptureRefs_idx" ON "ReadingChunk" USING gin ("scriptureRefs");
