# AI Student Value System Analysis - Testing Guide

## Pre-Deployment Checklist

### 1. Database Migration (REQUIRED - Do this first!)

**Action:** Open Supabase SQL Editor (https://supabase.com/dashboard)

**Run this SQL:**
```sql
CREATE TABLE IF NOT EXISTS cycle_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle_id INTEGER NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  analysis_text TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  regenerated_count INTEGER NOT NULL DEFAULT 0,
  student_viewed BOOLEAN NOT NULL DEFAULT FALSE,
  student_viewed_at TIMESTAMPTZ,
  ai_model TEXT DEFAULT 'gpt-4o',
  token_count INTEGER,
  generation_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_cycle UNIQUE(user_id, cycle_id)
);

-- Create indexes for performance
CREATE INDEX idx_cycle_analyses_user ON cycle_analyses(user_id);
CREATE INDEX idx_cycle_analyses_cycle ON cycle_analyses(cycle_id);
CREATE INDEX idx_cycle_analyses_generated_at ON cycle_analyses(generated_at);
CREATE INDEX idx_cycle_analyses_student_viewed ON cycle_analyses(student_viewed);
CREATE INDEX idx_cycle_analyses_user_cycle ON cycle_analyses(user_id, cycle_id);

-- Enable Row Level Security
ALTER TABLE cycle_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policy (allow all via anon key, enforced at app level)
CREATE POLICY "Allow all via anon key" ON cycle_analyses
  USING (true)
  WITH CHECK (true);
```

**Expected output:** `CREATE TABLE`, `CREATE INDEX` (5x), `ALTER TABLE`, `CREATE POLICY`

**Verify:**
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'cycle_analyses'
ORDER BY ordinal_position;
```
**Expected:** 13 rows (id, user_id, cycle_id, analysis_text, generated_at, regenerated_count, student_viewed, student_viewed_at, ai_model, token_count, generation_duration_ms, created_at, updated_at)

---

## Part 1: Admin Interface Testing

### Test 1: View Analysis Dashboard

**Steps:**
1. Navigate to https://wisdominbible.vercel.app/admin
2. Login as admin
3. Click "數據分析" (Analytics) in sidebar
4. Scroll to bottom → find "價值觀發展分析" section

**Expected:**
- Table with columns: 學員名稱, 循環 1, 循環 2, 循環 3, 循環 4
- Each cell shows status badge:
  - "未生成" (gray) = no analysis yet
  - "已生成" (blue) = generated but student hasn't viewed
  - "已查看" (green) = student has viewed
- Buttons: "生成" (generate) or "重新生成" (regenerate) + "查看" (view)

---

### Test 2: Generate Analysis for Completed Cycle

**Prerequisites:**
- Student must have completed ALL 6 modules in a cycle
- Cycle 1 = modules 1-6
- Cycle 2 = modules 7-12
- Cycle 3 = modules 13-18
- Cycle 4 = modules 19-24

**Steps:**
1. Find student who completed cycle 1 (e.g., VictorHung)
2. Click "生成" button under "循環 1" column
3. Observe loading state (button disabled, spinner)
4. Wait 10-15 seconds

**Expected Success:**
- Toast notification: "成功生成循環 1 分析報告"
- Cell updates to show "已生成" badge
- "查看" button appears

**Expected Errors:**
- "學員尚未完成循環 1 的所有模組" → student hasn't finished all 6 modules
- "生成失敗，請稍後再試" → OpenAI API error or missing API key

**Debug if fails:**
1. Open browser DevTools → Console tab
2. Look for errors containing "OpenAI" or "generateCycleAnalysis"
3. Check Vercel environment variables:
   - `VITE_OPENAI_API_KEY` must be set
   - Value should start with `sk-proj-`

---

### Test 3: View Generated Analysis Report

**Steps:**
1. After successful generation, click "查看" button
2. Modal should open with full-screen overlay

**Expected Content:**
- **Header:**
  - Title: "{Student Name} - 循環 1"
  - Generation date in Traditional Chinese
  - Badge: "第 X 次生成" (if regenerated)
  - Badge: "學員未查看" (student hasn't viewed yet)

- **Report Body:**
  - Traditional Chinese text, 200-500 characters
  - Flowing narrative (no bullet points or numbered lists)
  - Specific quotes from student responses
  - References to "敬畏耶和華" (fear of the Lord)
  - Encouraging tone using "或許可以..." / "邀請你..." (not "你需要...")

- **Metadata:**
  - AI 模型: gpt-4o
  - 字數: ~400-500 字
  - Token 使用: ~13,000-15,000 tokens (~$0.04)
  - 生成時長: ~8,000-12,000ms (8-12 seconds)

**Quality Checklist:**
- [ ] Report is in Traditional Chinese (繁體中文)
- [ ] Tone is warm and encouraging (溫暖、鼓勵)
- [ ] No scores, grades, or evaluations (不評分)
- [ ] Specific student responses are quoted (引用學員回應)
- [ ] Uses invitational language "或許..." not "你需要..."
- [ ] Mentions "敬畏耶和華" as foundation of wisdom
- [ ] Addresses 4 dimensions:
  1. Biblical worldview alignment (聖經世界觀對齊)
  2. Faith maturity (信仰成熟度)
  3. Three-perspective integration (三重視角整合)
  4. Personal transformation (個人轉化)

---

### Test 4: Regenerate Analysis

**Steps:**
1. Click "重新生成" button on already-generated analysis
2. Confirm dialog if present
3. Wait for regeneration

**Expected:**
- New report generated (may be different due to AI variability)
- "regenerated_count" increments (shown as "第 2 次生成", "第 3 次生成", etc.)
- Student's "student_viewed" status resets to false
- Cost: another $0.04

**Use Case:** Admin wants to improve report quality or update based on new responses

---

## Part 2: Student Interface Testing

### Test 5: Student Views Reflection List

**Steps:**
1. Logout from admin
2. Login as student (same one who has generated analysis)
3. On module list page, click "查看我的學習反思" button (orange/amber colored link)
4. Or navigate to https://wisdominbible.vercel.app/reflection

**Expected:**
- Page title: "我的學習反思"
- Subtitle: "查看你在每個學習循環的靈性成長分析報告"
- 4 cards showing:
  - 循環 1, 循環 2, 循環 3, 循環 4
  - Each with circular badge (cycle number)
  - Status indicators:
    - "新報告" (green badge) = analysis exists, not viewed yet
    - "已閱讀" (blue badge) = analysis exists, already viewed
    - "尚未完成此循環" (gray badge) = haven't finished all 6 modules

**Expected for Test Student:**
- Cycle 1: "新報告" badge + "查看報告" button (clickable)
- Cycle 2-4: "尚未完成此循環" (grayed out, not clickable)

---

### Test 6: Student Views Analysis Report

**Steps:**
1. Click "查看報告" button on Cycle 1
2. Page transitions to detail view

**Expected Detail View:**
- **Header:** Golden gradient background
  - Title: "循環 1" (or full cycle title)
  - Generation date in Chinese format
- **Content:**
  - Icon + "你的靈性成長分析"
  - Subtitle: "基於本循環6個模組的學習回應"
  - Report text in amber-highlighted box
  - Flows naturally in paragraphs
- **Footer:**
  - Disclaimer: "這份分析報告由 AI 基於你的學習回應生成..."
  - Blessing: "願你在智慧的道路上持續前行，「敬畏耶和華是智慧的開端」。"
- **Back button:** "← 返回列表"

**Auto-tracking:**
- Behind the scenes, `student_viewed` flag updates to true
- `student_viewed_at` timestamp recorded

---

### Test 7: Badge Updates After Viewing

**Steps:**
1. Click "← 返回列表" back button
2. Return to reflection list

**Expected:**
- Cycle 1 badge changes from "新報告" (green) to "已閱讀" (blue)
- Admin can now see "學員已查看" status in modal

---

## Part 3: Auto-Trigger Testing

### Test 8: Auto-Generate on Cycle Completion

**Prerequisites:**
- Find a student who has completed modules 1-5 but NOT module 6

**Steps:**
1. Login as that student
2. Complete module 6 (answer all questions, click "標記為已完成")
3. Wait 15-20 seconds

**Expected (Background Process):**
- Analysis generates automatically (non-blocking)
- Student doesn't see loading or notification
- Next time student visits /reflection page, "新報告" appears

**Verify as Admin:**
1. Login as admin
2. Go to Analytics → Value Analysis table
3. Check student's Cycle 1 cell → should show "已生成"

**Note:** Auto-trigger is async - if it fails, it won't block module completion. Check browser console for errors.

---

## Part 4: Edge Cases & Error Handling

### Test 9: Generate Analysis with Incomplete Cycle

**Steps:**
1. Find student who only completed modules 1-3
2. Admin clicks "生成" for Cycle 1

**Expected:**
- Error toast: "學員尚未完成循環 1 的所有模組"
- No analysis created

---

### Test 10: Missing OpenAI API Key

**Steps:**
1. Remove `VITE_OPENAI_API_KEY` from Vercel environment variables
2. Redeploy
3. Try to generate analysis

**Expected:**
- Error toast: "生成失敗，請稍後再試"
- Console error: "OpenAI API key is not configured"

---

### Test 11: Empty Student Responses

**Steps:**
1. Student completes cycle but skips all reflection questions (no text responses)
2. Generate analysis

**Expected:**
- Analysis still generates but notes limited data
- Report should say something like: "從你的回應中，我看見你已經完成了本循環的學習... 邀請你更深入地反思..."

---

### Test 12: Network Timeout

**Steps:**
1. Generate analysis
2. If OpenAI API is slow (>30 seconds)

**Expected:**
- Timeout error after 30 seconds
- Toast: "生成失敗，請稍後再試"
- Can retry by clicking "生成" again

---

## Part 5: Data Validation

### Test 13: Database Verification

**In Supabase SQL Editor:**
```sql
-- View all generated analyses
SELECT
  ca.cycle_id,
  u.name as student_name,
  LENGTH(ca.analysis_text) as text_length,
  ca.token_count,
  ca.generation_duration_ms,
  ca.student_viewed,
  ca.regenerated_count,
  ca.generated_at
FROM cycle_analyses ca
JOIN users u ON ca.user_id = u.id
ORDER BY ca.generated_at DESC;
```

**Expected:**
- Each row has valid `analysis_text` (200+ characters)
- `token_count` around 13,000-15,000
- `generation_duration_ms` around 8,000-12,000ms
- `student_viewed` true/false based on testing
- `regenerated_count` = 0 (or higher if regenerated)

---

## Part 6: Performance & Cost Monitoring

### Test 14: Monitor Token Usage

**Steps:**
1. Generate 3-5 analyses for different students/cycles
2. Record token counts from modal metadata

**Expected Averages:**
- Input tokens: ~13,000-14,000
- Output tokens: ~1,200-1,500
- Total cost per analysis: $0.038-$0.047 (~$0.04)

**Monthly Budget:**
- 24 students × 4 cycles = 96 analyses maximum
- Total cost: 96 × $0.04 = $3.84
- Regenerations: ~10/month = $0.40
- **Expected monthly cost: <$5**

---

### Test 15: Generation Speed

**Steps:**
1. Click "生成" button
2. Start timer
3. Stop when toast appears

**Expected:**
- Average: 8-12 seconds
- Max acceptable: 20 seconds
- If >20 seconds: Check network or OpenAI API status

---

## Troubleshooting Guide

### Problem: "生成失敗，請稍後再試"

**Check:**
1. Vercel environment variables → `VITE_OPENAI_API_KEY` exists
2. Browser console → look for OpenAI API errors
3. Supabase → table `cycle_analyses` exists
4. Student completion → all 6 modules marked complete

---

### Problem: Report is in English or broken Chinese

**Check:**
1. `analysisService.ts` → prompt specifies "繁體中文"
2. OpenAI API → using `gpt-4o` model (not `gpt-3.5-turbo`)

---

### Problem: Report doesn't quote student responses

**Check:**
1. Student actually submitted text responses (not empty)
2. `fetchResponsesWithQuestions()` is pairing correctly
3. Database → `responses` table has data for that student

---

### Problem: Student can't see "新報告" badge

**Check:**
1. Student is logged in correctly
2. `getAllUserAnalyses()` is fetching for correct `user_id`
3. Database → `student_viewed` is false for that analysis

---

## Success Criteria

**Feature is working correctly if:**

✅ Admin can generate analyses for completed cycles
✅ Modal displays Traditional Chinese pastoral reports
✅ Reports quote specific student responses
✅ Token usage ~13K-15K per analysis (~$0.04)
✅ Student sees "新報告" badge when analysis ready
✅ Student can view reports in beautiful detail view
✅ Badge updates to "已閱讀" after viewing
✅ Auto-trigger works on cycle completion (modules 6, 12, 18, 24)
✅ Regeneration increments count and updates report
✅ Tone is warm, encouraging, directional (not judgmental)
✅ References "敬畏耶和華" naturally

---

## Next Steps After Testing

1. **Quality Review:** Read 3-5 generated reports manually
2. **Prompt Tuning:** If tone is off, adjust `buildAnalysisPrompt()` in `analysisService.ts`
3. **User Training:** Create simple guide for students on how to access reflections
4. **Monitoring:** Set up alerts for:
   - Daily token usage > 100K
   - Generation failures > 5%
   - Average cost > $0.10 per analysis

---

## Contact & Support

If you encounter issues during testing:
1. Check browser console for error messages
2. Check Vercel deployment logs
3. Check Supabase logs for database errors
4. Review `services/analysisService.ts` for business logic

**Testing completed by:** _____________
**Date:** _____________
**All tests passed:** ☐ Yes ☐ No (see notes below)

**Notes:**
_________________________________________________________________
_________________________________________________________________
