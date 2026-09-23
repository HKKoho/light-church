# Partial Cycle Analysis - Implementation Guide

## Overview

Allow AI value system analysis generation when students complete **50% or more** of a cycle (3+ out of 6 modules), with appropriate disclaimers encouraging full completion.

**Current Behavior:**
- Analysis only generates at 100% completion (all 6 modules done)
- Students get no feedback until cycle is fully complete

**New Behavior:**
- **50% threshold**: Generate partial analysis after 3 modules completed
- **100% threshold**: Generate complete analysis after all 6 modules
- Partial analyses include disclaimer and encouragement to complete
- Admin can see which analyses are partial vs complete

---

## Benefits

1. **Early Feedback**: Students get encouragement after halfway through
2. **Motivation**: Seeing partial analysis motivates completion for full picture
3. **Engagement**: More touchpoints = better engagement
4. **Retention**: Students less likely to abandon mid-cycle

---

## Implementation Steps

### Step 1: Database Migration ✅

**File:** `sql/009_add_partial_analysis_support.sql` (Created)

**Run in Supabase SQL Editor:**

```sql
-- Adds 3 new columns to cycle_analyses table:
- is_partial BOOLEAN (false = complete, true = partial)
- completion_percentage INTEGER (50, 67, 83, or 100)
- modules_completed INTEGER (3, 4, 5, or 6)
```

**After running:**
- Existing analyses marked as complete (100%, 6 modules)
- Index added for filtering partial analyses

---

### Step 2: Update TypeScript Types

**File:** `types.ts`

**Modify `CycleAnalysis` interface:**

```typescript
export interface CycleAnalysis {
  id: string;
  user_id: string;
  cycle_id: number;
  analysis_text: string;
  generated_at: string;
  regenerated_count: number;
  student_viewed: boolean;
  student_viewed_at: string | null;
  ai_model: string;
  token_count: number | null;
  generation_duration_ms: number | null;
  created_at: string;
  updated_at: string;

  // NEW FIELDS:
  is_partial: boolean;                // Is this a partial or complete analysis?
  completion_percentage: number;      // 50, 67, 83, or 100
  modules_completed: number;          // 3, 4, 5, or 6
}
```

---

### Step 3: Modify Analysis Service

**File:** `services/analysisService.ts`

#### 3.1: Update `isCycleComplete()` Function

**OLD:**
```typescript
async function isCycleComplete(userId: string, cycleId: number): Promise<boolean> {
  const modules = await getModulesByCycle(cycleId);
  const moduleIds = modules.map(m => m.id);
  const completedModuleIds = await getUserProgress(userId);

  // Returns true only if ALL 6 modules completed
  return moduleIds.every(id => completedModuleIds.includes(id));
}
```

**NEW:**
```typescript
async function getCycleCompletionStatus(
  userId: string,
  cycleId: number
): Promise<{
  isComplete: boolean;
  isPartial: boolean;
  completedCount: number;
  totalCount: number;
  percentage: number;
}> {
  const modules = await getModulesByCycle(cycleId);
  const moduleIds = modules.map(m => m.id);
  const completedModuleIds = await getUserProgress(userId);

  const completed = moduleIds.filter(id => completedModuleIds.includes(id));
  const completedCount = completed.length;
  const totalCount = moduleIds.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    isComplete: completedCount === totalCount,  // All 6 done
    isPartial: completedCount >= 3 && completedCount < totalCount,  // 3-5 done
    completedCount,
    totalCount,
    percentage
  };
}
```

#### 3.2: Update `generateCycleAnalysis()` Function

**Modify the beginning:**

