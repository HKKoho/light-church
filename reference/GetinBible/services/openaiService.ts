import OpenAI from 'openai';
import { Module } from '../types';
import { ModuleResponseSummary } from './responseService';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const ollamaBaseUrl = import.meta.env.VITE_OLLAMA_BASE_URL; // e.g. https://your-ollama-cloud-host
const ollamaModel = import.meta.env.VITE_OLLAMA_MODEL || 'llama3';

if (!apiKey && !ollamaBaseUrl) {
  console.warn('Neither OpenAI API key nor Ollama base URL configured. Michael AI Teaching Assistant will not be available.');
} else if (!apiKey) {
  console.info('OpenAI API key not configured. Using Ollama as the LLM provider.');
}

const openai = apiKey ? new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true, // Note: In production, consider using a backend proxy
}) : null;

// Ollama client — uses the OpenAI-compatible /v1 endpoint
const ollama = ollamaBaseUrl ? new OpenAI({
  apiKey: 'ollama', // Ollama ignores the key but the SDK requires a non-empty value
  baseURL: ollamaBaseUrl.replace(/\/$/, '') + '/v1',
  dangerouslyAllowBrowser: true,
}) : null;

/**
 * Determine whether an error looks like a regional block / auth failure
 * so we can route to the Ollama fallback.
 */
function isRegionBlockedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  // OpenAI returns 403 for region-blocked requests; also catch network errors
  return (
    msg.includes('403') ||
    msg.includes('region') ||
    msg.includes('country') ||
    msg.includes('unsupported_country') ||
    msg.includes('network') ||
    msg.includes('failed to fetch')
  );
}

/**
 * Call the chat completion API, falling back to Ollama when OpenAI is
 * unavailable or region-blocked.
 */
async function chatWithFallback(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: { max_tokens?: number; temperature?: number; presence_penalty?: number; frequency_penalty?: number }
): Promise<string> {
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        ...options,
      });
      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No response from OpenAI');
      return response.trim();
    } catch (error) {
      const shouldFallback = isRegionBlockedError(error) && ollama !== null;
      if (!shouldFallback) throw error;
      console.warn('OpenAI unavailable (region block or network error); falling back to Ollama.');
    }
  }

  if (ollama) {
    const completion = await ollama.chat.completions.create({
      model: ollamaModel,
      messages,
      ...options,
    });
    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('No response from Ollama');
    return response.trim();
  }

  throw new Error('No LLM provider is configured. Please add VITE_OPENAI_API_KEY or VITE_OLLAMA_BASE_URL to your environment.');
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  message: string;
}

/**
 * Estimate token count for text (rough approximation)
 * Chinese characters typically use 2-3 tokens each
 * English words typically use 1-2 tokens
 */
function estimateTokens(text: string): number {
  // Count Chinese characters
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  // Count other characters (English, punctuation, etc.)
  const otherChars = text.length - chineseChars;

  // Rough estimate: Chinese chars = 2.5 tokens, other = 0.5 tokens
  return Math.ceil(chineseChars * 2.5 + otherChars * 0.5);
}

/**
 * Build user memory context within token limit
 */
function buildUserMemoryContext(
  userModuleResponses: ModuleResponseSummary[],
  currentModuleId: number,
  tokenBudget: number
): string {
  const contextParts: string[] = [];
  let tokenCount = 0;

  // Sort modules by ID (most recent first, excluding current)
  const previousModules = userModuleResponses
    .filter(m => m.moduleId !== currentModuleId)
    .sort((a, b) => b.moduleId - a.moduleId);

  // Add previous module insights (most recent first)
  for (const module of previousModules) {
    const moduleContext = [];

    // Prioritize summary (most condensed insight)
    if (module.summary) {
      moduleContext.push(`課程${module.moduleId}反思：${module.summary}`);
    }

    // Add key discussion points (limit to 2)
    if (module.discussions.length > 0) {
      const keyDiscussions = module.discussions.slice(0, 2);
      moduleContext.push(`課程${module.moduleId}討論：${keyDiscussions.join('；')}`);
    }

    const moduleText = moduleContext.join('\n');
    const moduleTokens = estimateTokens(moduleText);

    // Check if we have budget
    if (tokenCount + moduleTokens > tokenBudget) {
      break; // Stop adding more modules
    }

    contextParts.push(moduleText);
    tokenCount += moduleTokens;
  }

  return contextParts.length > 0
    ? `【學生的學習歷程】\n${contextParts.join('\n\n')}\n`
    : '';
}

