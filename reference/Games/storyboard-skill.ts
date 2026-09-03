/**
 * STORYBOARD SKILL · Clawix Custom Skill
 * ───────────────────────────────────────
 * TypeScript implementation of the storyboard_director skill.
 * Register this in: Clawix Dashboard → Skills → Create Skill
 *
 * Unlike game_controller_skill (which talks to a running game server),
 * this skill runs entirely inside the Clawix container — no external
 * process needed. It produces a StoryboardPackage and enforces the
 * HITL gate before any game build action is allowed.
 *
 * Actions:
 *   produce_storyboard   — takes a GameBrief, returns a StoryboardPackage
 *   approve_storyboard   — human calls this with reviewer notes → opens HITL gate
 *   assert_approved      — GAME-MASTER calls this before any game command
 *   get_downstream_brief — returns the relevant section for a named sub-agent
 */

import { StoryboardDirector, StoryboardPackage, GameBrief } from './storyboard-agent';

// ── SKILL TYPES ──────────────────────────────────────────────

export interface StoryboardSkillParams {
  action: 'produce_storyboard' | 'approve_storyboard' | 'assert_approved' | 'get_downstream_brief';
  brief?: GameBrief;
  package?: StoryboardPackage;
  reviewerNotes?: string;
  agentName?: 'worldBuilder' | 'narrativeEngine' | 'gameBalance';
}

export type StoryboardSkillResult =
  | { ok: true; data: StoryboardPackage | object | string }
  | { ok: false; error: string };

// ── SKILL RUNNER ─────────────────────────────────────────────

const director = new StoryboardDirector();

/** In-process store — in production, persist to Redis or Postgres */
let _latestPackage: StoryboardPackage | null = null;

export async function run(params: StoryboardSkillParams): Promise<StoryboardSkillResult> {
  switch (params.action) {
    // ── produce_storyboard ───────────────────────────────────
    case 'produce_storyboard': {
      if (!params.brief) {
        return { ok: false, error: 'Missing required param: brief' };
      }
      try {
        const pkg = await director.produce(params.brief);
        _latestPackage = pkg;
        return {
          ok: true,
          data: {
            package: pkg,
            hitlStatus: pkg.hitl,
            nextStep:
              '⚑ HITL gate is CLOSED. A human must call approve_storyboard ' +
              'with reviewerNotes before any game can be built.',
          },
        };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    }

    // ── approve_storyboard ───────────────────────────────────
    case 'approve_storyboard': {
      const pkg = params.package ?? _latestPackage;
      if (!pkg) {
        return { ok: false, error: 'No storyboard package found. Call produce_storyboard first.' };
      }
      if (!params.reviewerNotes?.trim()) {
        return { ok: false, error: 'reviewerNotes is required for HITL approval.' };
      }
      const approved = director.approve(pkg, params.reviewerNotes);
      _latestPackage = approved;
      return {
        ok: true,
        data: {
          package: approved,
          hitlStatus: approved.hitl,
          nextStep: '✓ HITL gate is OPEN. GAME-MASTER may now call game_controller actions.',
        },
      };
    }

    // ── assert_approved ──────────────────────────────────────
    case 'assert_approved': {
      const pkg = params.package ?? _latestPackage;
      if (!pkg) {
        return {
          ok: false,
          error: 'No storyboard found. Run produce_storyboard → approve_storyboard first.',
        };
      }
      try {
        director.assertApproved(pkg);
        const { downstreamBriefs } = pkg;
        return {
          ok: true,
          data: {
            approved: true,
            worldBuilderBrief: downstreamBriefs.worldBuilder,
            narrativeEngineBrief: downstreamBriefs.narrativeEngine,
            gameBalanceBrief: downstreamBriefs.gameBalance,
            panels: pkg.panels.length,
            premise: pkg.premise,
          },
        };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    }

    // ── get_downstream_brief ─────────────────────────────────
    case 'get_downstream_brief': {
      const pkg = params.package ?? _latestPackage;
      if (!pkg) {
        return { ok: false, error: 'No storyboard found.' };
      }
      if (!params.agentName) {
        return { ok: false, error: 'agentName is required.' };
      }
      const brief = pkg.downstreamBriefs[params.agentName];
      if (!brief) {
        return {
          ok: false,
          error: `Unknown agentName: ${params.agentName}. Use worldBuilder | narrativeEngine | gameBalance`,
        };
      }
      return { ok: true, data: brief };
    }

    default:
      return {
        ok: false,
        error: `Unknown action: ${(params as { action: string }).action}`,
      };
  }
}

// ── CLAWIX SKILL REGISTRATION BLOCK ─────────────────────────
//
// Paste the block below into Clawix Dashboard → Skills → Create Skill
// if you prefer to register it as YAML. The TypeScript above is the
// canonical implementation; the YAML just points Clawix at it.
//
// name: storyboard_director
// description: >
//   Phase 1 pre-production agent. Produces a typed StoryboardPackage
//   (premise, persona, emotional arc, scene panels, downstream agent briefs)
//   and enforces a HITL gate before any game-server build action is allowed.
//   GAME-MASTER must call assert_approved before dispatching to game_controller.
// type: custom
// execution:
//   runtime: node
//   entrypoint: storyboard/storyboard-skill.ts
// parameters:
//   - name: action
//     type: string
//     required: true
//     description: |
//       One of:
//         produce_storyboard   — params: brief (GameBrief)
//         approve_storyboard   — params: package?, reviewerNotes
//         assert_approved      — params: package?
//         get_downstream_brief — params: package?, agentName
//   - name: brief
//     type: object
//     required: false
//   - name: package
//     type: object
//     required: false
//   - name: reviewerNotes
//     type: string
//     required: false
//   - name: agentName
//     type: string
//     required: false
