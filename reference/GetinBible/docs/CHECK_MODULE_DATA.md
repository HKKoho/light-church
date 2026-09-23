# Module Data Diagnostic Guide
## Troubleshooting: Why Module 2 Doesn't Show for Students

**Issue:** Admin sees 2 published modules, but students only see 1

---

## ✅ **Fix Applied:**

Fixed React key duplication error in `components/BibleBookPlayer.tsx`:
- Changed `key={idx}` to `key={q.id || question-${idx}}`  for life questions
- Changed `key={idx}` to `key={prompt-${idx}-${prompt.substring(0, 20)}}` for discussion prompts

**This should fix the rendering issue!**

---

## 🧪 **Test After Fix:**

### **Step 1: Restart Dev Server**

Since we changed the code, restart the dev server:

1. Press `Ctrl+C` in the terminal running the dev server
2. Run: `npm run dev`
3. Wait for it to start (will be on port 3000 or 3001)

### **Step 2: Clear Browser Cache**

1. **Hard refresh:** `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Or open in **Incognito/Private** window

### **Step 3: Test Student View**

1. Go to `http://localhost:3001/` (or whatever port shown)
2. Login as student
3. Press `F12` → Console tab
4. Look for: `✅ Number of published modules: 2`
5. **Count the module cards on the page**

**Expected result:** Should see **2 modules** (Module 1 + Module 2)

---

## 🔍 **If Still Only Shows 1 Module:**

### **Diagnostic A: Check Module 2 Data in Console**

While on student homepage with console open:

```javascript
// Look for this in console logs:
📖 Fetched published modules: [...]
```

**Expand the array** and check:
- Does it contain 2 objects?
- What are the `id` values? (Should be 1 and 2)
- Does Module 2 have all required fields?
  - `title`
  - `subtitle`
  - `lifeQuestions` (array with at least 1 question)
  - `perspectives` (object with 3 perspectives)
  - `discussionPrompts` (array)

### **Diagnostic B: Check Module 2 in Admin**

Go to admin panel and edit Module 2:

**Check these tabs:**
1. **基本資訊 (Basic Info):**
   - ✅ Title filled in?
   - ✅ Subtitle filled in?
   - ✅ Status = "Published"?
   - ✅ Cycle selected?

2. **人生問題 (Life Questions):**
   - ✅ At least 1 question added?
   - ✅ Question text not empty?

3. **三個觀點 (Three Perspectives):**
   - ✅ All 3 perspectives filled?
     - Proverbs (箴言)
     - Ecclesiastes (傳道書)
     - Job (約伯記)
   - ✅ Each has book, theme, and description?

4. **張力指南 (Tension Guide):**
   - ✅ Text filled in?

5. **討論提示 (Discussion Prompts):**
   - ✅ At least 1 prompt added?

6. **總結 (Summary):**
   - ✅ Text filled in?

**If ANY of these are empty, Module 2 might fail to load properly!**

---

## 🔧 **Quick Fix if Module 2 Has Missing Data:**

### **Option 1: Complete Module 2 Data**

Go through all 6 tabs in Module 2 editor and fill in all required fields:
- At least 1 life question
- All 3 perspectives
- Tension guide text
- At least 1 discussion prompt
- Summary text

Then save and test again.

### **Option 2: Test with Module 3 Instead**

If Module 2 has data issues:
1. Publish Module 3 instead (change status to "published")
2. Test if students see 2 modules
3. This confirms the fix works, and Module 2 just needs data

---

## 📊 **Database Query to Check Module 2:**

If you want to check the database directly:

```sql
-- Check Module 2 basic info
SELECT id, title, subtitle, status, created_at
FROM modules
WHERE id = 2;

-- Check Module 2 life questions
SELECT id, question_text, question_order
FROM life_questions
WHERE module_id = 2
ORDER BY question_order;

-- Check Module 2 perspectives
SELECT perspective_type, book, theme
FROM perspectives
WHERE module_id = 2;

-- Check Module 2 discussion prompts
SELECT prompt_text, prompt_order
FROM discussion_prompts
WHERE module_id = 2
ORDER BY prompt_order;
```

**Expected:**
- Module row exists with `status = 'published'`
- At least 1 life question
- 3 perspectives (PROVERBS, ECCLESIASTES, JOB)
- At least 1 discussion prompt

---

## ✅ **Success Checklist:**

After restart and cache clear:

- [ ] No React key error in console
- [ ] Console shows: `✅ Number of published modules: 2`
- [ ] Student homepage displays 2 module cards
- [ ] Both Module 1 and Module 2 are clickable
- [ ] Clicking Module 2 opens BibleBookPlayer without errors

---

## 🎯 **Most Likely Causes (In Order):**

1. ✅ **React key duplication** (FIXED - restart server to apply)
2. ⚠️ **Browser cache** (Hard refresh or use incognito)
3. ⚠️ **Module 2 missing required data** (Check all 6 tabs)
4. ⚠️ **Module 2 has empty life questions array** (Most common!)

---

## 📞 **Next Steps:**

1. **Restart dev server:** `npm run dev`
2. **Hard refresh browser:** `Ctrl+Shift+R`
3. **Check student view:** Should see 2 modules now!
4. **If still 1 module:** Check Module 2 data completeness (especially life questions)

---

**Let me know the result after restarting the server!**