/**
 * Get Michael's response to a student's question with smart memory management
 * @param question - The student's question
 * @param module - Current module context
 * @param discussionResponses - Student's responses to discussion prompts
 * @param conversationHistory - Previous messages in this session
 * @param userModuleResponses - Student's responses across all modules
 * @returns Michael's response text
 */
export async function getMichaelResponse(
  question: string,
  module: Module,
  discussionResponses: Record<string, string>,
  conversationHistory: ConversationMessage[],
  userModuleResponses?: ModuleResponseSummary[]
): Promise<string> {
  if (!openai && !ollama) {
    throw new Error('No LLM provider configured. Please add VITE_OPENAI_API_KEY or VITE_OLLAMA_BASE_URL to your environment.');
  }

  try {
    // Token budget management (~10K total limit)
    const MAX_TOKENS = 10000;
    const RESPONSE_TOKENS = 300;  // Reserve for response
    const SYSTEM_BASE_TOKENS = 800; // Approximate base system prompt
    const AVAILABLE_TOKENS = MAX_TOKENS - RESPONSE_TOKENS - SYSTEM_BASE_TOKENS;

    // Build discussion context from current module
    const discussionContext = module.discussionPrompts.map((prompt, idx) => {
      const response = discussionResponses[`discussion_${idx}`];
      return response ? `問題${idx + 1}：${prompt}\n學生回應：${response}` : null;
    }).filter(Boolean).join('\n\n');

    // Allocate token budget
    const memoryBudget = Math.floor(AVAILABLE_TOKENS * 0.25); // 25% for learning history
    const discussionBudget = Math.floor(AVAILABLE_TOKENS * 0.25); // 25% for current discussion
    const conversationBudget = AVAILABLE_TOKENS - memoryBudget - discussionBudget; // 50% for chat history

    // Build user memory context (previous modules)
    const memoryContext = userModuleResponses
      ? buildUserMemoryContext(userModuleResponses, module.id, memoryBudget)
      : '';

    // Truncate discussion context if needed
    let truncatedDiscussionContext = discussionContext;
    const discussionTokens = estimateTokens(discussionContext);
    if (discussionTokens > discussionBudget) {
      // If too long, truncate each response
      const responses = module.discussionPrompts.map((prompt, idx) => {
        const response = discussionResponses[`discussion_${idx}`];
        if (!response) return null;

        const maxResponseLength = Math.floor(discussionBudget / module.discussionPrompts.length / 2.5);
        const truncated = response.length > maxResponseLength
          ? response.substring(0, maxResponseLength) + '...'
          : response;

        return `問題${idx + 1}：${prompt}\n學生回應：${truncated}`;
      }).filter(Boolean).join('\n\n');

      truncatedDiscussionContext = responses;
    }

    // Build system prompt
    const systemPrompt = `你是 Michael（米迦勒），一位擁有深厚福音派神學根基的聖經學習助教。你精通舊約與新約聖經，對保羅神學有全面且當代的理解，同時專精於智慧文學。

【當前課程】
課程標題：${module.title}
課程副標題：${module.subtitle}

${memoryContext}【本課程的討論回應】
${truncatedDiscussionContext || '學生尚未完成討論問題'}

【神學專業背景】
- 保羅神學：精通羅馬書、加拉太書、哥林多書信、以弗所書、腓立比書、歌羅西書等書信，掌握稱義、恩典、信心、聖靈、教會論核心主題
- 加拉太書：自由與律法的張力、因信稱義論證、對抗猶太主義者、聖靈與肉體的對立、基督徒自由
- 以弗所書：教會宏大異象（基督的身體與新婦）、揀選論、猶太人與外邦人的合一、屬靈爭戰（弗6章）、婚姻家庭倫理
- 腓立比書：kenosis 神學（腓2:5-11）、喜樂神學、苦難中的平安、靠主常常喜樂的信仰實踐
- 歌羅西書：宇宙基督論（萬有都靠祂維繫）、對抗諾斯底主義與天使崇拜、在基督裡的完全、脫去舊人穿上新人的倫理更新
- 新保羅主義觀點：熟悉 N.T. Wright、E.P. Sanders、James Dunn 對保羅神學的當代詮釋，包括「律法的工作」、「因信稱義」的新視角
- 保羅的基督論貢獻：理解保羅如何發展道成肉身、十字架救贖、復活盼望與末世論
- 舊約背景：連結摩西律法、先知書（特別是以賽亞書的受苦僕人）與新約應驗
- 智慧文學：深入《箴言》（秩序與因果）、《傳道書》（限制與虛空）、《約伯記》（苦難與奧秘）
- 福音派立場：以聖經權威、因信稱義、基督代贖、個人信仰回應為核心

【你的角色】
1. 用溫暖、鼓勵的語氣回應學生的問題
2. 幫助學生連結經文與生活經驗及信仰實踐
3. 提出啟發性的追問，引導他們深入思考
4. 如果學生有學習歷程，連結他們過去的反思與當下的問題
5. 不要提供標準答案，而是引導學生自己探索
6. 回應長度控制在 120-180 字
7. 必須使用繁體中文回應

【回應原則】
- 適時連結智慧文學與保羅神學的對話（如苦難、因信稱義、盼望）
- 避免說教，多用提問引導學生思考
- 肯定學生的洞察，同時提供舊約或保羅書信的新視角
- 關注學生的個人信仰掙扎與屬靈成長
- 保持謙卑，承認神學問題有不同詮釋角度
- 如果學生在不同課程中反思類似主題，幫助他們看見成長軌跡`;

    // Smart conversation history truncation
    let conversationMessages = conversationHistory;
    const conversationTokensEstimate = conversationHistory.reduce(
      (sum, msg) => sum + estimateTokens(msg.message),
      0
    );

    if (conversationTokensEstimate > conversationBudget) {
      // Keep most recent messages that fit budget
      const recentMessages: ConversationMessage[] = [];
      let tokenSum = 0;

      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const msgTokens = estimateTokens(conversationHistory[i].message);
        if (tokenSum + msgTokens > conversationBudget) break;

        recentMessages.unshift(conversationHistory[i]);
        tokenSum += msgTokens;
      }

      conversationMessages = recentMessages;
    }

    // Build conversation messages
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.message,
      })),
      { role: 'user', content: question },
    ];

    return await chatWithFallback(messages, {
      max_tokens: RESPONSE_TOKENS,
      temperature: 0.7,
      presence_penalty: 0.3,
      frequency_penalty: 0.3,
    });
  } catch (error) {
    console.error('Error getting Michael response:', error);

    // Provide a fallback response in case of API errors
    return '抱歉，我現在無法回應。請稍後再試，或者繼續探索其他討論問題。如果問題持續，請聯繫您的導師。';
  }
}

