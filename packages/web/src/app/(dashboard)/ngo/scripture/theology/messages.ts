import type {
  TheologyAskMode,
  TheologyDoctrineTag,
  TheologyLanguage,
  TheologySourceKind,
  TheologySourceStatus,
} from '@clawix/shared';
import { useT, type Messages } from '@/lib/i18n';

interface TheologyMessages {
  back: string;
  title: string;
  subtitle: string;
  noAccess: string;
  open: string;
  later: string;
  cards: Record<
    'assistant' | 'library' | 'journey' | 'pastor',
    { name: string; description: string }
  >;
  // Assistant
  assistantTitle: string;
  assistantHint: string;
  modes: Record<TheologyAskMode, string>;
  modeHints: Record<TheologyAskMode, string>;
  placeholder: string;
  send: string;
  clear: string;
  thinking: string;
  sources: string;
  noSources: string;
  notGrounded: string;
  page: (n: number) => string;
  // Library
  libraryTitle: string;
  libraryHint: string;
  upload: string;
  empty: string;
  emptyReader: string;
  passages: (n: number) => string;
  pages: (n: number) => string;
  ocr: (n: number) => string;
  general: string;
  review: string;
  reprocess: string;
  delete: string;
  deleteBody: string;
  cancel: string;
  statuses: Record<TheologySourceStatus, string>;
  kinds: Record<TheologySourceKind, string>;
  languages: Record<TheologyLanguage, string>;
  traditions: Record<TheologyDoctrineTag, string>;
  // Upload
  uploadTitle: string;
  uploadHint: string;
  file: string;
  fileHint: string;
  titleLabel: string;
  author: string;
  kind: string;
  language: string;
  copyright: string;
  copyrightNote: string;
  copyrightNoteHint: string;
  tooLarge: string;
  uploading: string;
  // Review
  reviewTitle: string;
  reviewHint: string;
  extracted: string;
  doctrineTags: string;
  doctrineTagsHint: string;
  reviewNote: string;
  reviewNoteHint: string;
  approve: string;
  reject: string;
  noteRequired: string;
  failed: string;
}

const en: TheologyMessages = {
  back: 'Scripture & Learning',
  title: 'Theology Platform',
  subtitle:
    'Study doctrine and church history from the library your pastors have read and approved. Every answer cites its source.',
  noAccess: 'The Theology Platform is for church staff and leaders.',
  open: 'Open',
  later: 'Coming later',
  cards: {
    assistant: {
      name: 'Theology Assistant',
      description:
        'Ask about doctrine, Scripture or church history. Answers cite the approved library.',
    },
    library: {
      name: 'Theology Library',
      description: 'Readings your pastors have uploaded and approved — creeds, books, sermons.',
    },
    journey: {
      name: 'Theological Journey',
      description: 'Explore people, councils and doctrines as a connected map and timeline.',
    },
    pastor: {
      name: "Pastor's Teaching",
      description: "Ask questions answered from your pastor's own sermons — with their consent.",
    },
  },
  assistantTitle: 'Theology Assistant',
  assistantHint:
    'Answers come only from approved library readings, with numbered citations. If the library has nothing on a topic, the assistant says so.',
  modes: { general: 'Ask', church_history: 'Church history', systematic: 'Systematic theology' },
  modeHints: {
    general: 'Ask anything about the faith.',
    church_history: 'People, councils, movements and how doctrine developed.',
    systematic: 'Define a doctrine, its biblical basis and how traditions differ.',
  },
  placeholder: 'e.g. What did the Council of Nicaea decide, and why?',
  send: 'Ask',
  clear: 'New conversation',
  thinking: 'Searching the library…',
  sources: 'Sources',
  noSources: 'Sources for the latest answer appear here.',
  notGrounded: 'Not from the library',
  page: (n) => `p. ${n}`,
  libraryTitle: 'Theology Library',
  libraryHint:
    'Upload readings, then review each one. Only approved readings are searched; doctrine tags limit a reading to the traditions it speaks for.',
  upload: 'Upload reading',
  empty: 'No readings yet. Upload a creed, book or sermon to start.',
  emptyReader: 'No approved readings yet.',
  passages: (n) => `${n} passages`,
  pages: (n) => `${n} pages`,
  ocr: (n) => `${n} scanned pages read by OCR`,
  general: 'General',
  review: 'Review',
  reprocess: 'Reprocess',
  delete: 'Delete',
  deleteBody: 'Its passages are removed from search. This is recorded in the audit log.',
  cancel: 'Cancel',
  statuses: {
    processing: 'Processing',
    pending_review: 'Awaiting review',
    approved: 'Approved',
    rejected: 'Rejected',
    failed: 'Failed',
  },
  kinds: {
    book: 'Book',
    commentary: 'Commentary',
    systematic: 'Systematic theology',
    creed: 'Creed',
    confession: 'Confession',
    sermon: 'Sermon',
    article: 'Article',
    lecture: 'Lecture',
    other: 'Other',
  },
  languages: {
    'zh-TW': 'Traditional Chinese',
    'zh-CN': 'Simplified Chinese',
    en: 'English',
    other: 'Other',
  },
  traditions: {
    baptist: 'Baptist',
    non_denominational: 'Non-denominational',
    reformed: 'Reformed',
    wesleyan: 'Wesleyan',
    pentecostal: 'Pentecostal',
    anglican: 'Anglican',
    lutheran: 'Lutheran',
    catholic: 'Catholic',
  },
  uploadTitle: 'Upload a reading',
  uploadHint:
    'PDF, Word (.docx), Markdown or text, up to 20 MB. It is read and indexed in the background, then waits for your review.',
  file: 'File',
  fileHint:
    'PDFs over 300 pages must be split into parts. Scanned pages are read with English OCR only.',
  titleLabel: 'Title',
  author: 'Author',
  kind: 'Type',
  language: 'Language',
  copyright:
    'Our church may use this text (public domain, our own, or permitted by the publisher).',
  copyrightNote: 'Copyright note',
  copyrightNoteHint: 'e.g. Public domain (CCEL), or permission from the publisher.',
  tooLarge: 'The file is larger than 20 MB.',
  uploading: 'Uploading…',
  reviewTitle: 'Review reading',
  reviewHint:
    'Read the extracted text. Approve to make it searchable, or reject with a note. Leave doctrine tags empty for general material (lexicons, history).',
  extracted: 'Extracted text',
  doctrineTags: 'Doctrine tags',
  doctrineTagsHint: 'Only searches for these traditions will include this reading.',
  reviewNote: 'Note',
  reviewNoteHint: 'Required when rejecting.',
  approve: 'Approve',
  reject: 'Reject',
  noteRequired: 'Add a note explaining the rejection.',
  failed: 'Something went wrong. Please try again.',
};

