import { useT, type Messages } from '@/lib/i18n';

// Labels for AI Tools and Wisdom in Bible on the public church site.
const en = {
  aiToolsTitle: 'AI Tools',
  aiToolsIntro:
    'Tools for growing in faith together. Church tools ask you to sign in with your church account; external links open in a new tab.',
  wisdomName: 'Wisdom in Bible',
  wisdomDescription:
    'Bring your life’s questions to Proverbs, Ecclesiastes and Job — three voices of biblical wisdom, side by side.',
  getInBibleName: 'Get in Bible',
  getInBibleDescription:
    'Start reading Scripture — guided entry points for newcomers and new believers.',
  cultureName: 'Christianity Culture',
  cultureDescription: 'Explore Christianity and culture — faith, history, arts and everyday life.',
  open: 'Open',
  wisdomIntro:
    'Each lesson starts from a life question, then reads it through three perspectives: Proverbs (how life should be ordered), Ecclesiastes (how life often is) and Job (how life sometimes collapses).',
  signInPrompt: 'Please sign in with your church account to take the course.',
  signIn: 'Sign in',
  loadFailed: 'Could not load the course. Please try again.',
  noModules: 'No lessons are published yet.',
  started: 'In progress',
  completed: 'Completed',
  allLessons: 'All lessons',
  steps: {
    questions: 'Life questions',
    perspectives: 'Three perspectives',
    tension: 'Tension',
    discussion: 'Discussion',
    summary: 'Summary',
  },
  perspectiveNames: {
    PROVERBS: 'Proverbs — how life should be ordered',
    ECCLESIASTES: 'Ecclesiastes — how life often is',
    JOB: 'Job — how life sometimes collapses',
  },
  yourAnswer: 'Your answer',
  yourReflection: 'Your reflection',
  othersSaid: 'What others answered',
  noOthers: 'No one else has answered yet.',
  respondents: (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`,
  resource: 'Open resource',
  listen: 'Listen',
  previous: 'Back',
  next: 'Next',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved',
  saveFailed: 'Could not save. Please try again.',
  finish: 'Finish lesson',
  finished: 'Lesson completed. Well done!',
  noPrompts: 'No discussion prompts for this lesson.',
};

const messages = {
  en,
  'zh-TW': {
    aiToolsTitle: 'AI 工具',
    aiToolsIntro: '一同在信仰中成長的工具。教會工具需以教會帳戶登入；外部連結會在新分頁開啟。',
    wisdomName: '聖經中的智慧',
    wisdomDescription: '把人生課題帶到箴言、傳道書與約伯記——三種聖經智慧的聲音並讀。',
    getInBibleName: '進入聖經',
    getInBibleDescription: '開始閱讀聖經——為慕道者及初信者預備的入門引導。',
    cultureName: '基督教文化',
    cultureDescription: '探索基督教與文化——信仰、歷史、藝術與日常生活。',
    open: '開啟',
    wisdomIntro:
      '每課由一個人生課題出發，再以三個視角閱讀：箴言（理應如何）、傳道書（實際常如何）、約伯記（有時完全崩潰）。',
    signInPrompt: '請以教會帳戶登入參加課程。',
    signIn: '登入',
    loadFailed: '無法載入課程，請再試。',
    noModules: '暫時未有已發佈的課堂。',
    started: '進行中',
    completed: '已完成',
    allLessons: '所有課堂',
    steps: {
      questions: '人生課題',
      perspectives: '三個視角',
      tension: '張力引導',
      discussion: '小組討論',
      summary: '智慧總結',
    },
    perspectiveNames: {
      PROVERBS: '箴言：理應如何',
      ECCLESIASTES: '傳道書：實際常如何',
      JOB: '約伯記：有時完全崩潰',
    },
    yourAnswer: '你的回答',
    yourReflection: '你的反思',
    othersSaid: '其他人的回答',
    noOthers: '暫時未有其他人回答。',
    respondents: (n: number) => `${n} 人`,
    resource: '開啟資源',
    listen: '收聽',
    previous: '返回',
    next: '下一步',
    save: '儲存',
    saving: '儲存中…',
    saved: '已儲存',
    saveFailed: '未能儲存，請再試。',
    finish: '完成本課',
    finished: '已完成本課，做得好！',
    noPrompts: '本課沒有討論題。',
  },
} satisfies Messages<typeof en>;

export const useWisdomSiteT = () => useT(messages);
export type WisdomSiteMessages = typeof en;
