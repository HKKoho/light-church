// packages/api/src/help-assistant/help-guide.ts
//
// What the Help Assistant knows about Light Church: every dashboard feature,
// where to find it and how to use it, in plain words. Deliberately user-facing
// only — no code, file layout, infrastructure or security internals — so the
// assistant can't reveal what it was never told. Keep it in step with the
// sidebar (components/dashboard/app-sidebar.tsx) and the AI Tool briefs.
//
// Entries tagged with a `navKey` (same scheme as SystemSettings.hiddenNavKeys,
// see web hooks/use-nav-visibility.ts) are left out when the super admin hides
// that feature, so the assistant never describes or suggests it.

export interface GuideEntry {
  readonly text: string;
  /** Leave this entry out when this nav key (or a parent of it) is hidden. */
  readonly navKey?: string;
}

export interface GuideSection {
  readonly heading: string;
  readonly intro?: string;
  /** Leave the whole section out when this nav key (or a parent of it) is hidden. */
  readonly navKey?: string;
  readonly entries: readonly GuideEntry[];
}

/** True when `key` or any parent (`sidebar:phase2` for `sidebar:phase2:tasks`) is hidden. */
export function isNavKeyHidden(key: string, hidden: ReadonlySet<string>): boolean {
  const parts = key.split(':');
  for (let i = 2; i <= parts.length; i += 1) {
    if (hidden.has(parts.slice(0, i).join(':'))) return true;
  }
  return false;
}

const tool = (key: string) => `ai-tool:builtin:${key}`;
const phase2 = (key: string) => `sidebar:phase2:${key}`;
const topbar = (menu: string, item: string) => `topbar:${menu}:${item}`;

const INTRO = `# Light Church — feature guide

Light Church is the church's own AI assistant platform. Staff and volunteers log in to the dashboard to use the features described below. The dashboard works in English and Traditional Chinese (switch with the language button at the bottom of the left sidebar) and in light or dark mode.

Only the features in this guide are turned on for this church. If someone asks about a feature that is not here, it is not available to them — suggest asking an administrator.`;

