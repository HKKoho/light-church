-- ============================================================================
-- Diagnostic Script: Check Response-Module Mismatch
-- ============================================================================
-- Run this to diagnose why previous responses aren't showing
-- ============================================================================

-- 1. Check how many responses exist in database
SELECT '=== TOTAL RESPONSES ===' as section;
SELECT COUNT(*) as total_responses FROM responses;

-- ============================================================================

-- 2. Check responses grouped by module_id
SELECT '=== RESPONSES PER MODULE ===' as section;
SELECT
  r.module_id,
  m.title as module_title,
  COUNT(r.id) as response_count,
  COUNT(DISTINCT r.user_id) as unique_students
FROM responses r
LEFT JOIN modules m ON r.module_id = m.id
GROUP BY r.module_id, m.title
ORDER BY r.module_id;

-- ============================================================================

-- 3. Check for orphaned responses (responses pointing to non-existent modules)
SELECT '=== ORPHANED RESPONSES ===' as section;
SELECT
  r.module_id as missing_module_id,
  COUNT(*) as orphaned_response_count,
  STRING_AGG(DISTINCT r.user_id::text, ', ') as affected_users
FROM responses r
WHERE NOT EXISTS (SELECT 1 FROM modules m WHERE m.id = r.module_id)
GROUP BY r.module_id;

-- Expected: 0 orphaned responses

-- ============================================================================

-- 4. Check specific user's responses with module status
SELECT '=== SAMPLE USER RESPONSES ===' as section;

-- Replace 'SAMPLE_USER_ID' with actual user UUID to test
-- First, let's show all users:
SELECT
  u.id,
  u.name,
  u.role,
  COUNT(DISTINCT r.id) as total_responses,
  COUNT(DISTINCT up.module_id) as completed_modules
FROM users u
LEFT JOIN responses r ON u.id = r.user_id
LEFT JOIN user_progress up ON u.id = up.user_id AND up.completed = true
WHERE u.role = 'student'
GROUP BY u.id, u.name, u.role
ORDER BY u.name;

-- ============================================================================

-- 5. Check response keys to understand the format
SELECT '=== RESPONSE KEY FORMATS ===' as section;
SELECT
  question_key,
  question_type,
  question_index,
  COUNT(*) as count
FROM responses
GROUP BY question_key, question_type, question_index
ORDER BY question_type, question_index;

-- ============================================================================

-- 6. Detailed view: Check one student's data
SELECT '=== DETAILED STUDENT DATA (FIRST STUDENT) ===' as section;

WITH first_student AS (
  SELECT id, name FROM users WHERE role = 'student' LIMIT 1
)
SELECT
  r.module_id,
  m.title as module_title,
  m.status as module_status,
  r.question_key,
  LEFT(r.response_text, 50) as response_preview,
  r.created_at,
  r.updated_at
FROM responses r
JOIN first_student fs ON r.user_id = fs.id
LEFT JOIN modules m ON r.module_id = m.id
ORDER BY r.module_id, r.question_key;

-- ============================================================================

-- 7. Check if module IDs changed after migration
SELECT '=== MODULE ID CHECK ===' as section;
SELECT
  id,
  title,
  cycle_id,
  status
FROM modules
ORDER BY id;

-- Expected: IDs should be 1-24 in order
-- If IDs are different (e.g., UUIDs or different numbers), responses won't match!

-- ============================================================================

-- 8. Check life_questions structure
SELECT '=== LIFE QUESTIONS SAMPLE ===' as section;
SELECT
  lq.module_id,
  m.title as module_title,
  lq.question_order,
  LEFT(lq.question_text, 60) as question_preview,
  lq.question_type
FROM life_questions lq
JOIN modules m ON lq.module_id = m.id
WHERE lq.module_id IN (1, 2, 3)
ORDER BY lq.module_id, lq.question_order
LIMIT 10;

-- ============================================================================

-- 9. Test a specific module's complete data structure
SELECT '=== COMPLETE MODULE 1 DATA ===' as section;

SELECT 'Module Info:' as section;
SELECT * FROM modules WHERE id = 1;

SELECT 'Life Questions:' as section;
SELECT * FROM life_questions WHERE module_id = 1 ORDER BY question_order;

SELECT 'Perspectives:' as section;
SELECT * FROM perspectives WHERE module_id = 1;

SELECT 'Discussion Prompts:' as section;
SELECT * FROM discussion_prompts WHERE module_id = 1 ORDER BY prompt_order;

-- ============================================================================

-- 10. Check for data type mismatches
SELECT '=== DATA TYPE CHECK ===' as section;
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'responses'
ORDER BY ordinal_position;

-- ============================================================================
-- DIAGNOSIS GUIDE
-- ============================================================================

/*
COMMON ISSUES AND SOLUTIONS:

1. If "ORPHANED RESPONSES" shows count > 0:
   - Responses exist but point to modules that don't exist in database
   - SOLUTION: Module IDs changed during migration
   - FIX: Need to update response.module_id to match new module IDs

2. If "MODULE ID CHECK" shows IDs are not 1-24:
   - Migration created new IDs instead of preserving old ones
   - SOLUTION: Update responses table to match new IDs
   - FIX: Run mapping script to update responses.module_id

3. If responses exist but aren't showing in UI:
   - Check browser console for errors
   - Verify getUserResponses() is being called
   - Check if module.id matches response.module_id

4. If module.lifeQuestions is empty:
   - Check "LIFE QUESTIONS SAMPLE" query results
   - If empty, migration didn't copy life_questions
   - FIX: Re-run migration

5. If response_text is showing but UI is blank:
   - Check question_key format in "RESPONSE KEY FORMATS"
   - Ensure it matches expected pattern: life_question_input_{index}
   - Frontend might be using wrong key format
*/

-- ============================================================================
-- QUICK FIX QUERIES (Use if needed)
-- ============================================================================

-- If you need to check a specific user's responses:
-- (Replace 'USER_ID_HERE' with actual UUID)
/*
SELECT
  r.module_id,
  r.question_key,
  r.response_text,
  m.title as module_title,
  m.status
FROM responses r
LEFT JOIN modules m ON r.module_id = m.id
WHERE r.user_id = 'USER_ID_HERE'
ORDER BY r.module_id, r.question_key;
*/

-- If module IDs are mismatched (e.g., responses point to old IDs):
-- This would need a custom mapping based on your specific situation
/*
-- Example: If old module 1 is now module 25:
UPDATE responses SET module_id = 25 WHERE module_id = 1;
-- CAUTION: Only run if you've verified the mapping!
*/
