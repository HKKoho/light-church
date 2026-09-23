-- ============================================================================
-- Verification Script for cycle_analyses Table
-- ============================================================================
-- Run this in Supabase SQL Editor to verify the migration was successful
-- ============================================================================

-- 1. Check if table exists and view structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cycle_analyses'
ORDER BY ordinal_position;

-- Expected: 13 columns (id, user_id, cycle_id, analysis_text, generated_at,
--           regenerated_count, student_viewed, student_viewed_at, ai_model,
--           token_count, generation_duration_ms, created_at, updated_at)

-- ============================================================================

-- 2. Check if indexes exist
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'cycle_analyses'
ORDER BY indexname;

-- Expected: 5-6 indexes (primary key + 5 custom indexes)

-- ============================================================================

-- 3. Check if Row Level Security is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'cycle_analyses';

-- Expected: rowsecurity = true

-- ============================================================================

-- 4. Check RLS policies
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'cycle_analyses';

-- Expected: At least 1 policy named "Allow all via anon key for cycle analyses"

-- ============================================================================

-- 5. Check if table is empty or has data
SELECT
    COUNT(*) as total_analyses,
    COUNT(DISTINCT user_id) as unique_students,
    COUNT(DISTINCT cycle_id) as cycles_with_data
FROM cycle_analyses;

-- Expected: 0 if fresh install, or actual data if analyses have been generated

-- ============================================================================

-- 6. Check triggers
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'cycle_analyses';

-- Expected: 1 trigger for updating updated_at timestamp

-- ============================================================================

-- 7. Test constraints (should return empty if all constraints are valid)
SELECT
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'cycle_analyses'::regclass
ORDER BY contype, conname;

-- Expected:
-- - PRIMARY KEY (id)
-- - UNIQUE (user_id, cycle_id)
-- - FOREIGN KEYS (user_id, cycle_id)
-- - CHECK constraints (regenerated_count, token_count, duration)

-- ============================================================================
-- If all queries above return expected results, your migration is complete! ✅
-- ============================================================================
