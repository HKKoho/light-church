import { useT, type Messages } from '@/lib/i18n';

// Smart mode's self check-in (kiosk), care log and further analysis. Kept
// apart from messages.ts so each file stays small.
const en = {
  // Member details
  phoneLast4: 'Phone (last 4)',
  department: 'Department',
  // Kiosk
  openKiosk: 'Self check-in kiosk',
  kioskHint:
    'Open on a tablet at the door: people check themselves in with the last 4 digits of their phone.',
  kioskTitle: 'Self check-in',
  kioskPrompt: 'Enter the last 4 digits of your phone',
  kioskLive: 'Live',
  kioskCount: (n: number) => `${n} checked in`,
  kioskSearching: 'Looking up…',
  kioskListening: 'Listening…',
  kioskSpeak: 'Say the digits',
  kioskNoSpeech: 'Voice input is not supported in this browser.',
  kioskNotFound: 'No one found with this number. Please see a welcomer.',
  kioskPick: 'Which one is you?',
  kioskConfirm: 'Confirm attendance',
  kioskAlready: (name: string) => `${name}, you are already checked in.`,
  kioskDone: 'Checked in!',
  kioskWelcome: (name: string) => `Welcome, ${name}. Your attendance is recorded.`,
  kioskReset: (n: number) => `Resetting in ${n}s`,
  kioskLog: 'Latest check-ins',
  kioskWaiting: 'Waiting for the first check-in…',
  kioskExit: 'Exit kiosk',
  kioskNoSession: 'No roll call is open. Start one in Take roll, then open the kiosk.',
  kioskByKiosk: 'Self',
  clear: 'Clear',
  // Care log
  careKinds: {
    call: 'Phone call',
    visit: 'Visit',
    message: 'Message',
    prayer: 'Prayed',
    other: 'Other',
  },
  careHow: 'How',
  careHistory: 'Care history',
  careHistoryEmpty: 'No follow-ups recorded yet.',
  careBy: (name: string) => `by ${name}`,
  firstTimers: 'First-timers to welcome',
  firstTimerText: (date: string, since: number, back: boolean) =>
    `First came ${date}` +
    (since === 0 ? ' (last roll call)' : back ? ' · came again' : ' · not back yet'),
  markWelcomed: 'Mark welcomed',
  // Care queue (home)
  careQueue: 'Care queue',
  careQueueHint: 'Open follow-ups and first-timers across all groups.',
  careQueueEmpty: 'Nothing waiting — everyone has been followed up.',
  careQueueMore: (n: number) => `and ${n} more`,
  openGroup: 'Open group',
  // Analysis
  byDepartment: 'By department',
  retention: 'Newcomer retention',
  retentionHint: (n: number) =>
    `People who first came that month (not counting a group's first roll call), and how many came again within the next ${n} roll calls.`,
  colFirstMonth: 'First came',
  colNewcomers: 'Newcomers',
  colReturned: 'Came back',
  colPending: 'Too soon',
  colRetention: 'Retention',
  noNewcomers: 'No newcomers yet.',
};

const messages = {
  en,
  'zh-TW': {
    phoneLast4: '電話（末 4 位）',
    department: '部門',
    openKiosk: '自助報到',
    kioskHint: '在門口的平板電腦開啟：會眾輸入電話號碼末 4 位便可自行報到。',
    kioskTitle: '自助報到',
    kioskPrompt: '請輸入您電話號碼的末 4 位',
    kioskLive: '進行中',
    kioskCount: (n: number) => `已報到 ${n} 人`,
    kioskSearching: '搜尋中…',
    kioskListening: '正在聆聽…',
    kioskSpeak: '說出號碼',
    kioskNoSpeech: '此瀏覽器不支援語音輸入。',
    kioskNotFound: '找不到此號碼的參與者，請聯絡招待員。',
    kioskPick: '請選擇您的姓名',
    kioskConfirm: '確認出席',
    kioskAlready: (name: string) => `${name}，您已經報到了。`,
    kioskDone: '已確認！',
    kioskWelcome: (name: string) => `歡迎，${name}！您的出席已記錄。`,
    kioskReset: (n: number) => `${n} 秒後自動重置`,
    kioskLog: '即時出席記錄',
    kioskWaiting: '等待報到中…',
    kioskExit: '離開自助報到',
    kioskNoSession: '目前沒有進行中的點名。請先在「點名」開始點名，再開啟自助報到。',
    kioskByKiosk: '自助',
    clear: '清除',
    careKinds: { call: '致電', visit: '探訪', message: '訊息', prayer: '代禱', other: '其他' },
    careHow: '方式',
    careHistory: '關顧紀錄',
    careHistoryEmpty: '尚未有跟進紀錄。',
    careBy: (name: string) => `由 ${name}`,
    firstTimers: '待歡迎的新朋友',
    firstTimerText: (date: string, since: number, back: boolean) =>
      `首次出席 ${date}` + (since === 0 ? '（上次點名）' : back ? ' · 已再次出席' : ' · 尚未再來'),
    markWelcomed: '標記已歡迎',
    careQueue: '關顧清單',
    careQueueHint: '所有群組中待跟進的成員及新朋友。',
    careQueueEmpty: '沒有待處理的項目——每位都已跟進。',
    careQueueMore: (n: number) => `還有 ${n} 位`,
    openGroup: '開啟群組',
    byDepartment: '按部門',
    retention: '新朋友留存',
    retentionHint: (n: number) =>
      `按首次出席月份統計的新朋友（不計群組的第一次點名），以及其中在之後 ${n} 次點名內再次出席的人數。`,
    colFirstMonth: '首次出席',
    colNewcomers: '新朋友',
    colReturned: '再次出席',
    colPending: '未能判斷',
    colRetention: '留存率',
    noNewcomers: '尚未有新朋友。',
  },
} satisfies Messages<typeof en>;

export const useSmartT = () => useT(messages);
export type SmartT = typeof en;