/**
 * Generate speech audio from text using OpenAI TTS
 * @param text - Text to convert to speech
 * @returns Base64 encoded MP3 audio data
 */
export async function generateOpenAITTS(text: string): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI service is not configured. Please add VITE_OPENAI_API_KEY to your environment.');
  }

  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova', // Female voice, warm and clear
      input: text,
      response_format: 'mp3',
      speed: 0.95, // Slightly slower for clarity
    });

    // Convert response to base64
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...uint8Array));

    return base64;
  } catch (error) {
    console.error('Error generating OpenAI TTS:', error);
    throw new Error('Failed to generate speech. Please try again.');
  }
}

/**
 * Check if any LLM service (OpenAI or Ollama fallback) is available
 */
export function isOpenAIAvailable(): boolean {
  return openai !== null || ollama !== null;
}

/**
 * Content step types for admin content helper
 */
export type ContentStepType =
  | 'basic_info'       // Tab 0: 基本資訊
  | 'perspectives'     // Tab 1: 書卷
  | 'life_questions'   // Tab 2: 經卷提問
  | 'tension_guides'   // Tab 3: 經文痛點
  | 'discussion'       // Tab 4: 互動討論
  | 'summary';         // Tab 5: 安靜整合

/**
 * Get step-specific system prompt for content development
 */