const SECTIONS: readonly GuideSection[] = [
  {
    heading: 'Finding your way around',
    entries: [
      {
        text: 'Left sidebar: grouped menus, starting with AI Tools. Some groups only appear for certain roles.',
      },
      {
        text: 'Top bar: the Ministries menus open the ministry pages (see "Ministry pages" below). The sidebar toggle at the top left hides or shows the sidebar.',
      },
      { text: 'Bottom of the sidebar: theme (light/dark), language, your Profile, and Log out.' },
      {
        text: 'What you can see depends on your role (for example super admin, senior pastor, pastor, staff, volunteer) and your department. If a page or folder is missing or says it is restricted, ask your administrator.',
      },
      {
        text: 'This Help Assistant: the round button at the bottom right of every dashboard page. Open it, ask anything, close it with the X — the conversation stays until you close the browser tab.',
      },
    ],
  },
  {
    heading: 'AI Tools (sidebar: AI Tools)',
    intro:
      'Ready-made tools for everyday ministry. Each tool card has a one-minute spoken brief (the speaker button) explaining what it does.',
    entries: [
      {
        navKey: tool('rollCall'),
        text: 'Roll Call (/roll-call): take attendance in seconds and notice who has been missing. Choose Smart mode, create a group (e.g. Sunday Service), add or import members. At each gathering tap names as people arrive, or open Self check-in where people enter the last four digits of their phone. Care and trends shows who missed last time or three weeks in a row; record a follow-up after calling. Analysis shows attendance rates, monthly summaries and CSV export. Simple mode is for a quick one-off list.',
      },
      {
        navKey: 'ai-tool:sunday-service-bulletin',
        text: "Sunday Service Bulletin: build each week's service order and bulletin. Upload a few past bulletin PDFs (and the duty roster) — AI turns them into reusable bulletins. Start from last week's, change date, hymns, readings, preacher and announcements, check each section, then export PowerPoint (projector), Excel (team) or a ZIP.",
      },
      {
        navKey: 'ai-tool:finance-pipeline',
        text: 'SecureFin Pipeline (finance): for the Finance Admin role. Bring in bank transactions, review the category AI suggests for each one, correct mistakes, export Excel reports for the treasurer and board. A person always reviews before anything is reported.',
      },
      {
        navKey: tool('missionCamp'),
        text: "Mission & Camp Companion (/activities): one place for a mission trip, camp or retreat — details, schedule, team, contacts, packing list, daily devotionals and songs (lyrics, YouTube or audio). Duplicate last year's to save time. Leaders and staff edit; everyone else views on their phone.",
      },
      {
        navKey: tool('gameBuilder'),
        text: 'Game Builder (/game-studio): make a short Scripture-based game for VBS, youth or family devotions with no coding. Describe the passage, players and length; AI drafts a storyboard; nothing is built until you approve it; then play and share. Visual4Story is for hand-made visuals.',
      },
      {
        navKey: tool('aiSurvey'),
        text: 'AI Survey (/ai-survey): draft a questionnaire in about a minute. Enter topic and audience, choose number of questions and language, edit the draft, publish as a Google Form and share the link. Only the topic and audience go to the AI.',
      },
      {
        navKey: tool('qrRegistration'),
        text: 'Event Planning (/qr-registration): turn an event into a web page with a QR code. Enter name, date, time, place and details, paste a registration link (e.g. a Google Form), optionally let AI design a social post, publish, then share the link or print the QR code. Anyone with the link can see it — leave out personal details.',
      },
      {
        navKey: tool('venueRental'),
        text: 'Rent Church Place (/venue-rental): outside groups apply online to use the hall, lawn or rooms. Share the public form link; each application lists venue, dates, activity, attendance and contact; add staff notes, approve or reject, and reply by email with a ready-made draft (needs the church email set up under Settings → Connectors).',
      },
      {
        navKey: tool('churchWebsite'),
        text: 'Church Website (/church-website): bring the existing church website into Light Church. Enter the current address and choose Import website (about a minute), check name, service times, contacts and menu on the Site tab, edit pages, add events and sermon media, then turn on Published.',
      },
      {
        text: 'Wisdom in Bible (/wisdom-in-bible): a Bible reflection course. Pastors, ministry leaders and admin staff arrange it in cycles and modules, each with life questions (and optional video or image); members answer on the church website, and leaders see who answered or finished.',
      },
      {
        text: 'Uploaded tools: the church can add its own tools; they appear in the AI Tools list with their own descriptions.',
      },
    ],
  },
  {
    heading: 'AI Volunteers (sidebar: AI Volunteers)',
    navKey: 'sidebar:phase2',
    entries: [
      {
        navKey: phase2('conversations'),
        text: 'Conversations (/conversations): chat with your personal AI agent. Start a new chat, pick up old ones from the session list, use voice input, and have replies read aloud. Your agent can research, write, work with files and run scheduled jobs. Type /reset to start fresh.',
      },
      {
        navKey: phase2('agents'),
        text: 'Agents (/agents): see the AI agents available to you (for example the ministry specialists), their roles and personalities; admins create and edit them.',
      },
      {
        navKey: phase2('talkingFace'),
        text: "Talking Face (/talkingface): talk with an agent through an animated face that speaks its replies aloud — type or use the microphone. Useful for announcements and children's ministry. Admins manage the avatar photos.",
      },
      {
        navKey: phase2('skills'),
        text: "Skills (/skills): know-how packages your agent can use (e.g. how to write a newsletter or prepare a sermon outline). Browse built-in skills and add the church's own.",
      },
      {
        navKey: phase2('tasks'),
        text: 'Scheduled Tasks (/tasks): ask an agent to do something on a schedule, such as a weekly prayer-list summary every Monday. Tasks that fail three times in a row pause themselves.',
      },
      {
        navKey: phase2('workspace'),
        text: "Workspace (/workspace): the church's shared files, organised in ministry folders (communications, outreach, scripture, finance, pastoral care, and more). Upload by drag and drop, create folders and notes, rename, move, download, and preview. Some folders belong to one department; a few are admin-only. Items in the projector folder are small tools and games your agent built — they play right in the Workspace.",
      },
    ],
  },
  {
    heading: 'Ministry pages (top-bar menus)',
    intro:
      'Each ministry page keeps its records in the matching workspace folder, and access follows your department.',
    entries: [
      {
        navKey: topbar('bibleMinistries', 'comms'),
        text: 'Bible & Ministries → Proclamation (/ngo/comms): communications.',
      },
      {
        navKey: topbar('bibleMinistries', 'scripture'),
        text: 'Bible & Ministries → Scripture & Learning (/ngo/scripture).',
      },
      {
        navKey: topbar('bibleMinistries', 'fieldOps'),
        text: 'Bible & Ministries → Mission Field (/ngo/field-ops): field operations.',
      },
      {
        navKey: topbar('bibleMinistries', 'outreach'),
        text: 'Bible & Ministries → Outreach (/ngo/outreach).',
      },
      {
        navKey: topbar('bibleMinistries', 'programs'),
        text: 'Bible & Ministries → Other Programs (/ngo/programs): ministries and programs.',
      },
      {
        navKey: topbar('bibleMinistries', 'curation'),
        text: "Bible & Ministries → Knowledge Curation (/curation): gather and check the church's own trusted sources so AI answers are grounded in them.",
      },
      {
        navKey: topbar('careGovernance', 'mne'),
        text: 'Care & Governance → Kingdom Impact (/ngo/mne): measuring outcomes.',
      },
      {
        navKey: topbar('careGovernance', 'pastoralCare'),
        text: 'Care & Governance → Pastoral Care (/ngo/pastoral-care): care records, flagged items and sampled reviews. Sensitive — only people with pastoral access see it.',
      },
      {
        navKey: topbar('careGovernance', 'prayer'),
        text: 'Care & Governance → Prayer Requests (/ngo/prayer): new → praying → answered.',
      },
      {
        navKey: topbar('careGovernance', 'incidents'),
        text: 'Care & Governance → Safeguarding (/ngo/incidents): incidents.',
      },
      {
        navKey: topbar('financeStewardship', 'donors'),
        text: 'Finance & Stewardship → Stewardship (/ngo/donors): donors.',
      },
      {
        navKey: topbar('financeStewardship', 'finance'),
        text: 'Finance & Stewardship → Finance (/ngo/finance).',
      },
      {
        navKey: topbar('financeStewardship', 'consent'),
        text: 'Finance & Stewardship → Consent Records (/ngo/consent).',
      },
      {
        navKey: topbar('financeStewardship', 'dashboard'),
        text: 'Finance & Stewardship → Dashboard (/dashboard): the ministry overview.',
      },
      {
        navKey: topbar('financeStewardship', 'tokenUsage'),
        text: 'Finance & Stewardship → Token Usage (/governance/tokens): how much AI has been used, what it costs, and how much of the budget is left.',
      },
      {
        navKey: topbar('financeStewardship', 'auditLogs'),
        text: 'Finance & Stewardship → Audit Logs (/governance/audit): a permanent record of actions in the system that cannot be edited or deleted.',
      },
      {
        navKey: topbar('financeStewardship', 'escalations'),
        text: 'Finance & Stewardship → Escalation & Override (/governance/escalations): when an AI task goes off track, a person can pause it or take over.',
      },
    ],
  },
  {
    heading: 'Administration (super admins only, sidebar: Settings)',
    entries: [
      {
        text: 'Users (/settings/users): add people, set their role, department and groups; the Permission Matrix shows who can do what.',
      },
      { text: 'Policies (/settings/policies): usage limits and quotas for each group of users.' },
      {
        text: 'Channels (/settings/channels): connect Telegram (including voice messages) or WhatsApp so people can talk to agents there.',
      },
      {
        text: 'Providers (/settings/providers): add the AI service keys (OpenAI, Anthropic, Gemini) and choose the default.',
      },
      {
        text: 'Congregation Profile (/settings/congregation-profile): describe the church so AI answers fit your context.',
      },
      {
        text: 'Ministry Packs (/settings/packs): turn bundles of specialist AI helpers on or off.',
      },
      {
        text: 'Connectors (/settings/connectors): link Google (forms) and church email, used by tools such as AI Survey and Rent Church Place.',
      },
      {
        text: 'Navigation (/settings/navigation): show or hide top-bar menus, sidebar groups and AI Tools for everyone.',
      },
    ],
  },
  {
    heading: 'Your account',
    entries: [
      {
        text: 'Profile (/profile): see your email and role, change your display name and Telegram ID, and change your password (at least 8 characters).',
      },
    ],
  },
  {
    heading: 'Good practice',
    entries: [
      {
        text: 'AI drafts; people decide. Check anything AI writes before it is published or sent.',
      },
      {
        text: "Never paste passwords or other people's private details (health, addresses, pastoral notes) into public tools or web pages.",
      },
    ],
  },
];

function renderSection(section: GuideSection, hidden: ReadonlySet<string>): string | null {
  if (section.navKey && isNavKeyHidden(section.navKey, hidden)) return null;
  const entries = section.entries.filter((e) => !e.navKey || !isNavKeyHidden(e.navKey, hidden));
  if (entries.length === 0) return null;
  const lines = [`## ${section.heading}`];
  if (section.intro) lines.push(section.intro);
  lines.push(...entries.map((e) => `- ${e.text}`));
  return lines.join('\n');
}

/**
 * The feature guide with every feature the super admin has hidden left out,
 * so the assistant neither explains nor suggests it.
 */
export function renderHelpGuide(hidden: ReadonlySet<string> = new Set()): string {
  const sections = SECTIONS.map((s) => renderSection(s, hidden)).filter(
    (s): s is string => s !== null,
  );
  return [INTRO, ...sections].join('\n\n') + '\n';
}
