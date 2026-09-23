-- Fix the responses table constraint to allow 'chapters_read' question type
-- Run this in Supabase SQL Editor

ALTER TABLE responses DROP CONSTRAINT IF EXISTS responses_question_type_check;
ALTER TABLE responses ADD CONSTRAINT responses_question_type_check
  CHECK (question_type IN ('life_question', 'discussion', 'summary', 'chapters_read'));

SELECT '✅ Constraint updated to allow chapters_read!' AS status;
