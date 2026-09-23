-- ============================================================================
-- COMPLETE DATABASE SETUP SCRIPT
-- ============================================================================
-- Run this ONCE in Supabase SQL Editor to set up all tables
-- Generated from all migration files in correct order
-- ============================================================================

-- ============================================================================
-- 1. BASE TABLES (users, responses, user_progress)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW(),
  password_hash TEXT,
  email TEXT,
  has_password BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL,
  question_key TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('life_question', 'discussion', 'summary', 'chapters_read')),
  question_index INTEGER,
  response_text TEXT,
  response_value TEXT,
  ai_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id, question_key)
);

CREATE INDEX IF NOT EXISTS idx_responses_user_module ON responses(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_responses_module ON responses(module_id);
CREATE INDEX IF NOT EXISTS idx_responses_question_key ON responses(question_key);

CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_module ON user_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON user_progress(completed);

-- Enable RLS on base tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CONTENT TABLES (cycles, modules, life_questions, perspectives, discussion_prompts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cycles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER REFERENCES cycles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  tension_guide TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS life_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  question_type TEXT DEFAULT 'open' CHECK (question_type IN ('open', 'multi_choice')),
  options JSONB DEFAULT NULL,
  youtube_url TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS perspectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  perspective_type TEXT NOT NULL CHECK (perspective_type IN ('PROVERBS', 'ECCLESIASTES', 'JOB')),
  book TEXT NOT NULL,
  theme TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discussion_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  prompt_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_cycle_id ON modules(cycle_id);
CREATE INDEX IF NOT EXISTS idx_modules_status ON modules(status);
CREATE INDEX IF NOT EXISTS idx_life_questions_module_id ON life_questions(module_id);
CREATE INDEX IF NOT EXISTS idx_life_questions_media_url ON life_questions(media_url) WHERE media_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_perspectives_module_id ON perspectives(module_id);
CREATE INDEX IF NOT EXISTS idx_discussion_prompts_module_id ON discussion_prompts(module_id);

-- Enable RLS on content tables
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE perspectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_prompts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. AI CONVERSATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL,
  session_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  audio_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_module ON ai_conversations(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session ON ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created ON ai_conversations(created_at DESC);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. DISCUSSION GROUPS TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS discussion_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id INTEGER NOT NULL,
  group_number INTEGER NOT NULL,
  max_size INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, group_number)
);

CREATE INDEX IF NOT EXISTS idx_discussion_groups_module ON discussion_groups(module_id);

CREATE TABLE IF NOT EXISTS group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES discussion_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_module ON group_memberships(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_module ON group_memberships(module_id);

ALTER TABLE discussion_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. CYCLE ANALYSES TABLE (for AI-generated student reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cycle_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle_id INTEGER NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  analysis_text TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  regenerated_count INTEGER NOT NULL DEFAULT 0,
  student_viewed BOOLEAN NOT NULL DEFAULT FALSE,
  student_viewed_at TIMESTAMPTZ,
  ai_model TEXT DEFAULT 'gpt-4o',
  token_count INTEGER,
  generation_duration_ms INTEGER,
  is_partial BOOLEAN NOT NULL DEFAULT FALSE,
  completion_percentage INTEGER DEFAULT 100,
  modules_completed INTEGER DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_cycle UNIQUE(user_id, cycle_id),
  CONSTRAINT valid_regeneration_count CHECK (regenerated_count >= 0),
  CONSTRAINT valid_token_count CHECK (token_count IS NULL OR token_count > 0),
  CONSTRAINT valid_duration CHECK (generation_duration_ms IS NULL OR generation_duration_ms > 0)
);

CREATE INDEX IF NOT EXISTS idx_cycle_analyses_user ON cycle_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_cycle_analyses_cycle ON cycle_analyses(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_analyses_generated_at ON cycle_analyses(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cycle_analyses_student_viewed ON cycle_analyses(student_viewed) WHERE student_viewed = FALSE;
CREATE INDEX IF NOT EXISTS idx_cycle_analyses_user_cycle ON cycle_analyses(user_id, cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_analyses_partial ON cycle_analyses(is_partial, completion_percentage);

ALTER TABLE cycle_analyses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. TRIGGER FUNCTION FOR AUTO-UPDATING updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_responses_updated_at ON responses;
CREATE TRIGGER update_responses_updated_at
  BEFORE UPDATE ON responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_progress_updated_at ON user_progress;
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_modules_updated_at ON modules;
CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cycles_updated_at ON cycles;
CREATE TRIGGER update_cycles_updated_at
  BEFORE UPDATE ON cycles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cycle_analyses_updated_at ON cycle_analyses;
CREATE TRIGGER update_cycle_analyses_updated_at
  BEFORE UPDATE ON cycle_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_group_member_count(group_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM group_memberships
  WHERE group_id = group_uuid;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- 8. RLS POLICIES (Allow all via anon key - security at app level)
-- ============================================================================
-- This app uses custom name-based authentication, not Supabase Auth
-- All security is enforced at application level by checking user.role

-- Users table
DROP POLICY IF EXISTS "Allow all via anon key for users" ON users;
CREATE POLICY "Allow all via anon key for users" ON users
  FOR ALL USING (true) WITH CHECK (true);

-- Responses table
DROP POLICY IF EXISTS "Allow all via anon key for responses" ON responses;
CREATE POLICY "Allow all via anon key for responses" ON responses
  FOR ALL USING (true) WITH CHECK (true);

-- User progress table
DROP POLICY IF EXISTS "Allow all via anon key for user_progress" ON user_progress;
CREATE POLICY "Allow all via anon key for user_progress" ON user_progress
  FOR ALL USING (true) WITH CHECK (true);

-- Cycles table
DROP POLICY IF EXISTS "Allow all via anon key for cycles" ON cycles;
CREATE POLICY "Allow all via anon key for cycles" ON cycles
  FOR ALL USING (true) WITH CHECK (true);

-- Modules table
DROP POLICY IF EXISTS "Allow all via anon key for modules" ON modules;
CREATE POLICY "Allow all via anon key for modules" ON modules
  FOR ALL USING (true) WITH CHECK (true);

-- Life questions table
DROP POLICY IF EXISTS "Allow all via anon key for life_questions" ON life_questions;
CREATE POLICY "Allow all via anon key for life_questions" ON life_questions
  FOR ALL USING (true) WITH CHECK (true);

-- Perspectives table
DROP POLICY IF EXISTS "Allow all via anon key for perspectives" ON perspectives;
CREATE POLICY "Allow all via anon key for perspectives" ON perspectives
  FOR ALL USING (true) WITH CHECK (true);

-- Discussion prompts table
DROP POLICY IF EXISTS "Allow all via anon key for discussion_prompts" ON discussion_prompts;
CREATE POLICY "Allow all via anon key for discussion_prompts" ON discussion_prompts
  FOR ALL USING (true) WITH CHECK (true);

-- AI conversations table
DROP POLICY IF EXISTS "Allow all via anon key for ai_conversations" ON ai_conversations;
CREATE POLICY "Allow all via anon key for ai_conversations" ON ai_conversations
  FOR ALL USING (true) WITH CHECK (true);

-- Discussion groups table
DROP POLICY IF EXISTS "Allow all via anon key for discussion_groups" ON discussion_groups;
CREATE POLICY "Allow all via anon key for discussion_groups" ON discussion_groups
  FOR ALL USING (true) WITH CHECK (true);

-- Group memberships table
DROP POLICY IF EXISTS "Allow all via anon key for group_memberships" ON group_memberships;
CREATE POLICY "Allow all via anon key for group_memberships" ON group_memberships
  FOR ALL USING (true) WITH CHECK (true);

-- Cycle analyses table
DROP POLICY IF EXISTS "Allow all via anon key for cycle_analyses" ON cycle_analyses;
CREATE POLICY "Allow all via anon key for cycle_analyses" ON cycle_analyses
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 9. FOREIGN KEY CONSTRAINTS (for PostgREST joins)
-- ============================================================================

ALTER TABLE user_progress
DROP CONSTRAINT IF EXISTS user_progress_module_id_fkey;

ALTER TABLE user_progress
ADD CONSTRAINT user_progress_module_id_fkey
FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE;

ALTER TABLE responses
DROP CONSTRAINT IF EXISTS responses_module_id_fkey;

ALTER TABLE responses
ADD CONSTRAINT responses_module_id_fkey
FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

SELECT '✅ Database setup complete!' AS status;
