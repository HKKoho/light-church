-- ============================================================================
-- Migration Verification Script
-- ============================================================================
-- Run this to check your database after migration
-- ============================================================================

-- 1. Check Cycles (Should be 4)
SELECT '=== CYCLES ===' as section;
SELECT
  id,
  title,
  description,
  sort_order
FROM cycles
ORDER BY sort_order;

SELECT COUNT(*) as total_cycles FROM cycles;
-- Expected: 4 cycles

-- ============================================================================

-- 2. Check Modules (Should be 24)
SELECT '=== MODULES ===' as section;
SELECT
  id,
  cycle_id,
  title,
  status,
  (SELECT title FROM cycles WHERE id = modules.cycle_id) as cycle_title
FROM modules
ORDER BY id;

SELECT COUNT(*) as total_modules FROM modules;
-- Expected: 24 modules

-- ============================================================================

-- 3. Check Modules Per Cycle (Should be 6 each)
SELECT '=== MODULES PER CYCLE ===' as section;
SELECT
  c.id as cycle_id,
  c.title as cycle_title,
  COUNT(m.id) as module_count
FROM cycles c
LEFT JOIN modules m ON c.id = m.cycle_id
GROUP BY c.id, c.title
ORDER BY c.id;
-- Expected: Each cycle should have 6 modules

-- ============================================================================

-- 4. Check Life Questions
SELECT '=== LIFE QUESTIONS ===' as section;
SELECT COUNT(*) as total_life_questions FROM life_questions;
-- Expected: Should match total from constants.ts (varies by module)

-- ============================================================================

-- 5. Check Perspectives (Should be 72: 24 modules × 3 perspectives)
SELECT '=== PERSPECTIVES ===' as section;
SELECT
  perspective_type,
  COUNT(*) as count
FROM perspectives
GROUP BY perspective_type
ORDER BY perspective_type;

SELECT COUNT(*) as total_perspectives FROM perspectives;
-- Expected: 72 total (24 per type: PROVERBS, ECCLESIASTES, JOB)

-- ============================================================================

-- 6. Check Discussion Prompts
SELECT '=== DISCUSSION PROMPTS ===' as section;
SELECT COUNT(*) as total_discussion_prompts FROM discussion_prompts;

-- ============================================================================

-- 7. CHECK STUDENT DATA (Should be UNCHANGED)
SELECT '=== STUDENT DATA (SHOULD BE UNCHANGED) ===' as section;

SELECT
  'Users' as table_name,
  COUNT(*) as count
FROM users
UNION ALL
SELECT
  'User Progress' as table_name,
  COUNT(*) as count
FROM user_progress
UNION ALL
SELECT
  'Responses' as table_name,
  COUNT(*) as count
FROM responses
UNION ALL
SELECT
  'Cycle Analyses' as table_name,
  COUNT(*) as count
FROM cycle_analyses;

-- ============================================================================

-- 8. Detailed Student Data Check
SELECT '=== DETAILED STUDENT DATA ===' as section;

SELECT
  u.name as student_name,
  u.role,
  COUNT(DISTINCT up.module_id) as modules_completed,
  COUNT(DISTINCT r.id) as total_responses,
  COUNT(DISTINCT ca.id) as analyses_generated
FROM users u
LEFT JOIN user_progress up ON u.id = up.user_id AND up.completed = true
LEFT JOIN responses r ON u.id = r.user_id
LEFT JOIN cycle_analyses ca ON u.id = ca.user_id
WHERE u.role = 'student'
GROUP BY u.id, u.name, u.role
ORDER BY u.name;

-- ============================================================================

-- 9. Check for Orphaned Data (Should be 0)
SELECT '=== ORPHANED DATA CHECK ===' as section;

-- Check if any user_progress references non-existent modules
SELECT
  'Orphaned user_progress' as issue,
  COUNT(*) as count
FROM user_progress up
WHERE NOT EXISTS (SELECT 1 FROM modules m WHERE m.id = up.module_id);

-- Check if any responses reference non-existent modules
SELECT
  'Orphaned responses' as issue,
  COUNT(*) as count
FROM responses r
WHERE NOT EXISTS (SELECT 1 FROM modules m WHERE m.id = r.module_id);

-- Expected: All counts should be 0

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '=== MIGRATION SUMMARY ===' as section;

SELECT
  '✓ Cycles' as item,
  COUNT(*) as count,
  '4 expected' as expected
FROM cycles
UNION ALL
SELECT
  '✓ Modules' as item,
  COUNT(*) as count,
  '24 expected' as expected
FROM modules
UNION ALL
SELECT
  '✓ Perspectives' as item,
  COUNT(*) as count,
  '72 expected (24×3)' as expected
FROM perspectives
UNION ALL
SELECT
  '✓ Life Questions' as item,
  COUNT(*) as count,
  'varies' as expected
FROM life_questions
UNION ALL
SELECT
  '✓ Discussion Prompts' as item,
  COUNT(*) as count,
  'varies' as expected
FROM discussion_prompts
UNION ALL
SELECT
  '✓ Users (unchanged)' as item,
  COUNT(*) as count,
  'should match before' as expected
FROM users
UNION ALL
SELECT
  '✓ User Progress (unchanged)' as item,
  COUNT(*) as count,
  'should match before' as expected
FROM user_progress
UNION ALL
SELECT
  '✓ Responses (unchanged)' as item,
  COUNT(*) as count,
  'should match before' as expected
FROM responses;

-- ============================================================================
-- If all numbers look correct, your migration was successful! ✅
-- ============================================================================
