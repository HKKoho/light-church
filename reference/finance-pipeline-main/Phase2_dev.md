# SecureFin Pipeline — Tier Positioning & Phase 2 Roadmap

Assessed against the tier framework in `AIbyML_Industry_Playbook.pptx`
(trust sensitivity × autonomy, five tiers + governance cross-cut).

---

## 1. Where this product sits today

**Trust axis — high.** It handles banking transaction data, GL codes,
cost centers, and balances: the playbook names finance explicitly as a
Tier 1 vertical ("Defense, finance, religious, political clients").
The deployment model we just built reinforces this — Docker + a
client-owned Hetzner server (`DEPLOY_HETZNER.md`), SQLite/Postgres
inside the client's own infrastructure, no data leaving to a
third-party SaaS. That's the Tier 1 delivery pattern verbatim:
*"Fine-tuned/RAG on self-hosted models, in client infrastructure."*

**Autonomy axis — low.** The actual pipeline (`server.ts`,
`layer1-rpa` → `layer2-ai` → `layer3-client`) is a fixed, scripted
sequence: extract → classify → validate → flag-or-pass → report.
Low-confidence or rule-violating transactions are written with
`requires_human_review = 1` and sit in a review queue
(`/api/pipeline/review-queue`) until a human approves or rejects them.
Nothing ships to the warehouse or a client-facing report without
either passing validation or clearing human review. That is Tier 2a's
definition almost exactly: *"AI executing a defined, monitored
workflow — the trust-building pilot."*

**The one partial exception:** FinPilot (Layer 4) is a single-turn
tool-calling assistant — user asks, model picks one action
(`classify`/`transform`/`query`/`analyse`/`export`), `ActionExecutor`
runs it immediately against the live database with no separate
confirmation step. That's a sliver of autonomy inside an otherwise
Tier 2a system, not yet Tier 2b's *"multi-agent orchestration, human
checkpoints."*

**Conclusion:** this product is **Tier 1-in-waiting, currently built
and priced like Tier 2a** — the same pattern the playbook calls out
in the Light Church case study ("Tier 2b architecture, wearing Tier
2a's trust posture," just the mirror image here: Tier 1-grade data
sensitivity, running at Tier 2a's autonomy and scripted-pilot
delivery). Two consequences follow directly from the playbook:

- **Sell it at Tier 1 pricing/contract shape now**, not Tier 2a's
  $10–30k pilot pricing — confidential fixed-fee build + managed-hosting
  retainer, NDA before SOW — because the *data* is what a client is
  paying to protect, regardless of how autonomous the system is yet.
- **Use the staged Phase 1 → Phase 2 contract** the playbook prescribes
  for Tier 2a→2b as the roadmap for autonomy, independent of the Tier 1
  trust/hosting decision, which doesn't change across phases.

---

## 2. Phase 1 (current state — ship this as the pilot)

What exists today already *is* a sellable Phase 1:

- RPA extraction (Layer 1, Playwright) → AI classification (Layer 2,
  Claude/Gemini with a local-classifier fallback) → rules validation →
  human review queue → Excel report (Layer 3) → warehouse export
  (Layer 5: JSON/CSV/Postgres).
- Full audit trail (`audit_events` table) and per-run status tracking
  (`pipeline_runs`) — this is a governance feature, not just internal
  logging; see §4.
- Self-hosted deployment path (Docker, `install.sh`, Hetzner guide) —
  the client can run this entirely inside their own infrastructure.

**Phase 1 contract shape (per playbook):** fixed-price SOW, scoped to
one bank/data source, human-reviews-everything-flagged. This is the
low-risk pilot that earns the right to propose Phase 2.

---

## 3. Phase 2 — what to build to earn the agentic upsell

Phase 2 is the subscription/value-based upsell, triggered once a
client has seen Phase 1 perform. The playbook's warning applies
directly: 86–89% of enterprise agent pilots never reach production —
so Phase 2 has to *reduce* autonomy risk while *increasing* autonomy,
not just remove the human gate.

### 3.1 Multi-agent orchestration (move Layer 2/4 toward Tier 2b)

Replace the single linear classification script and the single
tool-calling assistant with a small set of specialized agents behind
one coordinator, Clawix-style:

- **Extraction agent** — owns Layer 1 bank sessions, retries, and
  staging-file integrity.
- **Classification agent** — current Layer 2 logic, but able to call
  the rules engine and warehouse client as tools rather than being a
  fixed script.
- **Compliance/validation agent** — currently just `RulesEngine`;
  promote it to an agent that can *request* more context (e.g., ask
  the classification agent to re-run with a stricter prompt) instead
  of only pass/flag/reject.