function getStepPrompt(stepType: ContentStepType): string {
  const prompts: Record<ContentStepType, string> = {
    basic_info: `你正在協助管理員設定月課的基本資訊。
幫助他們：
- 設計吸引人的月課標題（格式：第 X 課｜主題）
- 撰寫副標題（概括經卷的核心信息）
- 選擇適合的循環分類`,

    perspectives: `你正在協助管理員撰寫經卷的觀點內容。
幫助他們為《馬太福音》、《以賽亞書》、《保羅書信》撰寫：
- 主題：該卷書對本月主題的獨特角度
- 描述：150-200字的深入說明
從各卷書的獨特視角探索：
- 馬太福音：天國的福音、耶穌的教導與門徒的使命
- 以賽亞書：神的審判與救贖、彌賽亞的預言與盼望
- 保羅書信：因信稱義、在基督裡的新生命與教會建造`,

    life_questions: `你正在協助管理員設計經卷提問。
幫助他們設計能引發反思的問題：
- 開放式問題：讓學員分享個人經驗
- 多選題：幫助學員辨識自己的立場
問題應該：
- 連結經文與生活實際
- 不預設「正確答案」
- 引發真誠的自我反思`,

    tension_guides: `你正在協助管理員撰寫經文難點內容。
幫助他們解釋：
- 經文中難以理解的概念或教導
- 如何從歷史文化背景理解經文
- 經文對當代信徒的意義與挑戰
- 實際生活中的應用場景`,

    discussion: `你正在協助管理員設計互動討論問題。
幫助他們設計適合小組討論的問題：
- 促進分享而非辯論
- 沒有標準答案
- 從個人經驗出發
- 能深入到信仰實踐`,

    summary: `你正在協助管理員撰寫安靜整合內容。
幫助他們撰寫：
- 一句話總結本課核心洞見
- 適合默想的反思要點
- 連結經卷教導與生命應用`
  };

  return prompts[stepType];
}

/**
 * Get Michael's response for admin content development
 * @param question - Admin's question or request
 * @param stepType - Current step/tab type
 * @param moduleContext - Current module data for context
 * @param conversationHistory - Previous messages in this session
 * @returns Michael's response text
 */
export async function getMichaelContentHelp(
  question: string,
  stepType: ContentStepType,
  moduleContext: {
    title?: string;
    subtitle?: string;
    perspectives?: Record<string, { book: string; theme: string; description: string }>;
    lifeQuestions?: Array<{ questionText: string; questionType: string }>;
    tensionGuides?: string[];
    discussionPrompts?: string[];
    summary?: string;
  },
  conversationHistory: ConversationMessage[]
): Promise<string> {
  if (!openai && !ollama) {
    throw new Error('No LLM provider configured. Please add VITE_OPENAI_API_KEY or VITE_OLLAMA_BASE_URL to your environment.');
  }

  try {
    const stepPrompt = getStepPrompt(stepType);

    // Build context from current module data
    const contextParts: string[] = [];
    if (moduleContext.title) contextParts.push(`月課標題：${moduleContext.title}`);
    if (moduleContext.subtitle) contextParts.push(`副標題：${moduleContext.subtitle}`);
    if (moduleContext.perspectives) {
      const perspectiveText = Object.entries(moduleContext.perspectives)
        .map(([key, val]) => `${val.book}：${val.theme || '（未設定主題）'}`)
        .join('\n');
      contextParts.push(`書卷觀點：\n${perspectiveText}`);
    }
    if (moduleContext.lifeQuestions && moduleContext.lifeQuestions.length > 0) {
      const questionsText = moduleContext.lifeQuestions
        .map((q, i) => `${i + 1}. ${q.questionText}`)
        .join('\n');
      contextParts.push(`經卷提問：\n${questionsText}`);
    }
    if (moduleContext.tensionGuides && moduleContext.tensionGuides.length > 0) {
      contextParts.push(`經文痛點數量：${moduleContext.tensionGuides.length} 項`);
    }
    if (moduleContext.discussionPrompts && moduleContext.discussionPrompts.length > 0) {
      contextParts.push(`互動討論數量：${moduleContext.discussionPrompts.length} 項`);
    }

    const moduleContextText = contextParts.length > 0
      ? `【目前月課內容】\n${contextParts.join('\n\n')}`
      : '【目前月課內容】\n尚未填寫任何內容';

    const systemPrompt = `你是 Michael（米迦勒），一位擁有深厚福音派神學根基的聖經研究AI助教，精通希伯來文與希臘文，對保羅神學、舊約與新約有全面且當代的學術理解。你正在協助管理員開發課程內容。

【神學專業根基】
- 保羅神學：精通保羅全部書信，掌握稱義（δικαιοσύνη）、恩典（χάρις）、在基督裡（ἐν Χριστῷ）、聖靈論、末世論等核心神學概念
- 加拉太書：自由與律法的張力、因信稱義論證、對抗猶太主義者（Judaizers）、聖靈與肉體的對立，是保羅因信稱義神學的核心宣言
- 以弗所書：教會為基督身體與新婦的宏大異象、屬天揀選論、猶太人與外邦人合一的奧秘、屬靈爭戰（弗6章全副軍裝）、婚姻家庭倫理
- 腓立比書：kenosis 神學（腓2:5-11，基督自我虛空）、在苦難中的喜樂神學、「靠主常常喜樂」的靈修實踐、保羅的平安哲學
- 歌羅西書：宇宙基督論（萬有靠基督維繫、首生的）、對抗諾斯底主義與天使崇拜的異端、在基督裡的完全與充滿、脫去舊人穿上新人的倫理更新
- 新觀點保羅學：熟悉 N.T. Wright 的「神的公義」詮釋、E.P. Sanders 的「盟約守法論」（covenantal nomism）、James Dunn 的「律法的工作」重新定義
- 保羅對基督教的貢獻：外邦人宣教神學、教會為基督身體的ecclesiology、十字架神學、復活的末世意涵
- 舊約根基：熟悉五經律法、先知書（以賽亞書受苦僕人、耶利米的新約預言）、詩篇彌賽亞詩篇，以及這些如何在保羅書信中被引用詮釋
- 福音派立場：以聖經全然默示、因信稱義、基督替代救贖、個人重生回應為核心

${stepPrompt}

${moduleContextText}

【回應原則】
1. 用專業、友善的語氣回應
2. 提供具體可用的建議或內容，適時融入保羅神學視角
3. 如果管理員要求生成內容，直接提供可複製使用的文字
4. 回應長度適中（100-300字），除非需要生成完整內容
5. 必須使用繁體中文
6. 可以提供多個選項供管理員選擇
7. 從《馬太福音》、《以賽亞書》、《保羅書信》各自的獨特視角探索主題，並連結當代福音派神學洞見`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.message,
      })),
      { role: 'user', content: question },
    ];

    return await chatWithFallback(messages, { max_tokens: 800, temperature: 0.7 });
  } catch (error) {
    console.error('Error getting Michael content help:', error);
    return '抱歉，我現在無法回應。請稍後再試。';
  }
}

