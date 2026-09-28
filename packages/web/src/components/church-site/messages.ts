import { useT, type Messages } from '@/lib/i18n';

// Labels for Light Church's own parts of the public church site. Imported
// page content stays in the church's own language.
const en = {
  home: 'Home',
  events: 'Events',
  media: 'Sermons & Media',
  rent: 'Rent a Place',
  aiTools: 'AI Tools',
  members: 'Members',
  menu: 'Menu',
  serviceTimes: 'Service times',
  contact: 'Contact us',
  staffLogin: 'Staff & ministry login',
  poweredBy: 'Powered by Light Church',
  upcomingEvents: 'Upcoming events',
  latestMedia: 'Latest sermons & media',
  seeAll: 'See all',
  noEvents: 'No upcoming events right now.',
  noMedia: 'Nothing published yet.',
  register: 'Register',
  eventsIntro: 'Gatherings, activities and special events. Everyone is welcome.',
  mediaIntro: 'Sermons, recordings and documents from our church.',
  kinds: { video: 'Video', audio: 'Audio', document: 'Document', link: 'Link' },
  watch: 'Open',
  notSetUp: 'This church website has not been set up yet.',
  membersTitle: 'Members area',
  membersIntro: 'Resources, events and recordings for church members.',
  readingCampaign: 'Bible reading campaign',
  readingCampaignDescription:
    'Join the church Bible reading campaign on Get in Bible — sign in there to take part and track your reading.',
  joinCampaign: 'Join the campaign',
  signInPrompt: 'Please sign in with your church account to see the members area.',
  signIn: 'Sign in',
  membersPages: 'Members pages',
  membersEvents: 'Members events',
  membersMedia: 'Members recordings',
  nothingHere: 'Nothing here yet.',
  loadFailed: 'Could not load the members area. Please try again.',
  back: 'Back',
  language: '中文',
};

const messages = {
  en,
  'zh-TW': {
    home: '首頁',
    events: '活動',
    media: '講道及影音',
    rent: '租借場地',
    aiTools: 'AI 工具',
    members: '會友專區',
    menu: '選單',
    serviceTimes: '聚會時間',
    contact: '聯絡我們',
    staffLogin: '同工及事工登入',
    poweredBy: '由 Light Church 提供',
    upcomingEvents: '即將舉行的活動',
    latestMedia: '最新講道及影音',
    seeAll: '查看全部',
    noEvents: '暫時未有即將舉行的活動。',
    noMedia: '暫時未有內容。',
    register: '報名',
    eventsIntro: '聚會、活動及特別節目，歡迎所有人參加。',
    mediaIntro: '本會的講道、錄音及文件。',
    kinds: { video: '影片', audio: '錄音', document: '文件', link: '連結' },
    watch: '開啟',
    notSetUp: '教會網站尚未設定。',
    membersTitle: '會友專區',
    membersIntro: '給會友的資源、活動及錄影。',
    readingCampaign: '讀經運動',
    readingCampaignDescription:
      '在「進入聖經」參與教會的讀經運動——登入後即可參加並記錄你的讀經進度。',
    joinCampaign: '參加讀經運動',
    signInPrompt: '請以教會帳戶登入以瀏覽會友專區。',
    signIn: '登入',
    membersPages: '會友頁面',
    membersEvents: '會友活動',
    membersMedia: '會友錄影',
    nothingHere: '暫時未有內容。',
    loadFailed: '無法載入會友專區，請再試一次。',
    back: '返回',
    language: 'English',
  },
} satisfies Messages<typeof en>;

export type SiteMessages = typeof en;
export type SiteLabelKey = {
  [K in keyof SiteMessages]: SiteMessages[K] extends string ? K : never;
}[keyof SiteMessages];

export const useSiteT = () => useT(messages);
