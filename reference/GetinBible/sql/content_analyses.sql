-- Content Analyses Table for Biblical Content Analysis Feature
-- This table stores AI-generated analyses of various content types (YouTube, documents, images, audio, transcripts)

CREATE TABLE IF NOT EXISTS content_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('youtube', 'document', 'image', 'audio', 'transcript')),
  content_title VARCHAR(500),
  source_url TEXT,
  original_filename VARCHAR(255),
  summary TEXT,
  educational_purpose TEXT,
  core_topics JSONB DEFAULT '[]'::jsonb,
  biblical_connections JSONB DEFAULT '[]'::jsonb,
  practical_applications JSONB DEFAULT '[]'::jsonb,
  full_analysis_markdown TEXT,
  ai_model VARCHAR(50) DEFAULT 'gemini-2.5-flash',
  token_count INTEGER,
  generation_duration_ms INTEGER,
  content_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_content_analyses_user_id ON content_analyses(user_id);

-- Index for content hash lookups (caching)
CREATE INDEX IF NOT EXISTS idx_content_analyses_content_hash ON content_analyses(content_hash);

-- Index for ordering by created_at
CREATE INDEX IF NOT EXISTS idx_content_analyses_created_at ON content_analyses(created_at DESC);

-- Enable Row Level Security
ALTER TABLE content_analyses ENABLE ROW LEVEL SECURITY;

-- Allow all operations via anon key (security handled at app level)
CREATE POLICY "Allow all operations on content_analyses" ON content_analyses
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_content_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_analyses_updated_at
  BEFORE UPDATE ON content_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_content_analyses_updated_at();
