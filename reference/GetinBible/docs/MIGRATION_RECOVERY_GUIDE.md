# Migration Recovery Guide

## What Happened When You Ran the Migration?

When you clicked **"將所有循環和模組從代碼遷移到數據庫"** (Migrate all cycles and modules from code to database), the system:

1. ✅ Copied **4 learning cycles** from `constants.ts` → `cycles` table
2. ✅ Copied **24 modules** from `constants.ts` → `modules` table
3. ✅ Copied all associated data:
   - Life questions → `life_questions` table
   - Perspectives (Proverbs, Ecclesiastes, Job) → `perspectives` table
   - Discussion prompts → `discussion_prompts` table

### Important: Your Student Data is SAFE! 🛡️

The migration **only affects course content**, NOT student data:

- ✅ **Users** - Unchanged
- ✅ **Student progress** - Unchanged
- ✅ **Student responses** - Unchanged
- ✅ **AI conversations** - Unchanged
- ✅ **Cycle analyses** - Unchanged

The migration uses **UPSERT** (update or insert), so it won't delete existing data.

---

## Step 1: Verify Migration Success

**Run this in Supabase SQL Editor:**

1. Go to: https://supabase.com/dashboard
2. Project: `bxyqjzxvloxpyuxijewh`
3. Click **SQL Editor** → **New Query**
4. Copy and paste contents of: `sql/VERIFY_migration_status.sql`
5. Click **Run**

**Check the results:**

### Expected Counts:
- ✅ **Cycles:** 4
- ✅ **Modules:** 24 (6 per cycle)
- ✅ **Perspectives:** 72 (24 modules × 3 types)
- ✅ **Life Questions:** ~120-150 (varies by module)
- ✅ **Discussion Prompts:** ~50-80 (varies by module)

### Student Data Should Match Before Migration:
- **Users:** Same count as before
- **User Progress:** Same count as before
- **Responses:** Same count as before

**If these numbers look correct, your migration was successful! ✅**

---

## Step 2: If Something Went Wrong

### Option A: Re-run the Migration (Safe)

The migration is **idempotent** (safe to run multiple times):

1. Go to: https://wisdominbible.vercel.app/admin
2. Click **數據遷移** (Data Migration) in sidebar
3. Click **"開始遷移"** (Start Migration) again
4. Click **"驗證"** (Validate) to check results

**This will:**
- Update any incorrect data
- Not create duplicates (uses UPSERT)
- Not delete student data

### Option B: Rollback and Start Fresh (Dangerous ⚠️)

**WARNING:** Only use this if you want to **delete all course content** and start over.

**Before rollback:**
1. Verify you have no important custom-edited modules
2. Understand this will delete all cycles, modules, and related course content
3. Student data (users, progress, responses) will remain intact

**To rollback:**

#### Method 1: Via Admin Interface
1. Go to: https://wisdominbible.vercel.app/admin
2. Click **數據遷移** (Data Migration)
3. Click **"回滾"** (Rollback) button (red button)
4. Confirm the dangerous action
5. Wait for completion
6. Re-run migration: Click **"開始遷移"**

#### Method 2: Via SQL (Manual)
```sql
-- WARNING: This deletes ALL course content!
DELETE FROM discussion_prompts;
DELETE FROM perspectives;
DELETE FROM life_questions;
DELETE FROM modules;
DELETE FROM cycles;

-- Then re-run the migration via admin interface
```

**After rollback, you MUST re-run the migration** or your app will have no content!

---

## Step 3: Verify Student Experience Wasn't Affected

**Test as a student:**

1. Logout from admin
2. Login as a test student
3. Navigate to module list
4. Check:
   - [ ] All 24 modules are visible
   - [ ] Modules are organized in 4 cycles (6 each)
   - [ ] Can open and view module content
   - [ ] Previous progress is still marked complete
   - [ ] Can view previous responses

**If everything works, you're done! ✅**

---

## Common Issues & Solutions

### Issue 1: "No modules showing on student interface"

**Cause:** Modules migrated but have status = 'draft'

**Solution:**
```sql
-- Set all modules to published
UPDATE modules SET status = 'published';
```

### Issue 2: "Modules show but perspectives are missing"

**Cause:** Perspectives didn't migrate correctly

**Solution:**
1. Go to admin → Data Migration
2. Click "開始遷移" again (will re-insert perspectives)
3. Verify with: `SELECT COUNT(*) FROM perspectives;` (should be 72)

