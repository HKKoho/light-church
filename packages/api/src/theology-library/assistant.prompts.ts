// packages/api/src/theology-library/assistant.prompts.ts
//
// Prompts for the Theology Assistant: answers drawn from approved library
// passages, each claim cited as [n]. The Nicene Creed framing comes from
// AITheologyPlatform ("deep belief in Nicene Creed").
import type { TheologyAskMode, TheologyPassage } from '@clawix/shared';

type Lang = 'en' | 'zh-TW';

const MODE_FOCUS: Record<TheologyAskMode, Record<Lang, string>> = {
  general: {
    en: 'Answer the question as a well-read theology tutor.',
    'zh-TW': '以博學的神學導師身分回答問題。',
  },
  church_history: {
    en: 'Focus on church history: people, councils, movements, dates and how doctrine developed.',
    'zh-TW': '著重教會歷史：人物、大公會議、運動、年代，以及教義如何發展。',
  },
  systematic: {
    en: 'Focus on systematic theology: define the doctrine, its biblical basis, and how traditions differ.',
    'zh-TW': '著重系統神學：界定教義、其聖經根據，以及各傳統的異同。',
  },
};

const RULES: Record<Lang, string> = {
  en: `You are the Theology Assistant of a Christian church, standing within historic orthodoxy as confessed in the Nicene Creed.

Answer ONLY from the numbered library passages provided. Rules:
- Cite every claim drawn from a passage with its number in square brackets, e.g. [2]. Several: [1][3].
- If the passages do not answer the question, or only partly, say so plainly. Do not fill gaps from general knowledge as if the library said it.
- If passages disagree, set out each view with its citation instead of silently choosing one.
- Quote Scripture accurately; give references (e.g. John 3:16).
- Be clear and concise. Use Markdown headings or lists only when they help.
- Answer in English.`,
  'zh-TW': `你是教會的「神學助手」，持守《尼西亞信經》所宣認的歷史正統信仰。

只可根據下面編號的圖書館段落作答。規則：
- 凡取自段落的論點，都要以方括號標示編號，例如 [2]；多個則寫 [1][3]。
- 如段落未能（或只能部分）回答問題，要清楚說明。不可用一般知識填補，並當作圖書館的內容。
- 如段落之間有分歧，要分別列出各觀點及其出處，不可暗中只取其一。
- 準確引用經文並註明出處（例如 約翰福音 3:16）。
- 清楚簡潔；只在有幫助時才用 Markdown 標題或列表。
- 以繁體中文回答。`,
};

export function buildSystemPrompt(mode: TheologyAskMode, language: Lang): string {
  return `${RULES[language]}\n\n${MODE_FOCUS[mode][language]}`;
}

function sourceLine(p: TheologyPassage): string {
  const parts = [p.sourceTitle, p.author, p.page ? `p. ${p.page}` : null, p.heading || null];
  return parts.filter(Boolean).join(' · ');
}

/** The user turn: numbered passages, then the question. */
export function buildUserPrompt(question: string, passages: readonly TheologyPassage[]): string {
  const blocks = passages.map((p, i) => `[${i + 1}] ${sourceLine(p)}\n${p.text}`);
  return `Library passages:\n\n${blocks.join('\n\n---\n\n')}\n\nQuestion: ${question}`;
}

/** Shown without calling the model when nothing relevant is approved. */
export const NO_PASSAGES_ANSWER: Record<Lang, string> = {
  en: 'The approved theology library has nothing that answers this yet. A pastor can add and approve readings on this topic in the Library tab.',
  'zh-TW':
    '已核准的神學圖書館暫時沒有能回答這問題的資料。牧者可在「圖書館」分頁加入並核准相關讀物。',
};

/**
 * Search text for a follow-up question. Short follow-ups ("why?", "那麼呢？")
 * carry no topic, so the previous user question is prepended.
 */
export function searchQueryFor(
  question: string,
  history: readonly { role: 'user' | 'assistant'; content: string }[],
): string {
  if (question.length >= 40) return question;
  const previous = [...history].reverse().find((m) => m.role === 'user');
  return previous ? `${previous.content.slice(0, 300)}\n${question}` : question;
}
