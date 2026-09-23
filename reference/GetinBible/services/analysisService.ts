// ============================================================================
// CYCLE ANALYSIS SERVICE
// ============================================================================
// Purpose: Generate AI-powered student value system analysis reports
// AI Model: OpenAI GPT-4o
// Cost: ~$0.04 per analysis
//
// IMPORTANT: This service transforms between database snake_case and TypeScript camelCase
// ============================================================================

import OpenAI from 'openai';
import { supabase } from './supabaseClient';
import { getModulesByCycle } from './moduleService';
import { getUserProgress } from './progressService';
import type {
  CycleAnalysis,
  ResponseWithQuestion,
  CycleAnalysisListItem,
  StudentAnalysisOverview,
  Module
} from '../types';

// ============================================================================
// TRANSFORMATION HELPERS (DB snake_case → TS camelCase)
// ============================================================================

/**
 * Transform CycleAnalysis from database snake_case to TypeScript camelCase
 */
function transformCycleAnalysis(row: any): CycleAnalysis {
  return {
    id: row.id,
    userId: row.user_id,
    cycleId: row.cycle_id,
    analysisText: row.analysis_text,
    generatedAt: row.generated_at,
    regeneratedCount: row.regenerated_count,
    studentViewed: row.student_viewed,
    studentViewedAt: row.student_viewed_at,
    aiModel: row.ai_model,
    tokenCount: row.token_count,
    generationDurationMs: row.generation_duration_ms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isPartial: row.is_partial,
    completionPercentage: row.completion_percentage,
    modulesCompleted: row.modules_completed
  };
}

// ============================================================================
// CORE ANALYSIS GENERATION
// ============================================================================

/**
 * Generate cycle analysis for a student
 * Auto-triggered when student completes a cycle (modules 6, 12, 18, 24)
 * Can also be manually triggered by admin for partial analysis (50%+)
 *
 * @param userId - Student's UUID
 * @param cycleId - Cycle ID (1-4)
 * @param allowPartial - Allow partial analysis generation (default: false)
 * @returns Generated analysis report
 * @throws Error if cycle not complete or AI generation fails
 */
