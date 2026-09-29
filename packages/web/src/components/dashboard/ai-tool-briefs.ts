import type { Lang } from '@/lib/i18n';

/**
 * One-minute brief per AI Tool: how it helps, then how to use it. Shown as text
 * and read aloud. The Chinese text is written as spoken Cantonese so a zh-HK
 * voice reads it naturally. Keyed by built-in tool key or uploaded tool folder.
 */
export interface AiToolBrief {
  readonly helps: string;
  readonly steps: readonly string[];
}

export const AI_TOOL_BRIEFS: Readonly<Record<string, Record<Lang, AiToolBrief>>> = {
  rollCall: {
    en: {
      helps:
        'Roll Call takes attendance for a service or fellowship in seconds, and quietly notices who has been missing, so leaders can check in on people before they drift away. Everything stays on the church’s own server.',
      steps: [
        'Choose Smart mode, create a group such as Sunday Service, and add or import its members.',
        'At each gathering, open the group and tap each name as people arrive — or open Self check-in, where people enter the last four digits of their phone.',
        'Afterwards, leaders open Care and trends to see who missed last time or three weeks in a row, and record a follow-up once they have called.',
        'Analysis shows attendance rates and monthly summaries, and exports to CSV.',
        'For a quick one-off list, use Simple mode instead.',
      ],
    },
    'zh-TW': {
      helps:
        '「點名」幫你幾秒內記低崇拜或者團契嘅出席，仲會留意邊個好耐冇嚟，等領袖可以及早關心佢哋。所有資料都只係留喺教會自己嘅伺服器。',
      steps: [
        '揀「智能」模式，新增一個群組，例如主日崇拜，再加入或者匯入成員。',
        '每次聚會打開群組，有人到就撳佢個名；或者開「自助報到」，等大家自己輸入電話尾四個字報到。',
        '聚會之後，領袖喺「關顧與趨勢」睇到邊個上次冇嚟、或者連續三次缺席，致電關心之後就記低跟進。',
        '「分析」會列出出席率同每月摘要，仲可以匯出 CSV。',
        '如果只係臨時點一次名，就用「簡易」模式。',
      ],
    },
  },
  'sunday-service-bulletin': {
    en: {
      helps:
        'Sunday Service Bulletin builds each week’s service order and bulletin without starting from a blank page, and exports it ready for the screen and the printer.',
      steps: [
        'Upload a few past bulletin PDFs, and the duty roster if you have one. AI turns them into bulletins you can reuse.',
        'Start from last week’s bulletin and change the date, hymns, readings, preacher and announcements.',
        'Go through the service order section by section and check each item.',
        'Export to PowerPoint for the projector, Excel for the team, or a ZIP with everything.',
      ],
    },
    'zh-TW': {
      helps:
        '「主日崇拜週刊」幫你每星期整理崇拜程序同週刊，唔使由零開始，做好就可以直接投影同印刷。',
      steps: [
        '先上載幾份過往週刊嘅 PDF，有事奉輪值表都可以一齊上載，AI 會幫你轉成可以再用嘅程序表。',
        '揀上星期嗰份做藍本，改日期、詩歌、經文、講員同報告。',
        '逐段檢查崇拜程序，確認每一項都啱。',
        '最後匯出 PowerPoint 做投影，Excel 畀同工，或者一個 ZIP 包晒所有檔案。',
      ],
    },
  },
  'finance-pipeline': {
    en: {
      helps:
        'SecureFin Pipeline saves the finance team hours of copying bank statements by hand. It pulls out every transaction, and AI suggests a category for each one — but a person always reviews before anything is reported.',
      steps: [
        'Open it from AI Tools. It is for the Finance Admin role, and signs you in with your Light Church account.',
        'Bring in the bank transactions for the period.',
        'Review the categories AI suggested, and correct any that are wrong.',
        'Export the Excel reports for the treasurer and the board.',
      ],
    },
    'zh-TW': {
      helps:
        '「SecureFin 財務流程」幫財務同工慳返逐條抄銀行月結單嘅時間。佢會擷取每一筆交易，再由 AI 建議分類；不過一定有人審閱過先會出報表。',
      steps: [
        '喺 AI 工具度打開。只限財務管理員角色使用，會用你嘅光教會帳戶自動登入。',
        '匯入嗰段時間嘅銀行交易。',
        '檢查 AI 建議嘅分類，有錯就改返啱。',
        '匯出 Excel 報表，交畀司庫同執事會。',
      ],
    },
  },
  missionCamp: {
    en: {
      helps:
        'Mission and Camp Companion keeps everything a mission trip, camp or retreat needs in one place — so the whole team has the same schedule, contacts and devotionals on their phone.',
      steps: [
        'A leader creates the activity, or duplicates last year’s to save time.',
        'Fill in the details, schedule, team and contacts, and the packing list.',
        'Add the daily devotionals and songs, with lyrics, YouTube links or audio.',
        'During the trip, everyone opens it on their phone, and leaders add photos, files and notes.',
        'Leaders and staff edit; everyone else can view.',
      ],
    },
    'zh-TW': {
      helps:
        '「訪宣／營會指南」將訪宣、營會或者退修會需要嘅嘢集中喺一個地方，等成隊人手機入面都有同一份行程、聯絡同每日靈修。',
      steps: [
        '由領袖新增活動；亦都可以複製舊年嗰個，慳返時間。',
        '填好活動資料、行程、隊員同聯絡人，仲有行李清單。',
        '加入每日靈修同詩歌，可以附歌詞、YouTube 連結或者錄音。',
        '出發之後，大家用手機睇就得；領袖可以隨時加相片、檔案同筆記。',
        '領袖同同工負責編輯，其他人就可以檢視。',
      ],
    },
  },
  gameBuilder: {
    en: {
      helps:
        'Game Builder makes a short game rooted in Scripture for Vacation Bible School, youth group or family devotions — no coding needed.',
      steps: [
        'Describe the Bible passage, who will play, and how long the game should be — or pick one of the suggestions.',
        'AI first draws up a storyboard, scene by scene.',
        'Read it and approve it. Nothing is built until a person approves.',
        'The game is then built for you to play and share. For hand-made visuals, open Visual4Story.',
      ],
    },
    'zh-TW': {
      helps:
        '「遊戲工坊」幫你為暑期聖經班、青少年團契或者家庭靈修，整一個以聖經為本嘅小遊戲，完全唔使識寫程式。',
      steps: [
        '講低你想用邊段經文、玩嘅對象係邊個、玩幾耐；或者直接揀一個建議。',
        'AI 會先整一份逐場景嘅故事板。',
        '你睇過、核准咗，先會開始製作；未核准就乜都唔會整。',
        '整好之後就可以玩同分享。想自己設計畫面，可以開 Visual4Story。',
      ],
    },
  },
  aiSurvey: {
    en: {
      helps:
        'AI Survey drafts a good questionnaire in about a minute, so you can gather feedback or registrations without writing every question yourself.',
      steps: [
        'Type the topic — for example, feedback on this year’s youth retreat — and who will answer.',
        'Choose how many questions and which language.',
        'AI drafts the questions. Edit, add or remove any of them.',
        'Publish it as a Google Form and share the link. Only the topic and audience go to the AI — never member data.',
      ],
    },
    'zh-TW': {
      helps: '「AI 問卷」大約一分鐘就幫你草擬好一份問卷，收集意見或者報名都唔使逐條問題自己諗。',
      steps: [
        '輸入主題，例如「今年青少年退修會意見」，再寫低邊個會答。',
        '揀要幾多條問題，同埋用咩語言。',
        'AI 會草擬問題，你可以隨意修改、加或者刪。',
        '最後發佈做 Google 表單，分享條連結就得。只有主題同對象會交畀 AI，絕對唔會有會友資料。',
      ],
    },
  },
  qrRegistration: {
    en: {
      helps:
        'Event Planning turns any event into a shareable web page with a QR code, so people can scan a poster or the bulletin and sign up straight away.',
      steps: [
        'Enter the event name, date, time, location and details.',
        'Paste the registration link — for example, a Google Form made with AI Survey.',
        'If you like, let AI design a post for social media, or build visuals in Visual4Story.',
        'Publish, then share the page link or print the QR code. You can also post it to the church website.',
        'Anyone with the link can see the page, so leave out personal details.',
      ],
    },
    'zh-TW': {
      helps:
        '「活動策劃」將任何活動變成一版可以分享、附 QR 碼嘅網頁，大家喺海報或者週刊一掃就可以即刻報名。',
      steps: [
        '輸入活動名稱、日期、時間、地點同詳情。',
        '貼上報名連結，例如用「AI 問卷」整嘅 Google 表單。',
        '想嘅話，可以叫 AI 幫你設計一張社交媒體海報，或者用 Visual4Story 自己整。',
        '發佈之後，分享網頁連結或者印出 QR 碼；亦都可以放上教會網站。',
        '有連結嘅人都睇到呢版，所以唔好放個人資料。',
      ],
    },
  },
  venueRental: {
    en: {
      helps:
        'Rent Church Place lets outside groups apply online to use the hall, lawn or rooms, so every request arrives complete and sits in one list instead of in phone calls and paper forms.',
      steps: [
        'Copy the public form link and share it on the website or by email.',
        'Each application shows the venue, dates, activity, expected attendance and on-site contact.',
        'Add notes for staff, then approve or reject.',
        'Reply by email with a ready-made draft. This needs the church email set up under Settings, Connectors.',
      ],
    },
    'zh-TW': {
      helps:
        '「租借教會場地」等外間團體喺網上申請借用禮堂、草地或者房間，所有申請資料齊全，集中喺一個清單，唔使再靠電話同紙本表格。',
      steps: [
        '複製公開表格嘅連結，放上網站或者用電郵傳出去。',
        '每份申請都會列明場地、日期、活動內容、預計人數同現場負責人。',
        '加上只有同工睇到嘅備註，然後批准或者拒絕。',
        '用現成嘅草稿以電郵回覆申請人；要先喺「設定」入面嘅「連接器」設定好教會電郵。',
      ],
    },
  },
  churchWebsite: {
    en: {
      helps:
        'Church Website brings your existing website into Light Church, so you can keep it up to date in one place — with events, sermons, venue rental and a members area built in.',
      steps: [
        'Enter your current website address and choose Import website. It takes about a minute.',
        'On the Site tab, check the church name, service times, contact details and menu.',
        'Edit or add pages, and add events and sermon media.',
        'When it is ready, turn on Published. Visitors to the home page will then go to your church site.',
      ],
    },
    'zh-TW': {
      helps:
        '「教會網站」將你哋現有嘅網站搬入光教會，以後喺同一個地方更新；活動、講道、場地租借同會友專區都已經內置。',
      steps: [
        '輸入現有網站地址，撳「匯入網站」，大約一分鐘就搞掂。',
        '喺「網站」分頁檢查教會名稱、聚會時間、聯絡資料同選單。',
        '修改或者新增頁面，再加入活動同講道影音。',
        '準備好就開啟「已發佈」，之後訪客打開首頁就會去到你哋嘅教會網站。',
      ],
    },
  },
};
