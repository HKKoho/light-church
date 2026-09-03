# Theological Reading Library — RAG Plan

Gives the pastor's agents (primarily `church-sermon-prep`, also usable by
`church-bible-study`, `pastoral-care`) two complementary ways to work with
theological readings:

- **Option A — curated library (RAG).** An admin-approved, doctrine-tagged
  collection of PDFs, searchable across the whole corpus. Built for volume
  and for keeping the congregation's teaching consistent across many
  sources. Requires review before anything is searchable.
- **Option B — ad-hoc reading (no RAG, no review).** A pastor uploads a
  single PDF (or DOCX) to their own agent's workspace and asks the agent to
  read it; the system converts it to Markdown (OCR'd if scanned) and the
  agent reads and discusses that one document in the conversation. No
  embeddings, no admin approval, no shared corpus — it's the pastor reading
  their own document with AI assistance, the same way they'd read it
  themselves, just faster.

Both are described below. Option B has no infrastructure dependency on
Option A (no pgvector needed) and can ship first.

> **Status: Option B is implemented.** `convert_document_to_markdown`
> (`packages/api/src/engine/tools/document-conversion.ts`), PDF text/OCR
> extraction (`engine/tools/document-reading/pdf-extraction.service.ts`,
> using `pdf-parse`'s own page-screenshot renderer + `tesseract.js` — no
> `poppler-utils`/`pdftoppm` needed, see the pipeline section below), DOCX
> extraction (`engine/tools/document-reading/docx-extraction.ts`, mammoth +
> turndown), registration gated by `toolConfig.documentReadingEnabled`
> (default on) in `agent-runner.service.ts`, and the `read-document`
> `SKILL.md` are all in place. Option A remains design-only.

## Why this isn't a bigger skill

Skills today are filesystem-only and loaded whole: `SkillLoaderService`
(`packages/api/src/engine/skill-loader.service.ts`) puts a `<name>` +
`<description>` summary from each `SKILL.md`'s frontmatter into the system
prompt at boot (`buildSkillsSummary`), and the agent fetches full content by
reading the mounted file itself — builtin skills are bind-mounted read-only
at `/skills/builtin` (`container-runner.ts:393`), no database involved. That
model is correct for a handful of authored `SKILL.md` playbooks. It breaks
down for "lots of readings": a library of PDFs is too large to mount whole
into a 512MB, `--network none` container and read page-by-page, and there's
no ranking — the agent would have to guess which of dozens of PDFs, and
which page range, actually answers a given question.

RAG solves the volume/ranking problem. It does **not** solve doctrinal
alignment by itself — a similarity search over an uncurated corpus will
happily return the passage that best matches the words even if it teaches
something the congregation rejects. So this plan has two layers that are
easy to conflate but must stay separate:

1. **Retrieval** — find the passages most relevant to the pastor's question.
2. **Doctrinal filter** — restrict what's retrievable in the first place, by
   curation and metadata, not by asking the LLM to police theology at query
   time from an unfiltered result set.

That's the case for Option A specifically. Option B (below) sidesteps both
problems by not searching at all — the pastor picks the one document, reads
it themselves through the agent, and the doctrinal judgment stays exactly
where it already is: with the pastor, in the moment, on a document they
chose. No curation step needed because there's no shared corpus to curate.

---

# Option A: Curated theological library (RAG search)

## Architecture overview

```
Admin uploads PDF  ─▶  POST /api/v1/theology-library/sources  (admin-only)
                        stores original PDF on disk (data/theology-library/<sourceId>.pdf)
                        creates ReadingSource row: status = 'pending_review'

Ingestion (on upload, or admin-triggered "process")
  1. Extract text          — pdf-parse (or OCR fallback for scanned pages)
  2. Chunk                 — ~500-800 tokens, paragraph-aware, page-number tagged
  3. Embed                 — OpenAI text-embedding-3-small via existing
                              ProviderConfig('openai') key (api-key-resolver.ts)
  4. Store                 — ReadingChunk rows, pgvector column `embedding`

Doctrinal review (admin, required before a source is searchable)
  - Reviewer sets ReadingSource.doctrineTags (denomination/tradition) and
    ReadingSource.status: 'approved' | 'rejected'
  - Only 'approved' sources are ever included in retrieval queries

Retrieval (agent-initiated, at runtime)
  ReasoningLoop → tool_call: search_theological_reading(query, ...)
    → SearchTheologyTool (host-side, like save_memory/search_memory)
        embed(query) → pgvector cosine search
        WHERE source.status = 'approved'
          AND source.doctrineTags ⊆ agent's allowed doctrineTags (or untagged/general)
        → top-K chunks with { text, sourceTitle, page, doctrineTags }
    → result fed back into the reasoning loop as tool output
```

Everything from "Ingestion" through "Retrieval" runs in the NestJS API
process (host), not inside the agent's sandboxed container — the same split
`save_memory`/`search_memory` already use (`engine/tools/memory.ts`, bound to
`PrismaService` and executed outside `--network none`). This also means PDF
parsing and embedding calls need no container network exception.

## Data model additions (`packages/api/prisma/schema.prisma`)

```prisma
enum ReadingSourceStatus {
  pending_review
  approved
  rejected
}

model ReadingSource {
  id            String              @id @default(cuid())
  title         String
  author        String?
  filePath      String              // data/theology-library/<id>.pdf
  fileSizeBytes Int
  pageCount     Int?
  status        ReadingSourceStatus @default(pending_review)
  doctrineTags  String[]            @default([]) // e.g. ["reformed", "baptist"]; [] = general/uncontested
  reviewedById  String?
  reviewNote    String?             // reviewer's rationale, esp. for rejections
  uploadedById  String
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  chunks       ReadingChunk[]
  uploadedBy   User  @relation("UploadedReadingSources", fields: [uploadedById], references: [id])
  reviewedBy   User? @relation("ReviewedReadingSources", fields: [reviewedById], references: [id])

  @@index([status])
}

model ReadingChunk {
  id         String                       @id @default(cuid())
  sourceId   String
  page       Int
  chunkIndex Int
  text       String
  embedding  Unsupported("vector(1536)") // pgvector; 1536 = text-embedding-3-small
  createdAt  DateTime                     @default(now())

  source ReadingSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  @@index([sourceId])
}
```

`Unsupported("vector(1536)")` is how Prisma models a pgvector column today
(no first-class type) — the migration's raw SQL handles the actual column,
index, and similarity query; Prisma is used for everything except the ANN
search itself, which goes through `$queryRaw`.

## Infrastructure change: pgvector

`docker-compose.dev.yml` and `docker-compose.prod.yml` both currently pin
`postgres:16-alpine` (no extensions). Switch the image to
`pgvector/pgvector:pg16` (drop-in Postgres 16 + the `vector` extension) and
add a migration that runs `CREATE EXTENSION IF NOT EXISTS vector;` plus an
IVFFlat or HNSW index on `ReadingChunk.embedding`. This is the one genuinely
invasive infra change in this plan — flag it to whoever owns the prod
Postgres volume before merging, since it's an image swap on an existing
data volume (safe — pgvector is a strict superset of stock Postgres — but
worth a deliberate deploy step, not a silent `update:clawix`).

## Ingestion service (`packages/api/src/theology-library/`)

New module, mirroring the shape of `packages/api/src/talkingface/` (a
focused feature module with its own controller/service/module):

- **`theology-library.controller.ts`**
  - `POST /api/v1/theology-library/sources` (admin-only, `@Roles`) — multipart
    PDF upload, creates `ReadingSource` with `status: pending_review`,
    kicks off async extraction.
  - `POST /api/v1/theology-library/sources/:id/review` (admin-only) — body
    `{ status: 'approved' | 'rejected', doctrineTags: string[], reviewNote?: string }`.
  - `GET /api/v1/theology-library/sources` — list with status filter (for the
    admin review queue).
  - `DELETE /api/v1/theology-library/sources/:id` — cascades to chunks;
    logged to `AuditLog` (`resource: 'ReadingSource'`) since this is a
    content-removal action with theological/reputational weight, same reason
    `AuditLog` is append-only for other sensitive actions.

- **`pdf-extraction.service.ts`** — wraps `pdf-parse` (add as a new
  `packages/api` dependency) for text-layer PDFs. For scanned/image-only
  pages (common with older theological works), fall back per-page to an OCR
  step — reuse whatever OCR path the "Document intake & OCR" capability
  already implies for the ministry packs (`capabilities-section.tsx` markets
  this; confirm/reuse if an OCR service already exists in the API before
  adding a second one). Flag pages that fail both as `[UNEXTRACTED]` in the
  chunk text rather than silently dropping them, so a reviewer can see gaps.

- **`chunking.util.ts`** — paragraph-aware splitter, ~500–800 tokens per
  chunk with ~15% overlap, each chunk tagged with its source page number
  (needed so retrieval results can cite "p. 142" back to the pastor, which
  matters more here than in a generic RAG use case — a pastor needs to go
  verify the source, not just trust the snippet).

- **`embedding.service.ts`** — thin client around the OpenAI SDK
  (`openai: ^6.29.0`, already a dependency in `packages/api/package.json`)
  calling `embeddings.create({ model: 'text-embedding-3-small', input })`.
  Resolves its API key the same way the engine does today —
  `api-key-resolver.ts` against the existing `ProviderConfig('openai')` row —
  so no new secret is needed if OpenAI is already configured as a chat
  provider; if it isn't, this is the one place a deployment must configure
  an OpenAI key even for an otherwise-Anthropic-only setup, and that's worth
  documenting explicitly in `.env.example` / `docs/PROVIDERS.md`.

- **`theology-library.module.ts`** — registers the above + the retrieval
  tool factory (below).

## Retrieval tool: `search_theological_reading`

New file `packages/api/src/engine/tools/theology-library.ts`, following the
exact pattern of `createSaveMemoryTool`/`createSearchMemoryTool` in
`engine/tools/memory.ts` (host-side `Tool`, bound to `PrismaService`, `ok`/
`err` `ToolResult` helpers):

```ts
export function createSearchTheologyTool(
  prisma: PrismaService,
  embeddingService: EmbeddingService,
  allowedDoctrineTags: readonly string[], // from the agent's config, see below
): Tool {
  return {
    name: 'search_theological_reading',
    description:
      'Search the approved theological reading library for passages relevant to a question. ' +
      'Returns excerpts with source title and page number for citation.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural-language question or topic.' },
        topK: { type: 'number', description: 'Max passages to return (default 5, max 10).' },
      },
      required: ['query'],
    },
    async execute(params) {
      const vector = await embeddingService.embed(params['query'] as string);
      const rows = await prisma.$queryRaw`
        SELECT c.text, c.page, s.title, s."doctrineTags"
        FROM "ReadingChunk" c
        JOIN "ReadingSource" s ON s.id = c."sourceId"
        WHERE s.status = 'approved'
          AND (s."doctrineTags" = '{}' OR s."doctrineTags" && ${allowedDoctrineTags})
        ORDER BY c.embedding <=> ${vector}::vector
        LIMIT ${Math.min((params['topK'] as number) ?? 5, 10)}
      `;
      // format rows into cited excerpts, same ok()/err() shape as memory.ts
    },
  };
}
```

Registration is conditional, not global — this is not one of the always-on
`registerBuiltinTools` (`engine/tools/index.ts`); it's registered per-agent
run only when the agent's `AgentDefinition.toolConfig` opts in, mirroring
how `browserToolsEnabled` already gates `registerBrowserTools()`:

```jsonc
// AgentDefinition.toolConfig
{ "theologyLibraryEnabled": true, "doctrineTags": ["reformed", "baptist"] }
```

`doctrineTags: []` on an agent means "general/uncontested sources only" —
sources with no tags of their own (broad consensus material: Greek/Hebrew
lexicons, historical-critical background, church history) are always
visible; a source tagged to a specific tradition is only visible to agents
explicitly configured for that tradition. This keeps the filter declarative
and auditable in the database rather than living in a prompt instruction the
agent could be talked out of — same design principle
`PASTORAL_CARE_GOVERNANCE.md` already applies to the pastoral-care agent's
hard boundaries (table in §1: enforcement column always points at data/config,
never "the agent is told not to").

## Skill wrapper

Add `skills/builtin/theological-library/SKILL.md` — not the readings
themselves, just the instruction layer:

```markdown
---
name: theological-library
description: "Use when a sermon, Bible study, or pastoral answer needs support from the approved theological reading library — commentaries, systematic theologies, denominational statements. Call search_theological_reading; always cite title + page; if nothing relevant is approved for this congregation's tradition, say so rather than reasoning from general knowledge."
pack: church
---

# Theological Reading Library

Retrieved passages come from a curated, denomination-tagged library —
already filtered to material consistent with this congregation's teaching.
Still:

- Always cite `title, p. N` for any claim drawn from a retrieved passage.
- If retrieval returns nothing relevant, say so explicitly. Do not fall back
  to unfiled general knowledge and present it with the same authority as a
  cited source.
- If a retrieved passage seems to conflict with another retrieved passage,
  surface the tension to the pastor rather than silently picking one.
```

This follows the existing skill contract exactly (`SkillLoaderService`
requires `name` + `description` frontmatter under `MAX_SKILL_DESCRIPTION_LENGTH`)
and gives the agent the *behavioral* rule (cite, don't invent, surface
conflicts) while the *access* rule (which sources exist at all) stays
enforced in SQL, not prompt text — belt and suspenders, but the SQL filter
is the one that actually can't be bypassed by a clever user message.

## Admin UI (`packages/web/src/app/(dashboard)/theology-library/`)

- Upload form (PDF + title + author) → calls the ingestion endpoint.
- Review queue: `pending_review` sources, PDF preview, doctrine-tag picker
  (reuse the tag-input pattern already built for congregation-profile tagging
  — `TagProfileDialog` in the pastoral-care dashboard is the closest existing
  component to crib from), approve/reject with a required note on rejection.
- Source list with status badges and a "reprocess" action (re-run extraction
  if OCR quality was poor).

## Option A governance notes

- **Copyright.** Most theological commentaries and systematic theologies are
  under active copyright. Ingesting a publisher's PDF into a searchable
  store — even for internal, single-congregation use — is a licensing
  question the pastor/admin needs to actually answer per source, not
  something this plan can wave away. Put a copyright-acknowledgment checkbox
  on the upload form and record it on `ReadingSource` (`copyrightConfirmed:
  Boolean`, `copyrightNote: String?`) so there's a record of who attested to
  what.
- **Doctrinal responsibility stays human.** `doctrineTags` and the
  approve/reject decision are set by a person, logged (`reviewedById`,
  `reviewNote`), and changeable — this plan explicitly does not attempt to
  have the LLM self-certify a source's doctrinal alignment at ingestion
  time. That mirrors the existing stance in
  `PASTORAL_CARE_GOVERNANCE.md` (§1) that hard boundaries are enforced by
  data/config, never by asking the model to hold the line.
- **Audit trail.** Log `source.approve`, `source.reject`, and
  `source.delete` to `AuditLog` (append-only, no update/delete API surface
  per the existing invariant) — a rejected-then-later-reconsidered source is
  exactly the kind of decision a board might ask to see the history of.

## Option A tests

- `pdf-extraction.service.test.ts` — text-layer PDF fixture, OCR-fallback
  path, `[UNEXTRACTED]` marking.
- `chunking.util.test.ts` — chunk size/overlap bounds, page-number tagging
  across a page break.
- `embedding.service.test.ts` — mocked OpenAI client, key resolution via
  `api-key-resolver.ts`.
- `theology-library.controller.test.ts` — upload → pending_review; review
  transitions; admin-only guard; delete cascades + audit log entry.
- `engine/tools/__tests__/theology-library.test.ts` — mocked Prisma
  `$queryRaw`, asserts the `doctrineTags` filter is applied and `status =
  'approved'` is never omitted from the query (this is the one test that
  actually protects the doctrinal-filter invariant — treat it as
  load-bearing, not boilerplate).

## Option A rollout order

1. `pgvector/pgvector:pg16` image swap + migration (`CREATE EXTENSION
   vector`, `ReadingSource`/`ReadingChunk` tables, ANN index). Deployable and
   verifiable with no application code yet.
2. Ingestion module (upload, extraction, chunking, embedding) + admin review
   endpoints, no retrieval tool wired up yet — lets an admin start curating a
   library while the retrieval side is still in progress.
3. `search_theological_reading` tool + conditional registration via
   `toolConfig.theologyLibraryEnabled` + `SKILL.md` wrapper.
4. Wire `church-sermon-prep` (and optionally `church-bible-study`,
   `pastoral-care`) on as the first agents with the tool enabled, doctrine
   tags matching the congregation's actual tradition.
5. Admin review-queue UI.

Each step is independently useful — an admin can be curating and approving
sources in step 2 well before any agent can search them in step 3, which
gives the doctrinal review process a running start instead of a backlog
dumped on launch day.

---

# Option B: Ad-hoc single-document reading (no RAG, no review)

Lets a pastor upload one PDF (or DOCX) into their own agent's workspace and
say "read this and tell me...", with no admin curation step and no vector
search. This reuses the workspace agents already have, plus one new
conversion step, and otherwise rides entirely on existing engine machinery
— context window, session history, `MemoryConsolidationService` — for the
"wait for subsequent prompts about the text" part. No new session/context
mechanism is needed for that; it's what sessions already do.

## Why this is a genuinely separate path from Option A

Workspaces already accept PDF uploads — `WorkspaceService.uploadFile`
(`packages/api/src/workspace/workspace.service.ts:592`) writes any file to
disk with no format restriction, and files are visible to the agent's
container the normal way. But PDFs are classified as a `BINARY_TYPES` entry
(`workspace.service.ts:96`), so `readFileContent` deliberately returns
`content: null` for them (`workspace.service.ts:305-306`) — there is
currently **no path** by which an agent (or the dashboard file viewer) can
read what's inside an uploaded PDF. That's the specific gap this closes.

It's deliberately not routed through Option A's `ReadingSource` table:
there's no reason a pastor's personal, private reading of one document
should wait on an admin review queue, get a doctrine tag, or become
searchable by every other agent in the church. Option B's "review" is the
pastor reading the document themselves, in real time, which is a stronger
guarantee of doctrinal fit than any tag ever could be — it just doesn't
scale to a hundred-document library, which is exactly what Option A is for.

## Flow

```
Pastor uploads sermon-prep.pdf to their agent's workspace
  (existing: WorkspaceService.uploadFile → stored on disk, mounted at /workspace)

Pastor, in chat: "Read sermon-prep.pdf and summarize its argument about grace."

ReasoningLoop → tool_call: convert_document_to_markdown({ path: "/workspace/sermon-prep.pdf" })
  (host-side tool, like search_theological_reading)
    1. Resolve the real disk path via the same workspace path-resolution
       WorkspaceService already uses (resolveWorkspacePaths /
       ScopedFs) — never trust the container-side path directly.
    2. Detect format: .pdf → PdfExtractionService (shared with Option A's
       ingestion module — same text-layer extraction + OCR fallback);
       .docx → DocxExtractionService (new, small — see below).
    3. Assemble Markdown: "## Page N" headings, paragraphs preserved,
       `[UNEXTRACTED]` markers on any page/section OCR couldn't recover.
    4. Write sermon-prep.pdf.md as a sibling file in the same workspace
       directory (so it shows up in the normal file list, and survives
       for next time — step 1 is skipped on a later request if the .md
       sibling is newer than the source file).
    5. Return a SHORT result: { markdownPath, pageCount, ocrPagesUsed } —
       not the full text.

ReasoningLoop → tool_call: read_file({ path: "/workspace/sermon-prep.pdf.md" })
  (existing tool, engine/tools/file-io.ts — nothing new needed here)
    → full Markdown content returned, becomes part of the session's
      message history from this point on.

Agent answers using the now-loaded content. Follow-up questions in the same
session ("what does it say about fasting?") need no re-conversion — the
text is already in the conversation. If the session grows past 65,536
tokens, MemoryConsolidationService compacts it the same way it would for
any other long conversation — this feature adds no new compaction logic.
```

Returning a short pointer from the conversion tool and letting the agent
call the ordinary `read_file` tool — rather than having
`convert_document_to_markdown` return the full text directly — keeps the
new tool's surface small and means one document can be re-read, re-listed,
or referenced by path without inventing a second content-delivery
mechanism. It also means a very long document can be split into multiple
per-chapter `.md` files (e.g. `sermon-prep/01-intro.md`,
`sermon-prep/02-grace.md`) if extraction detects natural chapter/heading
breaks, so the agent can `list_directory` and read only the section it
needs instead of one giant file — reusing tools that already exist rather
than inventing pagination for `read_file`.

## Conversion pipeline

### PDF: text layer + OCR fallback

Reuses `PdfExtractionService` from Option A's ingestion module
(`packages/api/src/theology-library/pdf-extraction.service.ts`) — same
per-page text-layer extraction via `pdf-parse`. The OCR fallback for
scanned/image-only pages (which the user has specifically asked for) needs
an actual OCR engine, which today's codebase has none of:

| Option | Notes |
|---|---|
| **Tesseract.js** (recommended default) | Pure JS/WASM, runs in the API process with no external service or GPU — same "no new sidecar" shape as everything else in this plan except SadTalker/Piper. Good enough accuracy for clean scans of printed text; struggles with poor scans, unusual fonts, or non-Latin scripts beyond what its trained language packs cover. |
| External OCR API (e.g. a cloud vision/OCR service) | Higher accuracy, handles harder scans, but adds a network dependency and a per-page cost — a bigger decision (data leaves the self-hosted boundary) that deserves its own sign-off given `docs/SECURITY.md`'s self-hosted posture, not something to default into silently. |

Default to Tesseract.js; note the external-API option in `docs/PROVIDERS.md`
as a future upgrade path if scan quality turns out to be the bottleneck in
practice, not something to build speculatively now.

### DOCX: structured conversion, no OCR needed

`DocxExtractionService` — a thin wrapper around `mammoth` (converts `.docx`
directly to Markdown/HTML from its native XML, since it's already
structured text, not a scanned image). New dependency, small and
well-established; no OCR path needed for this format.

### Both formats

- Reject or truncate documents past a size ceiling (page count and/or
  extracted-character count) with a clear tool error rather than silently
  producing a Markdown file too large for any session to hold — the exact
  ceiling should be picked against `MemoryConsolidationService`'s
  65,536-token trigger, not chosen arbitrarily.
- `.md` output is plain workspace content — it inherits whatever access
  control already governs that pastor's workspace folder
  (`WorkspaceService.assertPathAllowed`); no new permission model needed.

## New tool: `convert_document_to_markdown`

`packages/api/src/engine/tools/document-conversion.ts`, host-side (like
`createSearchTheologyTool`), bound to `WorkspaceService`/`ScopedFs` for path
resolution and to the two extraction services:

```ts
export function createConvertDocumentTool(
  workspaceService: WorkspaceService,
  pdfExtraction: PdfExtractionService,
  docxExtraction: DocxExtractionService,
): Tool {
  return {
    name: 'convert_document_to_markdown',
    description:
      'Convert an uploaded PDF or DOCX in the workspace to a readable Markdown file ' +
      '(OCR is used automatically for scanned pages). Returns the path to the ' +
      'Markdown file — read it with read_file to see the content. Skips ' +
      'reconversion if an up-to-date .md sibling already exists.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Workspace path to the PDF or DOCX file.' },
      },
      required: ['path'],
    },
    async execute(params) {
      // resolve + validate path within the caller's workspace, extension-dispatch
      // to pdfExtraction or docxExtraction, write sibling .md, return short result
    },
  };
}
```

Gated by `toolConfig.documentReadingEnabled` — default **on**, unlike
Option A's `theologyLibraryEnabled`, because this tool only ever touches
files the pastor themselves put in their own workspace; there's no shared
corpus or doctrinal exposure to gate against.

## Skill wrapper

`skills/builtin/read-document/SKILL.md`:

```markdown
---
name: read-document
description: "Use when the user uploads or references a PDF or DOCX file in their workspace and asks you to read, summarize, explain, or answer questions about it. Call convert_document_to_markdown, then read_file on the resulting path, then respond. Skip conversion if a current .md sibling is already present."
pack: church
---

# Reading an uploaded document

1. Convert: `convert_document_to_markdown({ path })`.
2. Read: `read_file({ path: <markdownPath from step 1> })`.
3. Discuss the content normally. If OCR left `[UNEXTRACTED]` sections,
   tell the user which pages/parts couldn't be read rather than silently
   skipping them.
4. This is the user's own document, not the approved theological library —
   don't present it with the institutional authority of a vetted source;
   it carries whatever authority the user already grants the document
   themselves.
```

## Relationship to Option A

Once a pastor has read a document this way and thinks it belongs in the
shared library, offer a "Submit to theological library" action (dashboard,
not agent-initiated) that copies the original PDF into Option A's upload
flow (`POST /api/v1/theology-library/sources`) so it enters the normal
doctrinal review queue from there. This is the one deliberate bridge
between the two options — everything else stays separate on purpose.

## Option B tests

- `docx-extraction.service.test.ts` — mocked `mammoth` output, Markdown
  shape.
- `document-conversion.tool.test.ts` — path validation (rejects paths
  outside the caller's workspace scope), skip-if-fresh-sibling-exists
  behavior, size-ceiling rejection, `[UNEXTRACTED]` marking passed through
  from the extraction services.
- Extend `pdf-extraction.service.test.ts` (shared with Option A) rather
  than duplicating it.

## Option B rollout order

1. `DocxExtractionService` + reuse of `PdfExtractionService` (can be built
   before or independently of Option A's ingestion module — extract the PDF
   text-extraction logic into a shared service either way so neither option
   ends up owning it exclusively).
2. Tesseract.js OCR fallback wired into `PdfExtractionService`.
3. `convert_document_to_markdown` tool + conditional registration via
   `toolConfig.documentReadingEnabled` (default on) + `read-document`
   `SKILL.md`.
4. "Submit to theological library" bridge action (only meaningful once
   Option A's upload endpoint exists).

Steps 1–3 have no dependency on pgvector, `ReadingSource`/`ReadingChunk`, or
any Option A infrastructure — this option can ship completely independently
and first, if the immediate need is "let the pastor read their own PDF"
rather than "build the whole library."
