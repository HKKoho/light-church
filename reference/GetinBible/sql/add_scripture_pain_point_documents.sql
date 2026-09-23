-- ============================================================================
-- Scripture Pain Point Documents Table
-- ============================================================================
-- Stores metadata for document files (PDF/Word) associated with Scripture Pain Points
-- Actual files are stored in Supabase Storage bucket: scripture-documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS scripture_pain_point_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  pain_point_index INTEGER NOT NULL,  -- 0-based index matching the pain point order
  file_name TEXT NOT NULL,            -- Original filename
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'doc', 'docx')),
  storage_path TEXT NOT NULL,         -- Path in Supabase Storage bucket
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, pain_point_index)  -- One document per pain point
);

-- Index for faster lookups by module
CREATE INDEX IF NOT EXISTS idx_spp_documents_module
  ON scripture_pain_point_documents(module_id);

-- Enable Row Level Security
ALTER TABLE scripture_pain_point_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read documents (students need to view/download)
CREATE POLICY "Anyone can read scripture pain point documents"
  ON scripture_pain_point_documents
  FOR SELECT
  USING (true);

-- Policy: Admins can insert/update/delete documents
CREATE POLICY "Admins can manage scripture pain point documents"
  ON scripture_pain_point_documents
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- IMPORTANT: Supabase Storage Bucket Setup
-- ============================================================================
-- You need to create a storage bucket manually in Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create new bucket: "scripture-documents"
-- 3. Set as Public bucket (for read access)
-- 4. Set file size limit: 10MB
-- 5. Add allowed MIME types:
--    - application/pdf
--    - application/msword
--    - application/vnd.openxmlformats-officedocument.wordprocessingml.document
-- ============================================================================
