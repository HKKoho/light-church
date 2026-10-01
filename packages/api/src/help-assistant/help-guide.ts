// packages/api/src/help-assistant/help-guide.ts
//
// What the Help Assistant knows about Light Church: every dashboard feature,
// where to find it and how to use it, in plain words. Deliberately user-facing
// only — no code, file layout, infrastructure or security internals — so the
// assistant can't reveal what it was never told. Keep it in step with the
// sidebar (components/dashboard/app-sidebar.tsx) and the AI Tool briefs.

export const HELP_GUIDE = `# Light Church — feature guide

Light Church is the church's own AI assistant platform. Staff and volunteers log in to the dashboard to use AI Tools, talk with AI volunteers (agents), keep ministry files, and oversee how AI is used. The dashboard works in English and Traditional Chinese (switch with the language button at the bottom of the left sidebar) and in light or dark mode.

## Finding your way around
- Left sidebar: grouped menus — AI Tools, AI Volunteers, Ministry Delegation, Care & Discipleship (only for churches run through cell groups), Governance, Assurance & Liability, Administration, and Data & Domain Curation. Some groups only appear for certain roles.
- Top bar: the Ministries menus (Bible & Ministries, Care & Governance, Finance & Stewardship) open the ministry pages. The sidebar toggle at the top left hides or shows the sidebar.
- Bottom of the sidebar: theme (light/dark), language, your Profile, and Log out.
- What you can see depends on your role (for example super admin, senior pastor, pastor, staff, volunteer) and your department. If a page or folder is missing or says it is restricted, ask your administrator.
- This Help Assistant: the round button at the bottom right of every dashboard page. Open it, ask anything, close it with the X — the conversation stays until you close the browser tab.

## AI Tools (sidebar: AI Tools)
Ready-made tools for everyday ministry. Each tool card has a one-minute spoken brief (the speaker button) explaining what it does.
- Roll Call (/roll-call): take attendance in seconds and notice who has been missing. Choose Smart mode, create a group (e.g. Sunday Service), add or import members. At each gathering tap names as people arrive, or open Self check-in where people enter the last four digits of their phone. Care and trends shows who missed last time or three weeks in a row; record a follow-up after calling. Analysis shows attendance rates, monthly summaries and CSV export. Simple mode is for a quick one-off list.
- Sunday Service Bulletin: build each week's service order and bulletin. Upload a few past bulletin PDFs (and the duty roster) — AI turns them into reusable bulletins. Start from last week's, change date, hymns, readings, preacher and announcements, check each section, then export PowerPoint (projector), Excel (team) or a ZIP.
- SecureFin Pipeline (finance): for the Finance Admin role. Bring in bank transactions, review the category AI suggests for each one, correct mistakes, export Excel reports for the treasurer and board. A person always reviews before anything is reported.
- Mission & Camp Companion (/activities): one place for a mission trip, camp or retreat — details, schedule, team, contacts, packing list, daily devotionals and songs (lyrics, YouTube or audio). Duplicate last year's to save time. Leaders and staff edit; everyone else views on their phone.
- Game Builder (/game-studio): make a short Scripture-based game for VBS, youth or family devotions with no coding. Describe the passage, players and length; AI drafts a storyboard; nothing is built until you approve it; then play and share. Visual4Story is for hand-made visuals.
- AI Survey (/ai-survey): draft a questionnaire in about a minute. Enter topic and audience, choose number of questions and language, edit the draft, publish as a Google Form and share the link. Only the topic and audience go to the AI.
- Event Planning (/qr-registration): turn an event into a web page with a QR code. Enter name, date, time, place and details, paste a registration link (e.g. from AI Survey), optionally let AI design a social post, publish, then share the link or print the QR code. Anyone with the link can see it — leave out personal details.
- Rent Church Place (/venue-rental): outside groups apply online to use the hall, lawn or rooms. Share the public form link; each application lists venue, dates, activity, attendance and contact; add staff notes, approve or reject, and reply by email with a ready-made draft (needs the church email set up under Settings → Connectors).
- Church Website (/church-website): bring the existing church website into Light Church. Enter the current address and choose Import website (about a minute), check name, service times, contacts and menu on the Site tab, edit pages, add events and sermon media, then turn on Published.
- Wisdom in Bible (/wisdom-in-bible): a Bible reflection course. Pastors, ministry leaders and admin staff arrange it in cycles and modules, each with life questions (and optional video or image); members answer on the church website, and leaders see who answered or finished.
- Uploaded tools: the church can add its own tools; they appear in the AI Tools list with their own descriptions.

## AI Volunteers (sidebar: AI Volunteers)
- Conversations (/conversations): chat with your personal AI agent. Start a new chat, pick up old ones from the session list, use voice input, and have replies read aloud. Your agent can research, write, work with files in your workspace and run scheduled jobs. Type /reset to start fresh.
- Agents (/agents): see the AI agents available to you (for example the ministry specialists), their roles and personalities; admins create and edit them.
- Talking Face (/talkingface): talk with an agent through an animated face that speaks its replies aloud — type or use the microphone. Useful for announcements and children's ministry. Admins manage the avatar photos.
- Skills (/skills): know-how packages your agent can use (e.g. how to write a newsletter or prepare a sermon outline). Browse built-in skills and add the church's own.
- Scheduled Tasks (/tasks): ask an agent to do something on a schedule, such as a weekly prayer-list summary every Monday. Tasks that fail three times in a row pause themselves.
- Workspace (/workspace): the church's shared files, organised in ministry folders (communications, outreach, scripture, finance, pastoral care, and more). Upload by drag and drop, create folders and notes, rename, move, download, and preview. Some folders belong to one department; a few are admin-only. Items in the projector folder are small tools and games your agent built — they play right in the Workspace.

## Ministry Delegation
- Delegation Register (/delegation): a record of which ministry task is handed to AI, who owns it, and its checkpoints.
- WkFlow Generation (/projector): ministry workflows and micro-tools generated by your agent.
- Pastoral Care (/ngo/pastoral-care): care records, flagged items and sampled reviews. Sensitive — only people with pastoral access see it.

## Ministry pages (top-bar Ministries menus)
Ministries (programs), Partners, Stewardship (donors), Kingdom Impact (measuring outcomes), Proclamation (communications), Mission Field (field operations), Safeguarding (incidents), Prayer Requests (new → praying → answered), Finance, Outreach, Scripture & Literacy, Consent Records, and Pastoral Care. Each keeps its records in the matching workspace folder, and access follows your department.

## Governance, Assurance & Liability
- Dashboard (/dashboard): the ministry overview.
- Token Usage (/governance/tokens): how much AI has been used, what it costs, and how much of the budget is left.
- Audit Logs (/governance/audit): a permanent record of actions in the system that cannot be edited or deleted.
- Escalation & Override (/governance/escalations): when an AI task goes off track, a person can pause it or take over.

## Administration (admins only)
- Users (/settings/users): add people, set their role, department and groups; the Permission Matrix shows who can do what.
- Policies (/settings/policies): usage limits and quotas for each group of users.
- Channels (/settings/channels): connect Telegram (including voice messages) or WhatsApp so people can talk to agents there.
- Providers (/settings/providers): add the AI service keys (OpenAI, Anthropic, Gemini) and choose the default.
- Congregation Profile (/settings/congregation-profile): describe the church so AI answers fit your context.
- Ministry Packs (/settings/packs): turn bundles of specialist AI helpers on or off.
- Connectors (/settings/connectors): link Google (forms) and church email, used by AI Survey, Rent Church Place and others.

## Data & Domain Curation
- Knowledge Curation (/curation): gather and check the church's own trusted sources so AI answers are grounded in them.

## Your account
- Profile (/profile): see your email and role, change your display name and Telegram ID, and change your password (at least 8 characters).

## Good practice
- AI drafts; people decide. Check anything AI writes before it is published or sent.
- Never paste passwords or other people's private details (health, addresses, pastoral notes) into public tools or web pages.
`;
