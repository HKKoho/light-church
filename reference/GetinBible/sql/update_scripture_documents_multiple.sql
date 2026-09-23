-- ============================================================================
-- Update Scripture Pain Point Documents to support multiple documents
-- ============================================================================
-- Removes the UNIQUE constraint to allow multiple documents per pain point
-- ============================================================================

-- Drop the unique constraint that only allowed one document per pain point
ALTER TABLE scripture_pain_point_documents
  DROP CONSTRAINT IF EXISTS scripture_pain_point_documents_module_id_pain_point_index_key;

-- Add a document_order column to maintain order of multiple documents
ALTER TABLE scripture_pain_point_documents
  ADD COLUMN IF NOT EXISTS document_order INTEGER DEFAULT 0;

-- Create an index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_spp_documents_order
  ON scripture_pain_point_documents(module_id, pain_point_index, document_order);

-- ============================================================================
-- Note: Run this migration in Supabase SQL Editor
-- ============================================================================