const zh: TheologyMessages = {
  back: '聖經與學習',
  title: '神學平台',
  subtitle: '從牧者已閱讀並核准的圖書館研讀教義與教會歷史。每個答案都註明出處。',
  noAccess: '神學平台供教會同工及領袖使用。',
  open: '開啟',
  later: '稍後推出',
  cards: {
    assistant: {
      name: '神學助手',
      description: '詢問教義、經文或教會歷史；答案引用已核准的圖書館資料。',
    },
    library: { name: '神學圖書館', description: '牧者上載並核准的讀物——信經、書籍、講道。' },
    journey: { name: '神學旅程', description: '以關聯圖及時間線探索人物、大公會議與教義。' },
    pastor: { name: '牧者教導', description: '在牧者同意下，以其講道內容回答提問。' },
  },
  assistantTitle: '神學助手',
  assistantHint: '答案只取自已核准的圖書館讀物，並附編號出處。如圖書館沒有相關資料，助手會直說。',
  modes: { general: '提問', church_history: '教會歷史', systematic: '系統神學' },
  modeHints: {
    general: '詢問任何有關信仰的問題。',
    church_history: '人物、大公會議、運動，以及教義如何發展。',
    systematic: '界定教義、其聖經根據，以及各傳統的異同。',
  },
  placeholder: '例如：尼西亞會議決定了甚麼？為甚麼？',
  send: '提問',
  clear: '新對話',
  thinking: '正在搜尋圖書館…',
  sources: '出處',
  noSources: '最新答案的出處會在這裏顯示。',
  notGrounded: '非取自圖書館',
  page: (n) => `第 ${n} 頁`,
  libraryTitle: '神學圖書館',
  libraryHint: '上載讀物後逐一審核。只有已核准的讀物會被搜尋；教義標籤會把讀物限於其所代表的傳統。',
  upload: '上載讀物',
  empty: '尚未有讀物。上載信經、書籍或講道開始。',
  emptyReader: '尚未有已核准的讀物。',
  passages: (n) => `${n} 段`,
  pages: (n) => `${n} 頁`,
  ocr: (n) => `${n} 頁掃描以 OCR 讀取`,
  general: '一般',
  review: '審核',
  reprocess: '重新處理',
  delete: '刪除',
  deleteBody: '其段落會從搜尋中移除，並記錄於審計日誌。',
  cancel: '取消',
  statuses: {
    processing: '處理中',
    pending_review: '待審核',
    approved: '已核准',
    rejected: '已拒絕',
    failed: '失敗',
  },
  kinds: {
    book: '書籍',
    commentary: '註釋書',
    systematic: '系統神學',
    creed: '信經',
    confession: '信條',
    sermon: '講道',
    article: '文章',
    lecture: '講座',
    other: '其他',
  },
  languages: { 'zh-TW': '繁體中文', 'zh-CN': '簡體中文', en: '英文', other: '其他' },
  traditions: {
    baptist: '浸信會',
    non_denominational: '不分宗派',
    reformed: '改革宗',
    wesleyan: '衛理宗',
    pentecostal: '五旬節派',
    anglican: '聖公會',
    lutheran: '信義宗',
    catholic: '天主教',
  },
  uploadTitle: '上載讀物',
  uploadHint:
    'PDF、Word（.docx）、Markdown 或文字檔，最多 20 MB。系統會在背景讀取及建立索引，然後等候你審核。',
  file: '檔案',
  fileHint: '超過 300 頁的 PDF 須分拆上載。掃描頁面暫時只能以英文 OCR 讀取。',
  titleLabel: '標題',
  author: '作者',
  kind: '類型',
  language: '語言',
  copyright: '本教會可使用此文本（公共領域、本會自有，或已獲出版社准許）。',
  copyrightNote: '版權備註',
  copyrightNoteHint: '例如：公共領域（CCEL），或已獲出版社准許。',
  tooLarge: '檔案大於 20 MB。',
  uploading: '上載中…',
  reviewTitle: '審核讀物',
  reviewHint:
    '閱讀擷取的文字。核准後即可被搜尋，或附註拒絕。一般資料（字典、歷史）請留空教義標籤。',
  extracted: '擷取的文字',
  doctrineTags: '教義標籤',
  doctrineTagsHint: '只有搜尋這些傳統時才會包括此讀物。',
  reviewNote: '備註',
  reviewNoteHint: '拒絕時必須填寫。',
  approve: '核准',
  reject: '拒絕',
  noteRequired: '請加上備註說明拒絕原因。',
  failed: '出了點問題，請再試一次。',
};

const messages: Messages<TheologyMessages> = { en, 'zh-TW': zh };

export function useTheologyT(): TheologyMessages {
  return useT(messages);
}
