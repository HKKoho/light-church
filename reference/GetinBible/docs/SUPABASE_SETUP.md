# Supabase Database Setup Guide

This guide will walk you through setting up the database for the WisdominBible Admin CMS.

## Overview

You'll need to:
1. Create a Supabase project (if you haven't already)
2. Run SQL migration scripts to create tables
3. Set up Row-Level Security (RLS) policies
4. Create your first admin user
5. Get your API credentials

---

## Step 1: Create a Supabase Project

1. **Go to Supabase:** https://supabase.com
2. **Sign in** (or create account)
3. **Click "New Project"**
4. **Fill in details:**
   - Name: `WisdominBible` (or your preferred name)
   - Database Password: (create a strong password - save it!)
   - Region: Choose closest to your users
   - Pricing Plan: Free tier is fine for testing
5. **Click "Create new project"**
6. **Wait 2-3 minutes** for project to be ready

---

## Step 2: Run Database Migration Scripts

### 2.1 Open SQL Editor

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**

### 2.2 Create Tables (Script 1)

1. **Copy the entire contents** of `sql/001_create_tables.sql`
2. **Paste** into the SQL Editor
3. **Click "Run"** (or press Cmd/Ctrl + Enter)
4. **Verify success** - You should see "Success. No rows returned"

This script creates:
- ✅ `cycles` table - Learning cycles/courses
- ✅ `modules` table - Individual lessons
- ✅ `life_questions` table - Reflection questions
- ✅ `perspectives` table - Three wisdom perspectives (Proverbs, Ecclesiastes, Job)
- ✅ `discussion_prompts` table - Group discussion questions
- ✅ Adds `role` column to existing `users` table

### 2.3 Set Up Security Policies (Script 2)

1. **Click "New query"** again
2. **Copy the entire contents** of `sql/002_create_rls_policies.sql`
3. **Paste** into the SQL Editor
4. **Click "Run"**
5. **Verify success** - You should see "Success. No rows returned"

This script creates Row-Level Security policies ensuring:
- ✅ Anyone can view published content
- ✅ Only admins can create/edit/delete content
- ✅ Admins can see drafts and archived content

---

## Step 3: Create Your First Admin User

You need to create an admin user to access the admin interface.

### Option A: Via SQL (Recommended)

1. **Open SQL Editor** → **New query**
2. **Run this query** (replace with your name):

```sql
-- Insert a test admin user
INSERT INTO users (id, name, role, last_login)
VALUES (
  gen_random_uuid(),
  'Your Name Here',  -- Change this to your name
  'admin',
  NOW()
)
RETURNING *;
```

3. **Save the returned `id`** - you'll need it to log in

### Option B: Via Table Editor

1. Click **"Table Editor"** in the left sidebar
2. Select the **`users`** table
3. Click **"Insert row"**
4. Fill in:
   - `id`: (leave blank - will auto-generate)
   - `name`: Your Name
   - `role`: admin
   - `last_login`: (leave blank - will auto-set)
5. Click **"Save"**

---

## Step 4: Verify Tables Created

1. Click **"Table Editor"** in the left sidebar
2. You should see these tables:
   - ✅ users (should already exist)
   - ✅ cycles
   - ✅ modules
   - ✅ life_questions
   - ✅ perspectives
   - ✅ discussion_prompts
   - ✅ user_progress (should already exist)
   - ✅ responses (should already exist)

---

## Step 5: Get Your API Credentials

You'll need these for your Vercel deployment.

1. Click **"Settings"** (gear icon) in the left sidebar
2. Click **"API"**
3. Copy these values:

   ```
   Project URL: https://xxxxx.supabase.co
   anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Save these** - you'll need them for Vercel environment variables:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon/public key

---

## Step 6: (Optional) Add Sample Data

If you want to test with sample data, you can add a test cycle and module:

```sql
-- Insert a test cycle
INSERT INTO cycles (title, description, sort_order)
VALUES ('智慧文學導論', '探索箴言、傳道書與約伯記的智慧', 1)
RETURNING *;

-- Insert a test module (replace cycle_id with the id from above)
INSERT INTO modules (
  cycle_id,
  title,
  subtitle,
  tension_guide,
  summary,
  status
) VALUES (
  1,  -- Replace with your cycle_id
  '第 1 課｜什麼是智慧？',
  '敬畏、失效與苦難中的尋求',
  '智慧不只是知識的累積，而是在矛盾中尋找平衡...',
  '智慧是在秩序、無常與苦難的張力中尋找生命的意義。',
  'published'
)
RETURNING *;
```

---

## Troubleshooting

### Error: "relation 'users' does not exist"

The `users` table should be created automatically when you first use Supabase auth. If it doesn't exist:

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW()
);
```

### Error: "permission denied for table"

Make sure RLS policies are created correctly. You can temporarily disable RLS for testing:

```sql
ALTER TABLE cycles DISABLE ROW LEVEL SECURITY;
ALTER TABLE modules DISABLE ROW LEVEL SECURITY;
-- etc...
```

**Warning:** Don't disable RLS in production!

### Can't log in as admin

1. Check that your user has `role = 'admin'`:
   ```sql
   SELECT id, name, role FROM users;
   ```

2. Update role if needed:
   ```sql
   UPDATE users SET role = 'admin' WHERE name = 'Your Name';
   ```

---

## Next Steps

Once your database is set up:

1. ✅ You have your Supabase credentials
2. ✅ Tables and policies are created
3. ✅ You have an admin user

**Now you can deploy to Vercel!** Use the credentials in your environment variables.

---

## Database Schema Overview

```
cycles (learning courses)
  ├── modules (lessons)
      ├── life_questions (reflection questions)
      ├── perspectives (3 wisdom books' viewpoints)
      └── discussion_prompts (group discussion)

users (students & admins)
  ├── user_progress (completed modules)
  └── responses (answers to questions)
```

---

## Security Notes

- ✅ RLS ensures students can only see published modules
- ✅ Only admins can create/edit/delete content
- ✅ Students can only modify their own progress and responses
- ✅ All admin actions require authentication
- ✅ The anon key is safe to use in frontend code

---

Need help? Check the SQL files in the `/sql` folder for the complete migration scripts.