```typescript
export async function generateCycleAnalysis(
  userId: string,
  cycleId: number,
  allowPartial: boolean = false  // NEW PARAMETER
): Promise<CycleAnalysis> {
  const startTime = Date.now();

  console.log(`[Analysis] Starting generation for user ${userId}, cycle ${cycleId}`);

  // Check completion status
  const status = await getCycleCompletionStatus(userId, cycleId);

  // Validate: Need at least 50% completion (3 modules)
  if (!allowPartial && !status.isComplete) {
    throw new Error(`學員尚未完成循環 ${cycleId} 的所有模組`);
  }

  if (allowPartial && status.completedCount < 3) {
    throw new Error(`需要至少完成 3 個模組才能生成部分分析（目前完成 ${status.completedCount} 個）`);
  }

  // Fetch modules - only completed ones for partial analysis
  const allModules = await getModulesByCycle(cycleId);
  const completedModuleIds = await getUserProgress(userId);
  const modules = status.isPartial
    ? allModules.filter(m => completedModuleIds.includes(m.id))
    : allModules;

  // ... rest of function ...

  // When saving to database:
  const { data, error } = await supabase
    .from('cycle_analyses')
    .upsert({
      user_id: userId,
      cycle_id: cycleId,
      analysis_text: analysisText,
      generated_at: new Date().toISOString(),
      regenerated_count: 0,
      ai_model: 'gpt-4o',
      token_count: tokenCount,
      generation_duration_ms: duration,
      student_viewed: false,
      student_viewed_at: null,

      // NEW FIELDS:
      is_partial: status.isPartial,
      completion_percentage: status.percentage,
      modules_completed: status.completedCount
    }, {
      onConflict: 'user_id,cycle_id'
    })
    .select()
    .single();
}
```

#### 3.3: Update AI Prompt for Partial Analysis

**Modify `buildAnalysisPrompt()` function:**

```typescript
function buildAnalysisPrompt(
  userName: string,
  cycleId: number,
  modules: Module[],
  responses: ResponseWithQuestion[],
  previousAnalyses: CycleAnalysis[],
  isPartial: boolean = false,  // NEW PARAMETER
  modulesCompleted: number = 6  // NEW PARAMETER
): string {
  // ... existing code ...

  // Add partial analysis disclaimer
  const partialDisclaimer = isPartial
    ? `\n【重要提醒】\n這是一份部分分析報告，基於學員完成的 ${modulesCompleted}/6 個模組。
這份分析能幫助你看見目前的學習軌跡，但完整的靈性成長圖像需要完成整個循環才能呈現。
在報告結尾，請溫柔地鼓勵學員完成剩餘的 ${6 - modulesCompleted} 個模組，以獲得更完整的分析與洞察。\n`
    : '';

  return `你是一位充滿愛心的屬靈導師，正在為學員「${userName}」撰寫第${cycleId}循環的成長鼓勵報告。
${partialDisclaimer}
【你的角色與態度】
- 你是陪伴者，不是評分者
- 你的語氣溫暖、鼓勵、充滿盼望
- 你看見學員的成長亮點，也溫柔指出可深化之處
- 你的目標：引導學員看見「敬畏耶和華是智慧的開端」
${isPartial ? '- 你理解這是部分數據，因此評估時更謹慎、更鼓勵性\n' : ''}

【循環主題】
第${cycleId}循環：${cycleThemes[cycleId]}

【核心課程內容】
本循環共 6 個模組，學員已完成 ${modulesCompleted} 個：
${modules.map(m => `• ${m.title} - ${m.subtitle}`).join('\n')}
${isPartial ? `\n（尚未完成的模組將在完整分析中納入）\n` : ''}

${previousContext}
【學員的回應】(每個回應都與具體問題配對)
${qaPairs}

【你的分析任務】
基於以上回應，撰寫一份200-500字的鼓勵性分析報告，涵蓋：
// ... existing dimensions ...

${isPartial ? `
【部分分析特別指引】
- 明確說明這是基於已完成的 ${modulesCompleted} 個模組的初步分析
- 肯定學員目前的學習態度與成長
- 指出已經看見的靈性亮點
- 溫柔鼓勵：「當你完成整個循環，我們會看見更完整的成長圖像」
- 結尾包含具體邀請：「期待你完成剩餘的模組，讓我們一起看見神在你生命中更豐富的作為」
` : ''}

// ... rest of prompt ...
`;
}
```

---

