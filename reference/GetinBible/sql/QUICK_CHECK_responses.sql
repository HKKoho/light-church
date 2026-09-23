-- ============================================================================
-- QUICK CHECK: Why aren't responses showing?
-- ============================================================================

-- 1. Do responses exist in the database?
SELECT
  '1. Total Responses in Database' as check_name,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ NO RESPONSES - Students need to re-submit'
    WHEN COUNT(*) > 0 THEN '✅ Responses exist'
  END as status
FROM responses;

-- ============================================================================

-- 2. Pick a random student and check their responses
SELECT
  '2. Sample Student Responses' as check_name,
  u.name as student_name,
  r.module_id,
  r.question_key,
  LEFT(r.response_text, 60) as response_preview,
  r.created_at
FROM responses r
JOIN users u ON r.user_id = u.id
WHERE u.role = 'student'
LIMIT 10;

-- ============================================================================

-- 3. Check if module_ids in responses match modules table
SELECT
  '3. Orphaned Responses Check' as check_name,
  COUNT(*) as orphaned_count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ All responses have valid module_id'
    WHEN COUNT(*) > 0 THEN '❌ PROBLEM: Responses point to non-existent modules!'
  END as status
FROM responses r
WHERE NOT EXISTS (SELECT 1 FROM modules m WHERE m.id = r.module_id);

-- ============================================================================

-- 4. Show which module IDs have responses
SELECT
  '4. Responses by Module' as check_name,
  r.module_id,
  m.title as module_title,
  COUNT(*) as response_count
FROM responses r
LEFT JOIN modules m ON r.module_id = m.id
GROUP BY r.module_id, m.title
ORDER BY r.module_id;

-- ============================================================================

-- 5. Check module structure (life_questions)
SELECT
  '5. Life Questions Check' as check_name,
  COUNT(*) as life_questions_count,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ NO LIFE QUESTIONS - Migration failed!'
    WHEN COUNT(*) > 0 THEN '✅ Life questions exist'
  END as status
FROM life_questions;

-- ============================================================================

-- 6. Sample life questions for module 1
SELECT
  '6. Module 1 Life Questions' as check_name,
  lq.question_order,
  lq.question_text,
  lq.question_type
FROM life_questions lq
WHERE lq.module_id = 1
ORDER BY lq.question_order;

-- ============================================================================

-- 7. Check if responses have the correct question_key format
SELECT
  '7. Response Key Formats' as check_name,
  question_key,
  COUNT(*) as count
FROM responses
GROUP BY question_key
ORDER BY question_key
LIMIT 20;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================

/*
WHAT TO LOOK FOR:

✅ Check 1: Should show responses > 0
   - If 0: Students lost all their data, need to re-submit
   - If >0: Data exists, problem is in loading logic

✅ Check 2: Should show actual student responses
   - Verify module_id matches expected (1-24)
   - Verify question_key format looks right

✅ Check 3: Should show 0 orphaned responses
   - If >0: Module IDs don't match between responses and modules tables

✅ Check 4: Should show responses distributed across modules
   - Verify module_id numbers are 1-24
   - Check if module_title is NULL (means module doesn't exist)

✅ Check 5: Should show life_questions > 0
   - If 0: Migration didn't copy life_questions properly

✅ Check 6: Should show actual questions for module 1
   - Verify question_text exists and looks correct

✅ Check 7: Should show keys like "life_question_input_0", "life_question_input_1"
   - If keys look different, frontend might use different format
*/