/**
 * Student step types for Michael student helper
 */
export type StudentStepType =
  | 'perspectives'     // 書卷
  | 'life_questions'   // 經卷提問
  | 'tension'          // 經文痛點
  | 'discussion'       // 互動討論
  | 'summary';         // 安靜整合

/**
 * Get step-specific prompt for student help
 */
function getStudentStepPrompt(stepType: StudentStepType): string {
  const prompts: Record<StudentStepType, string> = {
    perspectives: `你正在幫助學員理解本課的《馬太福音》、《以賽亞書》、《保羅書信》的觀點。
幫助他們：
- 理解每卷書對本課主題的獨特視角
- 解釋經文的含義和背景
- 連結經文與現代生活`,

    life_questions: `你正在幫助學員回答生活提問。
幫助他們：
- 深入思考問題背後的意義
- 連結個人經驗與經文教導
- 不要直接給答案，而是引導反思`,

    tension: `你正在幫助學員理解價值張力引導。
幫助他們：
- 理解《馬太福音》、《以賽亞書》、《保羅書信》觀點之間的張力
- 思考為何經文有時看似矛盾
- 在張力中尋找平衡與真理`,

    discussion: `你正在幫助學員參與互動討論。
幫助他們：
- 整理和表達自己的想法
- 從不同角度思考問題
- 連結討論與信仰實踐`,

    summary: `你正在幫助學員進行安靜整合。
幫助他們：
- 總結今天學到的真理
- 思考如何應用到生活
- 寫下有意義的反思`
  };

  return prompts[stepType];
}

/**
 * Get Michael's response for student learning help
 * @param question - Student's question
 * @param stepType - Current step type
 * @param moduleContext - Current module data for context
 * @param conversationHistory - Previous messages in this session
 * @returns Michael's response text
 */