### Step 4: Update Progress Service for Auto-Trigger

**File:** `services/progressService.ts`

**Current auto-trigger logic:**
```typescript
// Auto-trigger only at module 6, 12, 18, 24 (cycle end)
const cycleEndModules = [6, 12, 18, 24];
```

**NEW auto-trigger logic:**
```typescript
// Auto-trigger at 50% and 100% completion
const cyclePartialModules = [3, 9, 15, 21];  // 50% (partial analysis)
const cycleCompleteModules = [6, 12, 18, 24]; // 100% (complete analysis)

if (cyclePartialModules.includes(moduleId)) {
  const cycleId = Math.floor((moduleId - 1) / 6) + 1;
  console.log(`[Progress] Module ${moduleId} hits 50% of cycle ${cycleId}, triggering partial analysis`);

  generateCycleAnalysis(userId, cycleId, true).catch(err => {
    console.error(`[Progress] Failed to auto-generate partial analysis:`, err);
  });
}

if (cycleCompleteModules.includes(moduleId)) {
  const cycleId = Math.floor((moduleId - 1) / 6) + 1;
  console.log(`[Progress] Module ${moduleId} completes cycle ${cycleId}, triggering complete analysis`);

  generateCycleAnalysis(userId, cycleId, false).catch(err => {
    console.error(`[Progress] Failed to auto-generate complete analysis:`, err);
  });
}
```

**Note:** This creates TWO analyses per cycle:
- **Partial** at module 3 (50%)
- **Complete** at module 6 (100%) - overwrites partial

---

### Step 5: Update Admin Interface

**File:** `src/components/admin/ValueAnalysisTable.tsx`

**Show partial indicator:**

```typescript
const getCycleStatus = (analysis?: CycleAnalysis) => {
  if (!analysis) {
    return { text: '未生成', color: 'text-slate-400', bgColor: 'bg-slate-100' };
  }

  // NEW: Check if partial
  if (analysis.is_partial) {
    return {
      text: `部分 (${analysis.modules_completed}/6)`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    };
  }

  if (analysis.student_viewed) {
    return { text: '已查看', color: 'text-green-600', bgColor: 'bg-green-100' };
  }

  return { text: '已生成', color: 'text-amber-600', bgColor: 'bg-amber-100' };
};
```

**Update generate button logic:**

```typescript
// Allow partial generation at 50%+, complete at 100%
<button
  onClick={() => onRegenerateReport(student.userId, cycleNum)}
  title={analysis?.is_partial
    ? '重新生成（可能仍是部分分析）'
    : analysis
      ? '重新生成完整分析'
      : '生成分析報告'
  }
>
  {analysis?.is_partial ? '更新部分' : analysis ? '重新生成' : '生成'}
</button>
```

---

### Step 6: Update Student Interface

**File:** `src/pages/student/LearningReflection.tsx`

**Show partial indicator in list:**

```typescript
const badges = item.analysis ? (
  <div className="flex items-center gap-2">
    {/* Partial indicator */}
    {item.analysis.is_partial && (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        部分分析 ({item.analysis.modules_completed}/6)
      </span>
    )}

    {/* New/Viewed status */}
    {!item.analysis.student_viewed ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        新報告
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        已閱讀
      </span>
    )}
  </div>
) : null;
```

**Show disclaimer in detail view:**

```typescript
{selectedCycle.analysis?.is_partial && (
  <div className="mb-6 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
    <div className="flex items-start">
      <svg className="w-5 h-5 text-orange-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <div>
        <h3 className="text-sm font-semibold text-orange-800 mb-1">部分分析報告</h3>
        <p className="text-xs text-orange-700">
          這份分析基於你已完成的 <strong>{selectedCycle.analysis.modules_completed}/6</strong> 個模組。
          完成整個循環後，你將獲得更完整、更深入的靈性成長分析！
        </p>
      </div>
    </div>
  </div>
)}
```

---

## Cost Implications

**Current:** ~$0.04 per complete analysis (6 modules)
**With Partial:** ~$0.02-$0.03 per partial analysis (3 modules)

