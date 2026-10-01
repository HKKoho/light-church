import type { Messages } from '@/lib/i18n';

export interface HelpAssistantText {
  open: string;
  close: string;
  title: string;
  subtitle: string;
  newChat: string;
  welcome: string;
  suggestionsLabel: string;
  suggestions: readonly string[];
  placeholder: string;
  send: string;
  attach: string;
  attachHint: string;
  reading: string;
  thinking: string;
  remove: string;
  copy: string;
  copied: string;
  sources: string;
  truncated: string;
  privacy: string;
}

export const helpAssistantMessages = {
  en: {
    open: 'Open Help Assistant',
    close: 'Close Help Assistant',
    title: 'Help Assistant',
    subtitle: 'Ask about Light Church, or get help writing',
    newChat: 'New chat',
    welcome:
      'Hi! I can show you how to use any part of Light Church, and help you draft, edit, summarize or search. What would you like to do?',
    suggestionsLabel: 'Try asking',
    suggestions: [
      'What can I do on this page?',
      'How do I take attendance with Roll Call?',
      'Draft a Sunday announcement for our church picnic',
      'Find our newsletter files in the workspace',
    ],
    placeholder: 'Ask a question, or paste text to edit…',
    send: 'Send',
    attach: 'Attach a document to summarize or edit',
    attachHint: 'PDF, Word, text or Markdown',
    reading: 'Reading document…',
    thinking: 'Thinking…',
    remove: 'Remove',
    copy: 'Copy',
    copied: 'Copied',
    sources: 'Sources',
    truncated: 'This document is long, so only the first part was read.',
    privacy:
      'Kept only until you close this browser tab. AI can make mistakes — check before sharing.',
  },
  'zh-TW': {
    open: '開啟使用助手',
    close: '關閉使用助手',
    title: '使用助手',
    subtitle: '查詢光教會的功能，或協助撰寫文字',
    newChat: '新對話',
    welcome: '你好！我可以教你使用光教會的各項功能，也可以幫你草擬、修改、摘要或搜尋。想做甚麼呢？',
    suggestionsLabel: '可以試試問',
    suggestions: [
      '這個頁面可以做甚麼？',
      '怎樣用「點名」記錄出席？',
      '幫我草擬教會野餐的主日報告',
      '在工作區找我們的通訊檔案',
    ],
    placeholder: '輸入問題，或貼上要修改的文字…',
    send: '傳送',
    attach: '附加文件以摘要或修改',
    attachHint: 'PDF、Word、純文字或 Markdown',
    reading: '正在讀取文件…',
    thinking: '思考中…',
    remove: '移除',
    copy: '複製',
    copied: '已複製',
    sources: '資料來源',
    truncated: '文件較長，只讀取了前面部分。',
    privacy: '對話只保留至你關閉此瀏覽器分頁。AI 可能出錯，分享前請先檢查。',
  },
} satisfies Messages<HelpAssistantText>;
