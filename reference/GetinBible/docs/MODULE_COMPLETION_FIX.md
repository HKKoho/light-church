# Module Completion Data Not Showing - Root Cause & Fix

## Problem Summary
Users complete Module 1, but the completion data does not appear in the admin analytics dashboard.

## Root Causes Identified

### 🔴 Issue #1: Missing UNIQUE Constraint
**Location:** `user_progress` table
**Symptom:** Module completion fails silently
**Error:** `"there is no unique or exclusion constraint matching the ON CONFLICT"`

**Why it fails:**
- Code tries to upsert: `.upsert(data, { onConflict: 'user_id,module_id' })`
- Database missing UNIQUE constraint on `(user_id, module_id)`
- Supabase requires the constraint to exist for upsert to work
- Without it, completions fail and data is never saved

### 🟡 Issue #2: RLS Policies May Block Inserts
**Location:** `user_progress` table RLS policies
**Symptom:** Inserts blocked by restrictive policies
**Problem:** Original RLS policies check `auth.uid()` but app uses custom auth (not Supabase Auth)

**Why it fails:**
- App uses name-based login, not Supabase Auth
- `auth.uid()` always returns NULL
- RLS policies block all operations
- Need "allow all via anon key" policy

## Solution: Run Two SQL Migrations

### Step 1: Fix UNIQUE Constraint ⭐ CRITICAL
Run this migration file: `sql/FIX_user_progress_constraint.sql`

**What it does:**
```sql
-- Adds UNIQUE constraint on (user_id, module_id)
ALTER TABLE user_progress
ADD CONSTRAINT user_progress_user_id_module_id_key
UNIQUE (user_id, module_id);
```

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `sql/FIX_user_progress_constraint.sql`
3. Execute query
4. Verify success message: "✅ UNIQUE constraint added!"

### Step 2: Fix RLS Policies ⭐ REQUIRED
Run this migration file: `sql/FIX_rls_policies.sql`

**What it does:**
```sql
-- Allow all operations via anon key (custom auth)
CREATE POLICY "Allow all via anon key for user_progress"
ON user_progress
FOR ALL
USING (true)
WITH CHECK (true);
```

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `sql/FIX_rls_policies.sql`
3. Execute query
4. Verify policies are applied (check output at bottom of file)

### Step 3: Verify Fix Works

**Test module completion:**
1. Login as a student (not admin)
2. Complete Module 1 (go through all 5 steps)
3. Check browser console for errors:
   - ✅ No errors = success
   - ❌ "unique constraint" error = Step 1 not run
   - ❌ "RLS policy" error = Step 2 not run

**Check admin dashboard:**
1. Go to Admin → Analytics
2. Verify completion count increases
3. Check "Recent Activity" shows new completion
4. Check user progress table shows completed modules

## Technical Details

### Code Flow (How Completion Works)

1. **Student completes module:**
   - `components/BibleBookPlayer.tsx` → `onComplete` prop triggered

2. **Completion saved:**
   - `StudentHome.tsx` → `handleModuleComplete()` called
   - Calls `markModuleComplete(userId, moduleId)`

3. **Database upsert:**
   - `progressService.ts` → `markModuleComplete()`
   - Executes: `supabase.from('user_progress').upsert({...}, { onConflict: 'user_id,module_id' })`
   - **Requires UNIQUE constraint to exist**

4. **Admin views data:**
   - `analyticsService.ts` → queries `user_progress` table
   - Fetches: `.eq('completed', true)`
   - Displays in dashboard

### Database Schema

```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  module_id INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- THIS CONSTRAINT MUST EXIST:
  CONSTRAINT user_progress_user_id_module_id_key
    UNIQUE (user_id, module_id)
);
```

### Analytics Queries

All admin analytics query `user_progress` table:

```typescript
// Overall stats
const { data } = await supabase
  .from('user_progress')
  .select('id, user_id, module_id')
  .eq('completed', true);

// Module completion stats
const { data } = await supabase
  .from('user_progress')
  .select('module_id, user_id')
  .eq('completed', true);

// Recent activity
const { data } = await supabase
  .from('user_progress')
  .select(`
    completed_at,
    user:users(name),
    module:modules(title)
  `)
  .eq('completed', true)
  .order('completed_at', { ascending: false })
  .limit(10);
```

## Verification Queries

After running migrations, use these queries to verify:

### Check UNIQUE constraint exists:
```sql
SELECT
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'user_progress'::regclass
  AND contype = 'u';
```
Expected: `user_progress_user_id_module_id_key` (type: u)

### Check RLS policies:
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'user_progress'
ORDER BY policyname;
```
Expected: Policy named "Allow all via anon key for user_progress"

### Check existing completions:
```sql
SELECT
  COUNT(*) as total_completions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT module_id) as unique_modules
FROM user_progress
WHERE completed = true;
```

### Check Module 1 completions:
```sql
SELECT
  u.name as student_name,
  up.completed,
  up.completed_at
FROM user_progress up
JOIN users u ON up.user_id = u.id
WHERE up.module_id = 1
  AND up.completed = true
ORDER BY up.completed_at DESC;
```

### Check for duplicate records (should be 0):
```sql
SELECT
  user_id,
  module_id,
  COUNT(*) as duplicate_count
FROM user_progress
GROUP BY user_id, module_id
HAVING COUNT(*) > 1;
```

## Common Errors & Solutions

### Error: "there is no unique constraint matching ON CONFLICT"
**Solution:** Run `sql/FIX_user_progress_constraint.sql`

### Error: "new row violates row-level security policy"
**Solution:** Run `sql/FIX_rls_policies.sql`

### Error: "duplicate key value violates unique constraint"
**Solution:** Run `sql/CLEANUP_duplicate_progress.sql` first, then `sql/FIX_user_progress_constraint.sql`

### Completions still not showing:
1. Check browser console for errors during module completion
2. Verify user completed all 5 steps (not just submitted responses)
3. Check if `user.id` exists in `StudentHome.tsx`
4. Verify RLS policies allow SELECT for admin users
5. Check if modules are `published` status (not `draft`)

## Prevention: Future Proofing

### For Development:
- Always test module completion in dev environment
- Check Supabase logs for RLS policy violations
- Monitor browser console during student interactions

### For Production:
- Add error tracking (e.g., Sentry) to catch silent failures
- Set up database monitoring for constraint violations
- Create alerts for zero completions in 24-hour period
- Regular backups before schema changes

## Related Files

**Database Migrations:**
- `sql/000_create_base_tables.sql` - Original table creation
- `sql/FIX_user_progress_constraint.sql` - Adds UNIQUE constraint ⭐
- `sql/FIX_rls_policies.sql` - Fixes RLS policies ⭐
- `sql/CLEANUP_duplicate_progress.sql` - Removes duplicates (if needed)

**Code Files:**
- `services/progressService.ts` - Contains `markModuleComplete()`
- `services/analyticsService.ts` - Queries completion data
- `src/pages/student/StudentHome.tsx` - Triggers completion
- `components/BibleBookPlayer.tsx` - Module learning interface

## Status

✅ **Root causes identified**
✅ **Fix migrations created**
⏳ **Awaiting database migration execution**
⏳ **Awaiting verification**

---

**Last Updated:** 2026-01-08
**Priority:** CRITICAL - Blocks all module completion tracking
