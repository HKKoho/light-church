-- ============================================================================
-- DIAGNOSTIC: Check Module Completion Issues
-- ============================================================================
-- Run this to diagnose why module completions aren't showing in admin
-- ============================================================================

-- 1. Check if UNIQUE constraint exists (CRITICAL)
-- ============================================================================
SELECT
  '1️⃣ UNIQUE Constraint Check' as diagnostic,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ EXISTS - upsert will work'
    ELSE '❌ MISSING - Run FIX_user_progress_constraint.sql'
  END as status,
  STRING_AGG(conname, ', ') as constraint_name
FROM pg_constraint
WHERE conrelid = 'user_progress'::regclass
  AND contype = 'u'
  AND conname LIKE '%user_id%module_id%';

-- 2. Check RLS policies
-- ============================================================================
SELECT
  '2️⃣ RLS Policy Check' as diagnostic,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Policy exists'
    ELSE '❌ MISSING - Run FIX_rls_policies.sql'
  END as status,
  STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies
WHERE tablename = 'user_progress'
  AND policyname LIKE '%Allow all via anon key%';

-- 3. Check for actual completion data
-- ============================================================================
SELECT
  '3️⃣ Completion Data Check' as diagnostic,
  COUNT(*) as total_records,
  COUNT(CASE WHEN completed = true THEN 1 END) as completed_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT module_id) as unique_modules
FROM user_progress;

-- 4. Check Module 1 specifically
-- ============================================================================
SELECT
  '4️⃣ Module 1 Completions' as diagnostic,
  COUNT(*) as total_module_1_records,
  COUNT(CASE WHEN completed = true THEN 1 END) as completed_module_1,
  COUNT(DISTINCT user_id) as unique_users_module_1
FROM user_progress
WHERE module_id = 1;

-- 5. Check for duplicate records (should be 0)
-- ============================================================================
SELECT
  '5️⃣ Duplicate Records Check' as diagnostic,
  COUNT(*) as duplicate_groups,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ No duplicates'
    ELSE '⚠️ Duplicates exist - Run CLEANUP_duplicate_progress.sql first'
  END as status
FROM (
  SELECT user_id, module_id, COUNT(*) as dup_count
  FROM user_progress
  GROUP BY user_id, module_id
  HAVING COUNT(*) > 1
) duplicates;

-- 6. Check recent activity
-- ============================================================================
SELECT
  '6️⃣ Recent Completions' as diagnostic,
  u.name as student_name,
  up.module_id,
  up.completed,
  up.completed_at,
  CASE
    WHEN up.completed_at > NOW() - INTERVAL '7 days' THEN '🟢 Recent (< 7 days)'
    WHEN up.completed_at > NOW() - INTERVAL '30 days' THEN '🟡 Older (< 30 days)'
    ELSE '🔴 Old (> 30 days)'
  END as recency
FROM user_progress up
JOIN users u ON up.user_id = u.id
WHERE up.completed = true
ORDER BY up.completed_at DESC
LIMIT 10;

-- 7. Check if responses exist but progress doesn't
-- ============================================================================
SELECT
  '7️⃣ Orphaned Responses' as diagnostic,
  COUNT(DISTINCT r.user_id) as users_with_responses,
  COUNT(DISTINCT up.user_id) as users_with_progress,
  COUNT(DISTINCT r.user_id) - COUNT(DISTINCT up.user_id) as users_missing_progress
FROM responses r
LEFT JOIN user_progress up ON r.user_id = up.user_id AND r.module_id = up.module_id AND up.completed = true
WHERE r.module_id = 1;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================

/*
SCENARIO 1: UNIQUE constraint missing
- Check 1 shows: ❌ MISSING
- Action: Run sql/FIX_user_progress_constraint.sql
- Impact: Module completions fail silently

SCENARIO 2: RLS policy blocking
- Check 2 shows: ❌ MISSING
- Action: Run sql/FIX_rls_policies.sql
- Impact: Inserts blocked, completions not saved

SCENARIO 3: No completion data
- Check 3 shows: 0 completed_count
- Check 7 shows: users_with_responses > 0 but users_with_progress = 0
- Cause: Issues 1 or 2 above
- Action: Fix constraints/policies, then ask users to re-complete

SCENARIO 4: Data exists but not showing in admin
- Check 3 shows: completed_count > 0
- Check 6 shows: Recent completions exist
- Cause: Frontend issue, not database
- Action: Check admin analytics component, check module status (published?)

SCENARIO 5: Duplicate records
- Check 5 shows: ⚠️ Duplicates exist
- Action: Run sql/CLEANUP_duplicate_progress.sql before FIX_user_progress_constraint.sql
- Impact: Cannot add UNIQUE constraint until duplicates removed
*/
