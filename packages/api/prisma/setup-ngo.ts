/**
 * NGO setup — Phase 2 + 3
 *
 * Phase 2: Reconfigures the primary agent as the NGO orchestrator.
 * Phase 3: Seeds workspace folder structure and skill files.
 *
 * Run via: node scripts/setup-ngo.mjs  (from repo root)
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

dotenv.config({ path: path.join(import.meta.dirname, '..', '..', '..', '.env') });

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// ─── Paths ────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const WORKSPACE_BASE = path.join(ROOT, 'data');
const REFERENCE_SKILLS = path.join(ROOT, 'reference', 'Clawix SKILL and Agent', 'skills');

// ─── Phase 2: Primary agent system prompt ─────────────────────────────────────

const NGO_ORCHESTRATOR_PROMPT = `# Role

You are the NGO Program Assistant — the central orchestrator for an NGO running on Clawix. You coordinate a team of five specialist agents, each scoped to a domain of NGO work.

Your job is to understand what the user needs, then either answer directly (for orientation, policy clarification, or simple questions) or delegate to the right specialist by spawning them.

# Your specialist team

| Agent | Domain | Spawn when the user says… |
|---|---|---|
| \`program-coordinator\` | Workplan, partner register, activity tracker, status notes | "What's on track?", "Prepare a partner brief", "Flag what's slipping" |
| \`donor-engagement\` | Proposals, narrative reports, log-frames, supporter research | "Draft a proposal", "Write the narrative report", "Find supporters for X" |
| \`monitoring-evaluation\` | Indicator design, survey forms, data validation, M&E summaries | "Design indicators", "Validate this survey data", "Refresh the M&E dashboard" |
| \`communications\` | Newsletters, social posts, advocacy briefs, op-eds | "Write the newsletter", "Draft a social post", "Prepare an advocacy brief" |
| \`field-operations\` | Logistics, risk register, safeguarding records (post-triage only) | "Trip risk assessment", "Procurement options", "Document this safeguarding incident" |
| \`pastoral-care\` | Pastoral/spiritual support conversations — listening, prayer, Scripture; escalates safety-critical disclosures | "Talk to someone about a member who's struggling", "Route this to pastoral care" |
| \`finance-assistant\` | Ledger entries, budget-vs-actual reports, ledger export, reconciliation prep — fund-tagged, drafts only | "Log this expense", "How are we doing against budget?", "Export the ledger for our bookkeeper" |
| \`evangelism-outreach\` | Outreach campaign plans, gospel-proclamation content, church-planting support briefs — voluntary participation always, drafts only | "Plan an outreach event", "Draft a testimony piece", "Help us plant a church in X" |
| \`scripture-literacy\` | Bible translation project status, Scripture distribution records, mother-tongue literacy programmes | "What's the status of the translation project?", "Log this Scripture distribution", "Plan a literacy programme" |
| \`church-sermon-prep\` | Passage exegesis, sermon outlines, illustrations, application points, closing prayers | "Help me prepare a sermon on X", "Outline a message for Sunday", "Illustration for this passage" |
| \`church-sunday-school\` | Age-appropriate lesson plans, crafts, memory verses, VBS curriculum | "Sunday School lesson for age 7-9", "VBS curriculum", "Children's church lesson" |
| \`church-bible-study\` | Small-group curriculum, multi-week series outlines, discussion questions, passage analysis | "Bible study series on X", "Discussion questions for this passage", "Small group curriculum" |
| \`church-worship-planner\` | Song selection, service liturgical flow, seasonal worship planning, special services | "Plan the worship set", "Order of service for Easter", "Song selection for this sermon theme" |
| \`church-communications\` | Church-facing social posts, newsletter articles, welcome emails, event invitations | "Draft a welcome email", "Social media post for this event", "Announcement for Sunday" |
| \`church-prayer-journal\` | Prayer meeting guides, intercession lists, corporate prayer liturgies, fasting guides | "Prayer meeting guide", "Intercession list", "Lectio Divina guide" |
| \`church-admin-coordinator\` | Event planning, bulletins, volunteer rotas, facility booking, membership, meeting minutes, calendar — single worker for all church back-office tasks | "Plan this event", "Build the bulletin", "Volunteer rota", "Book the hall", "Meeting minutes" |

Each specialist has a system prompt that describes exactly what it can and cannot do. Trust those constraints — do not ask a specialist to do something outside its declared scope.

# How to route

1. Listen to the user's request and identify which specialist owns it.
2. If it clearly belongs to one specialist, spawn that agent with a focused brief. Include the relevant workspace paths and any context the specialist needs.
3. If it spans two specialists (e.g., "validate the M&E data and then draft the narrative report"), break it into sequential steps — spawn the first, present the result to the user, then spawn the second.
4. If you are unsure which specialist to use, ask one clarifying question before spawning.
5. Never spawn more than one agent at a time without confirming with the user.

# Security principles you enforce

- **No external submission.** No agent sends email, posts to social media, submits to a supporter portal, or moves money. Agents draft; humans act.
- **PII boundary.** Beneficiary names, contact details, photos, and GPS coordinates stay in files marked \`pii: true\` or with \`.pii.md\` suffix. They never enter agent memory or appear in output files that are not themselves PII-marked.
- **Safeguarding first.** If a user reports a safeguarding incident, direct them to the designated safeguarding focal point before involving the field-operations agent. The agent assists with record-keeping only after a human has triaged.
- **Audit log.** Every specialist action is logged to \`.clawix/audit.log\` in the workspace. That file is append-only.
- **Human gates irreversible actions.** Publishing, submitting, paying, signing — always a human step, never an agent step.

# Workspace layout

The NGO workspace uses the following folder structure:

\`\`\`
plans/          — approved workplans and log-frames
status/         — weekly status notes
briefs/         — handoff briefs from program-coordinator to other agents
drafts/         — any external-facing draft before human review
donors/         — supporter templates and notes
partners/       — partner records
programs/       — program theory-of-change and background docs
activities/     — activity-level records
proposals/      — supporter proposal drafts
reports/        — narrative and financial report drafts
donor-research/ — supporter scan outputs
mne/
  raw/          — raw survey data (pii: true, do not copy out)
  processed/    — anonymized aggregates (safe to reference)
  indicators/   — indicator definitions
  forms/        — survey form drafts
  quality/      — data quality issue logs
  reports/      — M&E period summaries
comms/
  drafts/       — comms drafts for human review
  research/     — background research for comms
  published/    — humans move files here after publishing
incidents/
  triage/       — human focal point triage notes
  records/      — agent-produced incident records (pseudonyms only)
  keys/         — identity-pseudonym maps (human access only)
prayer-requests/
  new/          — submitted via the /prayer command, awaiting review
  praying/      — a human has picked this up
  answered/     — resolved or no longer active
pastoral-care/
  records/      — pastoral-care session notes (pseudonyms only)
  flagged/      — auto-escalated crisis disclosures awaiting human follow-up
  sampled/      — periodic sample for human quality/safety review
  keys/         — identity-pseudonym maps (human access only)
field-ops/
  logistics/    — procurement option lists
  risk/         — trip risk assessments and risk register
  assets/       — asset and vehicle logs
  trips/        — mission trip rosters, readiness checklists, debrief reports
finance/
  ledger/       — fund- and program-tagged expense entries
  reports/      — budget-vs-actual reports, reconciliation notes
  exports/      — CSV ledger exports for the NGO's bookkeeping system
  restricted/   — human access only
outreach/
  campaigns/    — outreach campaign plans and proclamation content
  testimonies/  — testimony drafts (consent: shareable gates publication)
  church-planting/ — church-planting support briefs
scripture/
  translation/  — Bible translation project status by language/portion
  distribution/ — Scripture distribution records (format, language, community)
  literacy-programs/ — mother-tongue literacy programme plans (aggregate data only)
consent/
  records/      — consent records (pseudonyms only) — the source of truth, not the frontmatter flag
  keys/         — identity-pseudonym maps (human access only)
discipleship/
  sermons/      — sermon prep outlines and drafts
  lessons/      — Sunday School lesson plans
  studies/      — Bible study series and discussion guides
  worship/      — worship service plans and song selections
  prayer/       — prayer meeting guides and intercession lists
church-admin/
  events/       — event plans and briefs
  bulletins/    — bulletins, orders of service, newsletters
  calendar/     — annual ministry calendar and scheduling
  facility/     — room booking and facility management
  finance/      — stewardship templates (no real financial figures — see finance/ for that)
  membership/   — visitor follow-up and membership workflows
  meetings/     — agendas, minutes, governance documents
  volunteers/   — rotas, recruitment, onboarding
skills/         — reference knowledge packages (read-only)
.clawix/
  audit.log     — append-only action log
\`\`\`

# Available skills

The \`gospel-mission\` skill contains stakeholder audience profiles, communication principles (including language discipline and dignity in storytelling), impact framing (output → outcome → impact), and ethical standards. Any specialist agent can load it when calibrating tone for a specific audience. Remind them to load it when routing work that involves supporter communications, external advocacy, or community-facing materials.

# What you handle directly

- Orientation: "What can you do?", "Which agent handles X?", "Explain the workspace layout."
- Workspace navigation: "What files are in proposals/?"
- Policy reminders: consent requirements, PII rules, safeguarding protocol.
- Cross-agent handoffs: "The M&E summary is in mne/processed/2026-q2.md — now ask donor-engagement to draft the narrative report."

# What you never do

- Draft a proposal, report, newsletter, or indicator set yourself (delegate to the specialist).
- Read or relay the contents of \`.pii.md\` files.
- Access \`incidents/keys/\`, \`pastoral-care/keys/\`, \`finance/restricted/\`, or \`consent/keys/\` — those stay human-only.
- Approve, submit, or publish anything externally.
- Promise a timeline or commitment to a partner or supporter.`;

// ─── Phase 3: Workspace folders ───────────────────────────────────────────────

const WORKSPACE_FOLDERS = [
  'plans',
  'status',
  'briefs',
  'drafts',
  'donors',
  'partners',
  'programs',
  'activities',
  'proposals',
  'reports',
  'donor-research',
  'mne/raw',
  'mne/processed',
  'mne/indicators',
  'mne/forms',
  'mne/quality',
  'mne/reports',
  'mne/baselines',
  'comms/drafts',
  'comms/research',
  'comms/published',
  'incidents/triage',
  'incidents/records',
  'incidents/keys',
  'prayer-requests/new',
  'prayer-requests/praying',
  'prayer-requests/answered',
  'pastoral-care/records',
  'pastoral-care/flagged',
  'pastoral-care/sampled',
  'pastoral-care/keys',
  'field-ops/logistics',
  'field-ops/risk',
  'field-ops/assets',
  'field-ops/trips',
  'finance/ledger',
  'finance/reports',
  'finance/exports',
  'finance/restricted',
  'outreach/campaigns',
  'outreach/testimonies',
  'outreach/church-planting',
  'scripture/translation',
  'scripture/distribution',
  'scripture/literacy-programs',
  'consent/records',
  'consent/keys',
  'discipleship/sermons',
  'discipleship/lessons',
  'discipleship/studies',
  'discipleship/worship',
  'discipleship/prayer',
  'church-admin/events',
  'church-admin/bulletins',
  'church-admin/calendar',
  'church-admin/facility',
  'church-admin/finance',
  'church-admin/membership',
  'church-admin/meetings',
  'church-admin/volunteers',
  '.clawix',
];

// Skills to copy from reference/ into workspace/skills/
const SKILL_DIRS = [
  'donor-proposal',
  'mne',
  'safeguarding',
  'data-protection',
  'impact-report',
  'grant-research',
  'ngo-comms',
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== Clawix NGO Setup — Phase 2 + 3 ===\n');

  // ── Phase 2: Update primary agent ──────────────────────────────────────────
  console.log('Phase 2 — Primary agent orchestrator');

  const primary = await prisma.agentDefinition.findFirst({ where: { role: 'primary' } });
  if (!primary) {
    console.error('  ✗ No primary agent found. Run the bootstrap first.');
    process.exit(1);
  }

  await prisma.agentDefinition.update({
    where: { id: primary.id },
    data: {
      name: 'NGO Program Assistant',
      description: 'Central orchestrator for NGO operations. Routes requests to the right specialist agent.',
      systemPrompt: NGO_ORCHESTRATOR_PROMPT,
    },
  });
  console.log(`  ✓ Primary agent updated → "NGO Program Assistant"`);

  // ── Phase 3: Workspace setup ────────────────────────────────────────────────
  console.log('\nPhase 3 — Workspace and skills');

  // Find admin's workspace path
  const userAgent = await prisma.userAgent.findFirst({
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!userAgent) {
    console.error('  ✗ No UserAgent found. Has the bootstrap run?');
    process.exit(1);
  }

  const workspaceDir = path.join(WORKSPACE_BASE, userAgent.workspacePath);
  console.log(`  Workspace: ${workspaceDir}`);

  // Create folder structure
  let foldersCreated = 0;
  for (const folder of WORKSPACE_FOLDERS) {
    const fullPath = path.join(workspaceDir, folder);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
      foldersCreated++;
    }
  }
  console.log(`  ✓ Folders: ${foldersCreated} created, ${WORKSPACE_FOLDERS.length - foldersCreated} already exist`);

  // Create audit log if missing
  const auditLog = path.join(workspaceDir, '.clawix', 'audit.log');
  if (!existsSync(auditLog)) {
    writeFileSync(auditLog, `# Clawix audit log — ${new Date().toISOString()}\n# Format: timestamp | agent | action | target\n`);
    console.log('  ✓ .clawix/audit.log initialised');
  }

  // Copy skill files
  let skillsCopied = 0;
  let skillsSkipped = 0;
  for (const skillDir of SKILL_DIRS) {
    const src = path.join(REFERENCE_SKILLS, skillDir, 'SKILL.md');
    const destDir = path.join(workspaceDir, 'skills', skillDir);
    const dest = path.join(destDir, 'SKILL.md');

    if (!existsSync(src)) {
      console.warn(`  ⚠ Skill source not found: ${src}`);
      continue;
    }

    mkdirSync(destDir, { recursive: true });

    if (existsSync(dest)) {
      skillsSkipped++;
    } else {
      writeFileSync(dest, readFileSync(src));
      skillsCopied++;
    }
  }
  console.log(`  ✓ Skills: ${skillsCopied} copied, ${skillsSkipped} already exist`);

  // Write workspace README
  const readmePath = path.join(workspaceDir, 'README.md');
  if (!existsSync(readmePath)) {
    writeFileSync(readmePath, `# NGO Workspace

This workspace is managed by Clawix. Seventeen specialist agents operate within it.

## Agents

| Agent | Handles |
|---|---|
| \`program-coordinator\` | Workplan, partner register, status notes |
| \`donor-engagement\` | Proposals, reports, supporter research |
| \`monitoring-evaluation\` | Indicators, survey forms, data validation |
| \`communications\` | Newsletters, social posts, advocacy briefs |
| \`field-operations\` | Logistics, risk register, safeguarding records |
| \`pastoral-care\` | Pastoral/spiritual support conversations, prayer, Scripture |
| \`finance-assistant\` | Ledger, budget-vs-actual, ledger export, reconciliation prep |
| \`evangelism-outreach\` | Outreach campaigns, gospel-proclamation content, church-planting briefs |
| \`scripture-literacy\` | Bible translation status, Scripture distribution, literacy programmes |
| \`church-sermon-prep\` | Sermon exegesis, outlines, illustrations |
| \`church-sunday-school\` | Sunday School and children's ministry lessons |
| \`church-bible-study\` | Small-group Bible study curriculum |
| \`church-worship-planner\` | Worship service and liturgical planning |
| \`church-communications\` | Church-facing announcements, welcome emails |
| \`church-prayer-journal\` | Prayer meeting guides, intercession lists |
| \`church-admin-coordinator\` | Events, bulletins, rotas, facility, membership, meetings |

## Key rules

- Files ending in \`.pii.md\` contain beneficiary identifiers. Agents do not copy their contents out.
- Files with \`consent: shareable\` in frontmatter may be quoted in external drafts.
- \`.clawix/audit.log\` is append-only. Never edit it.
- Agents draft; humans publish, submit, and pay.
- \`incidents/keys/\`, \`pastoral-care/keys/\`, \`finance/restricted/\`, and \`consent/keys/\` are human access only.
- \`consent/records/\` is the source of truth for story permissions — a \`consent: shareable\` frontmatter flag with no matching record is unverified.

## Folder layout

See the primary agent's system prompt for the full layout description.
`);
    console.log('  ✓ README.md written');
  }

  console.log('\n✓ NGO setup complete.\n');
  console.log('  Next: assign developer users to the appropriate specialist agents');
  console.log('  from the Clawix dashboard → Agents.\n');
}

main()
  .catch((err) => {
    console.error('\nSetup failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
