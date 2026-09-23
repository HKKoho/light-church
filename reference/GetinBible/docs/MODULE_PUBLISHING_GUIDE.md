# Module Publishing Guide for Students
## Why Students Don't See Your Published Modules

**Last Updated:** January 8, 2026

---

## 🔍 **Problem:**
You published a module in the admin panel, but students can't see it on the homepage.

---

## ✅ **Solution: Check Module Status**

### **Step 1: Verify Module Status in Admin**

1. **Login as Admin:**
   - Go to: http://localhost:3001/admin (local) or https://wisdominbible.vercel.app/admin (production)

2. **Go to Modules Manager:**
   - Click "Modules Manager" in the left sidebar

3. **Check the Status Column:**
   - Look for your module in the table
   - Check the **"Status"** badge:
     - 🟢 **"Published"** (green) = Students CAN see it ✅
     - 🟡 **"Draft"** (gray) = Students CANNOT see it ❌
     - 🔴 **"Archived"** (red) = Students CANNOT see it ❌

### **Step 2: Change Status to "Published"**

If your module status is "Draft":

1. Click **"編輯" (Edit)** button for that module
2. Stay on the **"基本資訊" (Basic Info)** tab
3. Find the **"模組狀態" (Module Status)** dropdown
4. Change from **"Draft"** to **"Published"**
5. Click **"儲存模組" (Save Module)** at the bottom
6. Return to Modules Manager and verify status changed to green "Published"

---

## 📖 **How the System Works:**

### **Admin CMS:**
- Can see ALL modules (draft, published, archived)
- Full edit access

### **Student Interface:**
- Only sees modules with status = **"published"**
- Cannot see draft or archived modules
- This is enforced at the database level in `getPublishedModules()`

### **Code Reference:**
```typescript
// services/moduleService.ts line 191
export async function getPublishedModules(): Promise<Module[]> {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('status', 'published')  // ← Only fetches published modules
    .order('id', { ascending: true });
  // ...
}
```

---

## 🔧 **Debugging Steps:**

### **1. Check Browser Console (F12)**

After logging in as a student and going to the homepage:

1. Press **F12** to open Developer Tools
2. Click **"Console"** tab
3. Look for these messages:
   ```
   📚 Fetched cycles: [...]
   📖 Fetched published modules: [...]
   ✅ Number of published modules: X
   ```

**What the numbers mean:**
- `Number of published modules: 0` → No modules are published yet
- `Number of published modules: 5` → 5 modules are published and should appear

### **2. Check Empty State Message**

If students see this message:
```
目前沒有已發布的課程
請聯絡管理員發布課程，或稍後再試
💡 提示：管理員需要將模組狀態設為「已發布」學生才能看到
```

This means **NO modules have status = "published"** in the database.

**Action:** Go to admin and publish at least one module.

### **3. Clear Browser Cache**

Sometimes the browser caches the old version:

- **Windows:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`
- Or open in **Incognito/Private** mode

---

## 📋 **Common Mistakes:**

### ❌ **Mistake #1: Forgetting to Change Status**
**Problem:** Created a module but left status as "Draft"
**Solution:** Edit module → Change status to "Published" → Save

### ❌ **Mistake #2: Assuming "Save" Publishes**
**Problem:** Clicked "Save" but status was still "Draft"
**Solution:** Explicitly change the status dropdown to "Published"

### ❌ **Mistake #3: Testing in Production Without Deploying**
**Problem:** Changed status locally but production hasn't updated
**Solution:** Make sure changes are deployed to Vercel

---

## 🎯 **Quick Checklist:**

Before asking "Why can't students see my module?":

- [ ] Module status is set to **"Published"** (not Draft)
- [ ] Saved the module after changing status
- [ ] Refreshed the browser (Ctrl+Shift+R)
- [ ] Checked browser console for debug messages
- [ ] Tested as student user (not admin)
- [ ] If testing production: Changes are deployed to Vercel

---

## 📊 **Module Status Workflow:**

```
CREATE MODULE
     ↓
Default Status: "Draft"
     ↓
(Students CANNOT see it)
     ↓
Edit Module
     ↓
Change Status → "Published"
     ↓
Save Module
     ↓
(Students CAN see it)
```

---

## 🚀 **Production vs Local Testing:**

### **Local (localhost:3001):**
- Changes are immediate
- No deployment needed
- Only you can see it

### **Production (vercel.app):**
- Requires Git push + Vercel deployment
- Everyone can see it
- May take 2-5 minutes to deploy

**If you changed status locally:**
1. Commit and push changes to GitHub (if database changed)
2. Or just change status in production admin panel directly

---

## 🔗 **Related Files:**

- **Student Interface:** `components/BibleBooklist.tsx` (lines 17-40)
- **Module Service:** `services/moduleService.ts` (lines 191-206)
- **Admin Editor:** `src/pages/admin/ModuleEditor.tsx`
- **Module Status Type:** `types.ts` (line 44)

---

## 💡 **Pro Tips:**

### **Tip 1: Use Draft for Work-in-Progress**
- Create modules as "Draft" while building content
- Only change to "Published" when ready for students
- This prevents students from seeing incomplete modules

### **Tip 2: Use Archived for Old Modules**
- Change status to "Archived" for outdated modules
- Students won't see them, but they're not deleted
- Easy to restore by changing back to "Published"

### **Tip 3: Test with a Student Account**
- Create a test student account
- Login as student to verify modules appear
- Don't test while logged in as admin!

---

## 📞 **Still Not Working?**

If modules still don't appear after following this guide:

1. **Check Database Directly:**
   ```sql
   SELECT id, title, status FROM modules ORDER BY id;
   ```
   All visible modules should have `status = 'published'`

2. **Check RLS Policies:**
   Make sure Row Level Security allows students to read published modules

3. **Check Network Tab:**
   - F12 → Network tab
   - Look for API calls to `/modules`
   - Check if response contains your modules

4. **Check Supabase Dashboard:**
   - Go to Table Editor
   - Open `modules` table
   - Manually verify status column values

---

## ✅ **Success Indicators:**

You'll know it's working when:

1. ✅ Admin panel shows module with green "Published" badge
2. ✅ Browser console shows `Number of published modules: X` (X > 0)
3. ✅ Student homepage displays the module cards
4. ✅ Clicking module opens the BibleBookPlayer

---

**Remember:** The most common issue is simply forgetting to change the status from "Draft" to "Published"!

---

**Document Version:** 1.0
**Created:** January 8, 2026
**For Support:** Check browser console first, then verify module status in admin panel