export async function generateCycleAnalysis(
  userId: string,
  cycleId: number,
  allowPartial: boolean = false
): Promise<CycleAnalysis> {
  const startTime = Date.now();

  console.log(`[Analysis] Starting generation for user ${userId}, cycle ${cycleId}, allowPartial: ${allowPartial}`);

  // 1. Check cycle completion status
  const status = await getCycleCompletionStatus(userId, cycleId);

  // Validate minimum requirements
  if (!allowPartial && !status.isComplete) {
    throw new Error(`學員尚未完成循環 ${cycleId} 的所有月課 (${status.completedCount}/${status.totalCount})`);
  }

  if (allowPartial && status.completedCount < 3) {
    throw new Error(`需要至少完成 3 個月課才能生成部分分析（目前完成 ${status.completedCount} 個）`);
  }

  // 2. Use appropriate modules based on partial/complete
  // For partial: only use completed modules
  // For complete: use all modules
  const modules = status.isPartial ? status.completedModules : status.allModules;

  if (modules.length === 0) {
    throw new Error(`循環 ${cycleId} 沒有可用的月課資料`);
  }

  const moduleIds = modules.map(m => m.id);

  // 3. Fetch student responses with questions (CRITICAL: pairs each response with question)
  const responsesWithQuestions = await fetchResponsesWithQuestions(
    userId,
    moduleIds,
    modules
  );

  if (responsesWithQuestions.length === 0) {
    throw new Error(`學員在循環 ${cycleId} 沒有任何回應資料`);
  }

  // 4. Fetch previous cycle analyses (for transformation dimension)
  const previousAnalyses = await getPreviousCycleAnalyses(userId, cycleId);

  // 5. Fetch user info
  const { data: user } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single();

  const userName = user?.name || '學員';

  // 6. Build AI prompt and call OpenAI
  console.log(`[Analysis] Building prompt with ${responsesWithQuestions.length} Q&A pairs`);

  const prompt = buildAnalysisPrompt(
    userName,
    cycleId,
    modules,
    responsesWithQuestions,
    previousAnalyses,
    status.isPartial,
    status.completedCount,
    status.totalCount
  );

  const analysisText = await callOpenAIForAnalysis(prompt);

  // 7. Calculate metrics
  const duration = Date.now() - startTime;
  const tokenCount = estimateTokens(prompt + analysisText);

  console.log(`[Analysis] Generated in ${duration}ms, ~${tokenCount} tokens`);

  // 8. Store in database (upsert handles regeneration)
  const { data, error } = await supabase
    .from('cycle_analyses')
    .upsert({
      user_id: userId,
      cycle_id: cycleId,
      analysis_text: analysisText,
      generated_at: new Date().toISOString(),
      regenerated_count: 0, // Will be incremented by database trigger if exists
      ai_model: 'gpt-4o',
      token_count: tokenCount,
      generation_duration_ms: duration,
      student_viewed: false, // Reset viewed status on regeneration
      student_viewed_at: null,
      // Partial analysis tracking
      is_partial: status.isPartial,
      completion_percentage: status.percentage,
      modules_completed: status.completedCount
    }, {
      onConflict: 'user_id,cycle_id'
    })
    .select()
    .single();

  if (error) {
    console.error('[Analysis] Failed to save:', error);
    throw new Error('儲存分析報告失敗');
  }

  // If this is a regeneration, increment the count
  if (data.regenerated_count === 0) {
    const { error: updateError } = await supabase
      .from('cycle_analyses')
      .update({ regenerated_count: 1 })
      .eq('id', data.id);

    if (!updateError && data) {
      data.regenerated_count = 1;
    }
  } else {
    const { error: updateError } = await supabase
      .from('cycle_analyses')
      .update({ regenerated_count: data.regenerated_count + 1 })
      .eq('id', data.id);

    if (!updateError && data) {
      data.regenerated_count = data.regenerated_count + 1;
    }
  }

  console.log(`[Analysis] Successfully saved analysis ID: ${data.id}`);

  // Transform to camelCase before returning
  return transformCycleAnalysis(data);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get cycle completion status with partial analysis support
 */
async function getCycleCompletionStatus(
  userId: string,
  cycleId: number
): Promise<{
  isComplete: boolean;
  isPartial: boolean;
  completedCount: number;
  totalCount: number;
  percentage: number;
  completedModules: Module[];
  allModules: Module[];
}> {
  // Get all modules in cycle
  const allModules = await getModulesByCycle(cycleId);
  const moduleIds = allModules.map(m => m.id);

  if (moduleIds.length === 0) {
    return {
      isComplete: false,
      isPartial: false,
      completedCount: 0,
      totalCount: 0,
      percentage: 0,
      completedModules: [],
      allModules: []
    };
  }

  // Get user's completed modules
  const completedModuleIds = await getUserProgress(userId);

  // Filter to only completed modules
  const completedModules = allModules.filter(m => completedModuleIds.includes(m.id));
  const completedCount = completedModules.length;
  const totalCount = allModules.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  const isComplete = completedCount === totalCount;
  const isPartial = completedCount >= 3 && completedCount < totalCount; // 50%+ but not complete

  console.log(`[Analysis] Cycle ${cycleId} completion: ${completedCount}/${totalCount} modules (${percentage}%), partial: ${isPartial}, complete: ${isComplete}`);

  return {
    isComplete,
    isPartial,
    completedCount,
    totalCount,
    percentage,
    completedModules,
    allModules
  };
}

/**
 * Check if user has completed all modules in a cycle (backward compatibility)
 */
async function isCycleComplete(userId: string, cycleId: number): Promise<boolean> {
  const status = await getCycleCompletionStatus(userId, cycleId);
  return status.isComplete;
}

/**
 * Fetch all responses with their corresponding questions
 * CRITICAL: This pairs each response with its question for meaningful context
 */
async function fetchResponsesWithQuestions(
  userId: string,
  moduleIds: number[],
  modules: Module[]
): Promise<ResponseWithQuestion[]> {
  // Fetch all responses for this cycle
  const { data: responses, error } = await supabase
    .from('responses')
    .select('*')
    .eq('user_id', userId)
    .in('module_id', moduleIds)
    .order('module_id', { ascending: true });

  if (error) {
    console.error('[Analysis] Failed to fetch responses:', error);
    return [];
  }

  if (!responses || responses.length === 0) {
    console.warn('[Analysis] No responses found for user');
    return [];
  }

  // Map responses to questions
  const paired: ResponseWithQuestion[] = [];

  for (const response of responses) {
    const module = modules.find(m => m.id === response.module_id);
    if (!module) continue;

    let questionText = '';

    // Match response to question based on question_type and question_index
    if (response.question_type === 'life_question' && response.question_index !== null) {
      const question = module.lifeQuestions[response.question_index];
      questionText = question?.questionText || '';
    } else if (response.question_type === 'discussion' && response.question_index !== null) {
      questionText = module.discussionPrompts[response.question_index] || '';
    } else if (response.question_type === 'summary') {
      questionText = '課程總結反思';
    }

    // Only include if we have both question and response
    if (questionText && response.response_text && response.response_text.trim().length > 0) {
      paired.push({
        questionText,
        questionType: response.question_type,
        responseText: response.response_text,
        responseValue: response.response_value,
        aiFeedback: response.ai_feedback,
        moduleTitle: module.title
      });
    }
  }

  console.log(`[Analysis] Paired ${paired.length} responses with questions`);

  return paired;
}

/**
 * Get previous cycle analyses for comparing growth
 */
async function getPreviousCycleAnalyses(
  userId: string,
  currentCycleId: number
): Promise<CycleAnalysis[]> {
  const { data, error } = await supabase
    .from('cycle_analyses')
    .select('*')
    .eq('user_id', userId)
    .lt('cycle_id', currentCycleId)
    .order('cycle_id', { ascending: true });

  if (error) {
    console.error('[Analysis] Failed to fetch previous analyses:', error);
    return [];
  }

  console.log(`[Analysis] Found ${data?.length || 0} previous cycle analyses`);

  // Transform to camelCase
  return (data || []).map(transformCycleAnalysis);
}

/**
 * Build comprehensive AI prompt for analysis
 * Includes: role, cycle context, modules, previous analyses, Q&A pairs
 */
function buildAnalysisPrompt(
  userName: string,
  cycleId: number,
  modules: Module[],
  responses: ResponseWithQuestion[],
  previousAnalyses: CycleAnalysis[],
  isPartial: boolean = false,
  modulesCompleted: number = 6,
  totalModules: number = 6
): string {
  const cycleThemes: Record<number, string> = {
    1: '世界是否值得信任？',
    2: '人如何活在有限中？',
    3: '當人生開始崩塌',
    4: '成熟的信仰如何整合？'
  };

  // Build previous analysis context
  const previousContext = previousAnalyses.length > 0
    ? `\n【學員過往循環的成長軌跡】\n${previousAnalyses.map(a =>
        `循環${a.cycleId}分析摘要：${a.analysisText.substring(0, 200)}...`
      ).join('\n\n')}\n`
    : '';

  // Build question-response pairs
  const qaPairs = responses.map((r, idx) => {
    const feedback = r.aiFeedback ? `\n   AI 反饋：${r.aiFeedback}` : '';
    const value = r.responseValue ? `\n   選擇：${r.responseValue}` : '';
    return `${idx + 1}. 【${r.moduleTitle}】\n   問題：${r.questionText}\n   學員回應：${r.responseText}${value}${feedback}`;
  }).join('\n\n');

  // Add partial analysis disclaimer
  const partialDisclaimer = isPartial
    ? `\n【重要提醒 - 這是一份部分分析報告】
這份分析基於學員完成的 ${modulesCompleted}/${totalModules} 個月課。
這份分析能幫助你看見目前的學習軌跡，但完整的靈性成長圖像需要完成整個循環才能呈現。
在報告結尾，請溫柔地鼓勵學員完成剩餘的 ${totalModules - modulesCompleted} 個月課，以獲得更完整的分析與洞察。\n`
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
本循環共 ${totalModules} 個月課${isPartial ? `，學員已完成 ${modulesCompleted} 個` : ''}
本循環探討箴言（秩序）、傳道書（虛空）、約伯記（苦難）三重視角
${modules.map(m => `• ${m.title} - ${m.subtitle}`).join('\n')}
${isPartial ? `\n（尚未完成的月課將在完整分析中納入）\n` : ''}

${previousContext}
【學員的回應】(每個回應都與具體問題配對)
${qaPairs}

【你的分析任務】
基於以上回應，撰寫一份200-500字的鼓勵性分析報告，涵蓋：

1. **聖經世界觀的對齊程度**
   - 肯定：學員在哪些回應中展現了對聖經智慧的理解？
   - 鼓勵：如何更深入體會「敬畏耶和華」作為智慧根基？

2. **信仰成熟度指標**
   - 肯定：哪些反思顯示出靈性的真誠與深度？
   - 鼓勵：可以如何更勇敢地面對神學張力？

3. **三重視角的整合能力**
   - 肯定：學員在哪裡展現了持守張力的智慧？
   - 鼓勵：如何避免簡化，更全面地擁抱複雜性？

4. **個人轉化的證據**
   ${previousAnalyses.length > 0
     ? '- 肯定：與過往循環相比，有哪些美好的成長？\n   - 鼓勵：下一個循環可以留意什麼？'
     : '- 肯定：本循環中最亮眼的靈性洞察是什麼？\n   - 鼓勵：如何將這些洞察帶入生活實踐？'
   }

【核心引導方向】
在報告中自然地、不說教地引導學員：
- 看見「敬畏耶和華」（對神的尊崇、敬畏、信靠）是智慧的起點
- 認識到智慧不是技巧，而是與神的關係
- 鼓勵在不確定中仍然選擇信靠

【寫作要求】
1. 溫暖、鼓勵、像一位愛心導師寫給學員的信
2. 繁體中文，200-500字
3. 具體引用學員回應（至少2-3處）
4. 用「你」稱呼學員，建立親近感
5. 結尾必須包含前瞻性的鼓勵和祝福
6. 流暢段落，不使用標題或項目符號
7. 語氣親切但不輕浮，深度但不學術

【重要提醒】
- 不要給分數、評級、等級
- 避免「你做得很好」這種空洞讚美，要具體說明好在哪裡
- 不要說「你需要...」，而是「或許可以...」「邀請你...」
- 即使回應簡短，也要看見背後的心意
${isPartial ? `\n【部分分析特別指引】
- 明確說明這是基於已完成的 ${modulesCompleted} 個月課的初步分析
- 肯定學員目前的學習態度與成長
- 指出已經看見的靈性亮點
- 溫柔鼓勵：「當你完成整個循環，我們會看見更完整的成長圖像」
- 結尾包含具體邀請：「期待你完成剩餘的月課，讓我們一起看見神在你生命中更豐富的作為」\n` : ''}
請開始撰寫分析報告：`;
}

/**
 * Call OpenAI API to generate analysis
 */
async function callOpenAIForAnalysis(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error('[Analysis] OpenAI API key not configured');
    throw new Error('OpenAI API 金鑰未設定，請聯繫管理員');
  }

  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });

  try {
    console.log('[Analysis] Calling OpenAI API...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500, // ~500 Chinese chars = ~1250 tokens + buffer
      temperature: 0.7,
      presence_penalty: 0.2,
      frequency_penalty: 0.1
    });

    const text = completion.choices[0]?.message?.content;

    if (!text) {
      throw new Error('OpenAI 沒有返回內容');
    }

    console.log('[Analysis] OpenAI response received, length:', text.length);

    return text.trim();
  } catch (error: any) {
    console.error('[Analysis] OpenAI API error:', error);

    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API 配額不足，請檢查帳戶餘額');
    }

    if (error.code === 'rate_limit_exceeded') {
      throw new Error('OpenAI API 請求頻率過高，請稍後再試');
    }

    throw new Error(`AI 分析生成失敗：${error.message || '未知錯誤'}`);
  }
}

/**
 * Estimate token count (reuse from openaiService pattern)
 */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars * 2.5 + otherChars * 0.5);
}

// ============================================================================
// RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Get analysis for a specific user and cycle
 */
export async function getCycleAnalysis(
  userId: string,
  cycleId: number
): Promise<CycleAnalysis | null> {
  const { data, error } = await supabase
    .from('cycle_analyses')
    .select('*')
    .eq('user_id', userId)
    .eq('cycle_id', cycleId)
    .maybeSingle();

  if (error) {
    console.error('[Analysis] Failed to get cycle analysis:', error);
    return null;
  }

  // Transform to camelCase
  return data ? transformCycleAnalysis(data) : null;
}

/**
 * Get all analyses for a user (student view)
 */
export async function getAllUserAnalyses(userId: string): Promise<CycleAnalysisListItem[]> {
  // Get all cycles
  const { data: cycles } = await supabase
    .from('cycles')
    .select('*')
    .order('sort_order');

  // Get user's analyses
  const { data: analyses } = await supabase
    .from('cycle_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('cycle_id');

  // Transform analyses to camelCase
  const transformedAnalyses = (analyses || []).map(transformCycleAnalysis);

  return (cycles || []).map(cycle => {
    const analysis = transformedAnalyses.find(a => a.cycleId === cycle.id);
    return {
      cycleId: cycle.id,
      cycleTitle: cycle.title,
      analysisExists: !!analysis,
      analysis
    };
  });
}

/**
 * Get all students' analyses for admin view
 */
export async function getAllStudentsAnalyses(): Promise<StudentAnalysisOverview[]> {
  // Get all students
  const { data: students } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'student')
    .order('name');

  // Get all analyses
  const { data: analyses } = await supabase
    .from('cycle_analyses')
    .select('*');

  // Transform analyses to camelCase
  const transformedAnalyses = (analyses || []).map(transformCycleAnalysis);

  return (students || []).map(student => {
    const userAnalyses = transformedAnalyses.filter(a => a.userId === student.id);
    return {
      userId: student.id,
      userName: student.name,
      cycle1: userAnalyses.find(a => a.cycleId === 1),
      cycle2: userAnalyses.find(a => a.cycleId === 2),
      cycle3: userAnalyses.find(a => a.cycleId === 3),
      cycle4: userAnalyses.find(a => a.cycleId === 4)
    };
  });
}

/**
 * Mark analysis as viewed by student
 */
export async function markAnalysisAsViewed(
  userId: string,
  cycleId: number
): Promise<void> {
  const { error } = await supabase
    .from('cycle_analyses')
    .update({
      student_viewed: true,
      student_viewed_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('cycle_id', cycleId);

  if (error) {
    console.error('[Analysis] Failed to mark as viewed:', error);
    throw error;
  }

  console.log(`[Analysis] Marked as viewed: user ${userId}, cycle ${cycleId}`);
}
