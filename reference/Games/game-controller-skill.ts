/**
 * GAME CONTROLLER SKILL  (v2 — TypeScript, storyboard-aware)
 * ────────────────────────────────────────────────────────────
 * Clawix custom skill. Register in: Dashboard → Skills → Create Skill
 *
 * This is the pure TypeScript version of game_controller_skill.yaml.
 * It extends v1 with two new storyboard actions:
 *   load_storyboard  — seeds game-server from an approved StoryboardPackage
 *   advance_panel    — moves the renderer to the next storyboard scene
 *
 * All other v1 actions (spawn_player, move_player, etc.) are unchanged.
 *
 * The game-server enforces the HITL gate itself:
 *   start_game will FAIL unless load_storyboard was called first
 *   with an approved (hitl.readyForBuild === true) package.
 */

import type { StoryboardPackage } from '../storyboard/storyboard-agent';

// ── TYPES ────────────────────────────────────────────────────

export type GameAction =
  // Storyboard actions (new in v2)
  | 'load_storyboard'
  | 'advance_panel'
  // Game actions (same as v1)
  | 'start_game'
  | 'stop_game'
  | 'set_world'
  | 'spawn_player'
  | 'move_player'
  | 'teleport_player'
  | 'set_player_color'
  | 'remove_player'
  | 'spawn_coins'
  | 'clear_coins'
  | 'set_hud'
  | 'reset'
  | 'get_state';

export interface GameControllerParams {
  action: GameAction;
  params?: {
    // load_storyboard / advance_panel
    package?: StoryboardPackage;
    // start_game
    message?: string;
    // set_world
    gravity?: number;
    friction?: number;
    width?: number;
    height?: number;
    // spawn_player
    id?: string;
    x?: number;
    y?: number;
    color?: string;
    size?: number;
    label?: string;
    // move_player
    vx?: number;
    vy?: number;
    // spawn_coins
    count?: number;
    value?: number;
    // set_hud
    title?: string;
    score?: number;
  };
}

export type GameControllerResult = { ok: true; data: unknown } | { ok: false; error: string };

// ── SKILL RUNNER ─────────────────────────────────────────────

const AGENT_WS_URL = 'ws://localhost:9091';

export async function run(params: GameControllerParams): Promise<GameControllerResult> {
  const { action, params: p = {} } = params;

  return new Promise((resolve, reject) => {
    const ws = new (require('ws'))(AGENT_WS_URL);

    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error('Game server timeout — is server/game-server.ts running on port 9091?'));
    }, 5000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ action, params: p }));
    });

    ws.on('message', (data: Buffer) => {
      clearTimeout(timer);
      ws.close();
      try {
        resolve(JSON.parse(data.toString()));
      } catch {
        resolve({ ok: true, data: data.toString() });
      }
    });

    ws.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ── CLAWIX YAML REGISTRATION BLOCK ──────────────────────────
//
// Paste into Dashboard → Skills → Create Skill:
//
// name: game_controller
// description: >
//   Controls the live TypeScript game server at ws://localhost:9091.
//   v2: includes load_storyboard and advance_panel actions.
//   The server enforces the storyboard HITL gate — start_game will fail
//   unless an approved StoryboardPackage has been loaded first.
// type: custom
// execution:
//   runtime: node
//   entrypoint: skill/game-controller-skill.ts
// parameters:
//   - name: action
//     type: string
//     required: true
//     description: |
//       STORYBOARD ACTIONS (new):
//         load_storyboard  — params: { package: StoryboardPackage }
//         advance_panel    — params: { package: StoryboardPackage }
//       GAME ACTIONS (unchanged from v1):
//         start_game       — params: { message }
//         stop_game
//         set_world        — params: { gravity, friction }
//         spawn_player     — params: { id, x, y, color, size, label }
//         move_player      — params: { id, vx, vy }
//         teleport_player  — params: { id, x, y }
//         set_player_color — params: { id, color }
//         remove_player    — params: { id }
//         spawn_coins      — params: { count, value }
//         clear_coins
//         set_hud          — params: { title, message, score }
//         reset
//         get_state
//   - name: params
//     type: object
//     required: false
