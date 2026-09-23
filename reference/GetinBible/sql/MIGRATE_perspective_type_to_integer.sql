-- ============================================================================
-- MIGRATION: Move perspective to modules table
-- ============================================================================
-- Changes:
-- 1. Add theme and description columns to modules table
-- 2. Migrate data from perspectives table (using perspective 1 / PROVERBS data)
-- 3. Drop perspectives table
-- ============================================================================

-- Step 1: Add new columns to modules table
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS theme TEXT;

ALTER TABLE modules
ADD COLUMN IF NOT EXISTS description TEXT;

-- Step 2: Migrate data from perspectives (use first perspective for each module)
-- perspective_type 1 = PROVERBS (the column is now an integer)
UPDATE modules m
SET
  theme = p.theme,
  description = p.description
FROM perspectives p
WHERE p.module_id = m.id
  AND p.perspective_type = 1;

-- Step 3: Drop the perspectives table
DROP TABLE IF EXISTS perspectives;

-- ============================================================================
-- Verify the migration
-- ============================================================================
SELECT 'Migration complete!' AS status;
SELECT id, title, theme, description FROM modules LIMIT 5;