### Issue 3: "Student progress disappeared"

**Cause:** This should NOT happen (progress is in separate table)

**Verification:**
```sql
-- Check if progress still exists
SELECT COUNT(*) FROM user_progress WHERE completed = true;
```

**If count is 0:** This means something went wrong. Check:
1. Did you accidentally run rollback on wrong table?
2. Check Supabase logs for errors

**Recovery:** You may need to restore from backup if available.

### Issue 4: "Getting errors when generating cycle analyses"

**Cause:** Module IDs may have changed after migration

**Solution:**
```sql
-- Check if module IDs are correct (should be 1-24)
SELECT id, title FROM modules ORDER BY id;
```

If IDs are different, you may need to update the `constants.ts` to match database IDs.

---

## Understanding the Migration System

### What is constants.ts?

`constants.ts` is the **original source of truth** for course content. It contains:
- Hardcoded module data (24 modules)
- Hardcoded cycle data (4 cycles)
- Life questions, perspectives, discussion prompts

### Why migrate to database?

**Before migration:**
- Course content was hardcoded in TypeScript
- Couldn't edit content without code deployment
- Admin CMS had no data to work with

**After migration:**
- Course content stored in database
- Can edit via admin interface (no code deployment needed)
- Admin CMS fully functional

### Can I edit content now?

**Yes!** After migration, you can:
1. Go to admin → **模組管理** (Module Management)
2. Click **編輯** on any module
3. Edit title, subtitle, perspectives, questions, etc.
4. Click **保存** (Save)
5. Changes are live immediately!

### Is constants.ts still used?

**After migration:** No, the app now reads from database instead of constants.ts

**Before migration:** Yes, student interface still uses constants.ts

**Recommendation:** Keep constants.ts as backup, but all edits should go through admin CMS after migration.

---

## Verification Checklist

Use this checklist after migration:

### Database Verification
- [ ] 4 cycles exist in database
- [ ] 24 modules exist in database
- [ ] 72 perspectives exist (24 modules × 3)
- [ ] Life questions exist (run count query)
- [ ] Discussion prompts exist (run count query)

### Student Data Verification
- [ ] User count unchanged
- [ ] User progress count unchanged
- [ ] Responses count unchanged
- [ ] Cycle analyses count unchanged

### Functional Verification
- [ ] Student can view module list
- [ ] Student can open and read modules
- [ ] All 3 perspectives visible per module
- [ ] Life questions display correctly
- [ ] Previous progress still shows as complete

### Admin CMS Verification
- [ ] Can view modules in Module Management
- [ ] Can edit a module and save
- [ ] Can create new module
- [ ] Can change module status (draft/published/archived)
- [ ] Can generate cycle analyses

---

## Need More Help?

### Quick Health Check Query

Run this to get a quick overview:

```sql
SELECT
  'Cycles' as table_name,
  COUNT(*) as count,
  '4' as expected
FROM cycles
UNION ALL
SELECT 'Modules', COUNT(*), '24' FROM modules
UNION ALL
SELECT 'Perspectives', COUNT(*), '72' FROM perspectives
UNION ALL
SELECT 'Users', COUNT(*), 'unchanged' FROM users
UNION ALL
SELECT 'User Progress', COUNT(*), 'unchanged' FROM user_progress
UNION ALL
SELECT 'Responses', COUNT(*), 'unchanged' FROM responses;
```

**If all counts look reasonable, you're good! ✅**

### Still Stuck?

1. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Logs
   - Look for errors during migration

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Check for errors when loading modules

3. **Test a specific module:**
   ```sql
   -- View module 1 details
   SELECT * FROM modules WHERE id = 1;

   -- View module 1's perspectives
   SELECT * FROM perspectives WHERE module_id = 1;

   -- View module 1's life questions
   SELECT * FROM life_questions WHERE module_id = 1;
   ```

---

## Summary

**The migration is safe and reversible:**
- ✅ Student data is never touched
- ✅ Can re-run migration anytime (uses UPSERT)
- ✅ Can rollback and start fresh if needed
- ✅ Admin CMS becomes fully functional after migration

**Most common outcome:**
- Migration succeeded
- All data is correct
- App works normally
- You can now edit content via admin interface!

**Next steps:**
1. Run `sql/VERIFY_migration_status.sql` to confirm success
2. Test student interface to verify nothing broke
3. Try editing a module in admin CMS to see it works!

---

**Generated:** 2026-01-06
**Version:** 1.0