export async function getMichaelStudentHelp(
  question: string,
  stepType: StudentStepType,
  moduleContext: {
    title: string;
    subtitle: string;
    perspectives?: Record<string, { book: string; theme: string; description: string }>;
    lifeQuestions?: Array<{ questionText: string }>;
    tensionGuides?: string[];
    discussionPrompts?: string[];
    summary?: string;
  },
  conversationHistory: ConversationMessage[]
): Promise<string> {
  if (!openai && !ollama) {
    throw new Error('No LLM provider configured. Please add VITE_OPENAI_API_KEY or VITE_OLLAMA_BASE_URL to your environment.');
  }

  try {
    const stepPrompt = getStudentStepPrompt(stepType);

    // Build context from current module data
    const contextParts: string[] = [];
    contextParts.push(`課程標題：${moduleContext.title}`);
    contextParts.push(`副標題：${moduleContext.subtitle}`);

    if (moduleContext.perspectives) {
      const perspectiveText = Object.entries(moduleContext.perspectives)
        .map(([key, val]) => `${val.book}：${val.theme} - ${val.description}`)
        .join('\n');
      contextParts.push(`書卷觀點：\n${perspectiveText}`);
    }

    const moduleContextText = contextParts.join('\n\n');

    const systemPrompt = `你是 Michael（米迦勒），一位擁有深厚福音派神學根基的聖經研究導師，精通希伯來文，對保羅神學、舊約與新約有全面且當代的理解。你正在幫助學員深入學習聖經內容。

【神學專業根基】
- 保羅神學：精通保羅書信中的稱義、恩典、聖靈、教會論，以及保羅對基督教神學的奠基貢獻
- 加拉太書：自由與律法的張力、因信稱義的核心論證、聖靈與肉體的對立、基督徒的自由與服事
- 以弗所書：教會為基督身體與新婦的宏大異象、揀選與恩典、猶太人與外邦人的合一、屬靈爭戰、婚姻家庭倫理
- 腓立比書：kenosis 基督論（腓2:5-11）、喜樂神學、在苦難與囚禁中的平安、靠主常常喜樂的靈命實踐
- 歌羅西書：宇宙基督論（基督為萬有之首）、對抗異端（諾斯底主義與天使崇拜）、在基督裡的完全充滿、更新倫理生活
- 新保羅觀點：熟悉 N.T. Wright、E.P. Sanders 等學者的當代詮釋，理解保羅在第二聖殿猶太教背景下的神學突破
- 舊約根基：掌握希伯來文詞彙用法、先知書、律法書與詩篇如何預表並連結新約福音
- 福音派信仰：以聖經默示、因信稱義、基督代贖、福音使命為核心立場

${stepPrompt}

【當前課程內容】
${moduleContextText}

【回應原則】
1. 用溫暖、鼓勵的語氣回應
2. 回應長度適中（100-180字）
3. 必須使用繁體中文
4. 不要直接給標準答案，引導學員思考
5. 適時連結《馬太福音》、《以賽亞書》、《保羅書信》與福音派神學觀點
6. 肯定學員的問題，讓他們感到被理解並受到鼓勵`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.message,
      })),
      { role: 'user', content: question },
    ];

    return await chatWithFallback(messages, { max_tokens: 400, temperature: 0.7 });
  } catch (error) {
    console.error('Error getting Michael student help:', error);
    return '抱歉，我現在無法回應。請稍後再試，或者繼續探索課程內容。';
  }
}

/**
 * Generate a Bible book overview within 300 words using OpenAI
 * @param bookTitle - The title of the Bible book (e.g., "創世記", "箴言")
 * @returns Generated overview text
 */
export async function generateBibleBookOverview(bookTitle: string): Promise<string> {
  if (!openai && !ollama) {
    throw new Error('No LLM provider configured. Please add VITE_OPENAI_API_KEY or VITE_OLLAMA_BASE_URL to your environment.');
  }

  try {
    const systemPrompt = `你是一位專精於聖經研究的學者。請為指定的聖經書卷撰寫一份概要。

【要求】
1. 內容必須在300字以內
2. 使用繁體中文
3. 包含以下重點：
   - 書卷的主題與核心信息
   - 作者與寫作背景（如有已知）
   - 主要內容結構
   - 對現代讀者的意義
4. 語氣應該學術且易於理解
5. 避免過度神學術語`;

    return await chatWithFallback(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `請為《${bookTitle}》撰寫經卷概要。` },
      ],
      { max_tokens: 500, temperature: 0.7 }
    );
  } catch (error) {
    console.error('Error generating Bible book overview:', error);
    throw new Error('生成經卷概要失敗，請稍後再試。');
  }
}