**Scenarios:**

### Scenario A: Auto-generate both partial and complete
- Module 3: Partial analysis = $0.025
- Module 6: Complete analysis (overwrites) = $0.04
- **Total per cycle: $0.065** (62% increase)

### Scenario B: Manual partial only (admin triggered)
- Only complete analyses auto-generate
- Partial only if admin manually generates
- **Total per cycle: $0.04** (no change)

### Recommended: Scenario B
- Lower cost
- Admin control over when to generate partial
- Complete analysis still auto-generates

---

## UI Mockup

### Admin Analytics Table

```
學員名稱    | 循環 1                | 循環 2      | 循環 3      | 循環 4
-----------|---------------------|-----------|-----------|----------
Victor     | [部分 (4/6)] 查看 重新生成 | [未生成] 生成 | [未生成] 生成 | [未生成] 生成
Alice      | [已查看] 查看 重新生成     | [已生成] 查看 重新生成 | [未生成] 生成 | [未生成] 生成
```

### Student Reflection List

```
┌────────────────────────────────────────┐
│ 循環 1: 世界是否值得信任？               │
│                                        │
│ [🔶] 部分分析 (4/6)  [🆕] 新報告        │
│                                        │
│ [查看報告] ──────────────────────>     │
└────────────────────────────────────────┘
```

### Student Detail View

```
┌──────────────────────────────────────────────────┐
│ ⚠️ 部分分析報告                                  │
│ 這份分析基於你已完成的 4/6 個模組。              │
│ 完成整個循環後，你將獲得更完整的靈性成長分析！    │
└──────────────────────────────────────────────────┘

你的靈性成長分析
基於本循環4個模組的學習回應

[Analysis text with disclaimer at end about completing cycle]
```

---

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Types updated and compiling
- [ ] Partial analysis generates with 3 modules completed
- [ ] Partial analysis includes disclaimer in AI prompt
- [ ] Admin sees "部分 (3/6)" badge
- [ ] Student sees partial warning
- [ ] Complete analysis overwrites partial
- [ ] Cost tracking shows correct token usage
- [ ] Auto-trigger works at module 3 and module 6
- [ ] Manual trigger allows partial generation

---

## Rollout Strategy

### Phase 1: Database + Backend (Week 1)
1. Run migration `009_add_partial_analysis_support.sql`
2. Update types.ts
3. Modify analysisService.ts
4. Test manual partial generation

### Phase 2: Admin Interface (Week 2)
1. Update ValueAnalysisTable component
2. Update AnalysisReportModal to show partial indicator
3. Test admin workflow

### Phase 3: Student Interface (Week 3)
1. Update LearningReflection component
2. Add partial warnings and encouragement
3. Test student experience

### Phase 4: Auto-Trigger (Week 4)
1. Update progressService.ts
2. Monitor costs
3. Adjust thresholds if needed

---

## Future Enhancements

1. **Progressive thresholds**: 33% (2 modules), 67% (4 modules), 100% (6 modules)
2. **Comparison view**: Show partial vs complete analysis side-by-side
3. **Growth timeline**: Visualize progression from partial → complete
4. **Smart prompts**: AI adapts tone based on completion percentage
5. **Cost optimization**: Cache partial analysis tokens for complete generation

---

## Questions to Consider

1. **Should partial analyses be auto-generated or manual-only?**
   - Recommendation: Manual-only to control costs

2. **Should partial analysis overwrite or create separate records?**
   - Recommendation: Overwrite (same user_id + cycle_id) to keep data clean

3. **What's the minimum threshold: 33%, 50%, or 67%?**
   - Recommendation: 50% (3 modules) for meaningful feedback

4. **Should students be able to request partial analysis?**
   - Future enhancement: "查看目前進度分析" button

---

**Implementation Status:** Designed, awaiting approval to proceed

**Estimated Development Time:** 2-3 days

**Estimated Cost Increase:** +$0.02-$0.03 per student per cycle (if auto-enabled)
