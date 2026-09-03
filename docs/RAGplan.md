# Theological Reading Library — RAG Plan

Gives the pastor's agents (primarily `church-sermon-prep`, also usable by
`church-bible-study`, `pastoral-care`) a searchable library of theological
PDFs — commentaries, systematic theologies, denominational statements,
sermon archives — too large to load as skill text, filtered so retrieval
never surfaces material that contradicts the congregation's own doctrinal
positions.

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

## Governance notes

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

## Tests

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

## Rollout order

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