- **Coordinator** — routes between agents, owns the human-checkpoint
  decision, and is the single place the escalation/override clause
  (§3.2) attaches to.

This is additive to the existing pipeline, not a rewrite: `server.ts`'s
webhook-driven layer handoffs (`layer1_status` → `layer2_status` →
`layer3_status` in `pipeline_runs`) already model a state machine that
an orchestrator can sit on top of.

### 3.2 Escalation, override, and liability — build this now

The playbook flags this as "moving against — plan now": the clause
will shift from differentiator to baseline compliance as regulation
catches up. Concretely:

- A logged, first-class **override event** (extend `audit_events`
  rather than overload it) whenever a human overrides an AI decision
  — who, when, what was overridden, and why.
- A documented **escalation path**: who gets notified when the
  Coordinator can't resolve a conflict between agents, and an SLA for
  human response.
- A **liability allocation clause** in the Phase 2 subscription
  contract itself — decided at signing, not retrofitted after an
  incident (see the Truthlight project's attribution-boundary lesson
  in the deck — same principle applies to a wrong GL code as to a
  misattributed quote).

### 3.3 Confidence-based autonomy dial

Right now every flagged transaction requires human review — a binary
switch. Phase 2 should make the autonomy level itself the thing being
sold:

- Per-category or per-confidence-threshold auto-approval, configurable
  per client (e.g., "auto-approve classifications ≥ 0.95 confidence
  for categories the client has manually approved 20+ times").
- Start every new client at 100% human review (Phase 1 posture) and
  dial autonomy up as their own approval history builds trust — this
  *is* the staged land-and-expand motion, implemented as a product
  feature instead of just a sales pattern.
- Pricing hook: subscription tier or "% of transaction value
  automated" maps directly onto this dial, matching the playbook's
  suggested Phase 2 pricing model.

### 3.4 Governance & assurance as an unbundled retainer

The playbook calls governance the nearest live opportunity
(28.5% CAGR, APAC SME/NGO underserved) and warns it's "being given
away as a contract clause instead of sold as a service." This product
already has the raw material:

- `audit_events`, `validation_status`, `validation_flags`,
  `requires_human_review`, `reviewed_by`/`reviewed_at` are effectively
  a compliance log today, just not packaged as one.
- Phase 2 should add an **exportable audit/compliance report**
  (per-run, per-period) and a **PII-handling record** — then this
  becomes a retainer that can be sold standalone, independent of the
  build contract, to the same client or even to clients who didn't
  buy the pipeline itself.

### 3.5 Data & domain curation as reusable IP

The classification prompts (`layer2-ai/prompts/classify.ts`), GL-code
mapping logic, and validation rules are currently scoped to one
engagement. Per the playbook's "layers the original five miss" point:
this should be licensed/amortized across engagements rather than
rebuilt each time — e.g., a versioned "chart-of-accounts classifier"
asset that's customized per client rather than reauthored.

---

## 4. Contract and pricing evolution

| | Phase 1 (now) | Phase 2 (agentic) |
|---|---|---|
| Tier | 2a scripted, Tier 1 data | 2b agentic, Tier 1 data |
| Contract | Fixed-fee SOW, single bank/source | Subscription or % of value automated |
| Autonomy | 100% human review of flags | Confidence-tiered auto-approval |
| Sold with | — | Governance/assurance retainer (can be separate) |
| Required clause | NDA before SOW | + explicit escalation/override & liability clause |
| Hosting | Client infra (Docker/Hetzner) — unchanged across phases | Client infra (Docker/Hetzner) — unchanged across phases |

The hosting model doesn't change between phases — that's the Tier 1
trust commitment staying constant while the Tier 2a→2b autonomy dial
moves, which is exactly the "architecture vs. posture" split the
playbook's Light Church case study makes.

---

## 5. Near-term engineering priorities

1. Extend `audit_events` with a distinct override/escalation event
   type (§3.2) — cheapest, highest-leverage item; unblocks the
   governance retainer pitch immediately, even before Phase 2 ships.
2. Add a per-client, per-category confidence-threshold config table
   and wire it into the review-queue logic (§3.3).
3. Add an audit/compliance export endpoint (PDF or CSV) reusing the
   existing `audit_events` + `classified_transactions` data (§3.4).
4. Design the Coordinator/agent boundary (§3.1) as an interface layer
   over the existing Layer 1–3 scripts before touching their internals
   — keeps Phase 1 deployments stable while Phase 2 is built.
5. Version and externalize the classification prompt + GL-mapping
   rules as a standalone, licensable config (§3.5).
