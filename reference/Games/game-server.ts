/**
 * CLAWIX × TYPESCRIPT GAME SERVER  (v2 — storyboard-aware)
 * ──────────────────────────────────────────────────────────
 * Ports:
 *   9090 — browser clients   (Canvas renderer receives state)
 *   9091 — Clawix agent      (GAME-MASTER sends commands)
 *
 * NEW in v2:
 *   - Accepts 'load_storyboard' action — seeds world from approved StoryboardPackage
 *   - StoryboardPackage types imported from storyboard/storyboard-agent.ts
 *   - Canvas hint (backgroundColor, lightingMood) applied to game state
 *   - Game refuses to 'start_game' unless storyboardLoaded === true
 *
 * Run:   npx ts-node server/game-server.ts
 * Deps:  npm install ws && npm install --save-dev @types/ws typescript
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { StoryboardPackage, ScenePanel } from '../storyboard/storyboard-agent';

// ── GAME STATE ──────────────────────────────────────────────

interface Vec2 {
  x: number;
  y: number;
}

interface Player {
  id: string;
  pos: Vec2;
  vel: Vec2;
  color: string;
  size: number;
  label: string;
  alive: boolean;
}

interface Coin {
  id: string;
  pos: Vec2;
  value: number;
  collected: boolean;
}

interface CanvasTheme {
  backgroundColor: string;
  lightingMood: 'bright' | 'dim' | 'dark' | 'golden' | 'cold';
  gridVisible: boolean;
  ambientParticles: boolean;
}

interface GameState {
  running: boolean;
  tick: number;
  width: number;
  height: number;
  players: Record<string, Player>;
  coins: Coin[];
  hud: { title: string; message: string; score: number };
  gravity: number;
  friction: number;
  theme: CanvasTheme;
  // Storyboard metadata
  storyboardLoaded: boolean;
  currentPanelId: string | null;
  premise: string;
}

const state: GameState = {
  running: false,
  tick: 0,
  width: 800,
  height: 500,
  players: {},
  coins: [],
  hud: { title: 'Clawix Game', message: 'Waiting for storyboard…', score: 0 },
  gravity: 0,
  friction: 0.92,
  theme: {
    backgroundColor: '#0f0f14',
    lightingMood: 'dark',
    gridVisible: true,
    ambientParticles: false,
  },
  storyboardLoaded: false,
  currentPanelId: null,
  premise: '',
};

// ── GAME LOOP ───────────────────────────────────────────────

const TICK_MS = 50; // 20fps

function gameTick() {
  if (!state.running) return;
  state.tick++;

  for (const p of Object.values(state.players)) {
    if (!p.alive) continue;

    p.vel.y += state.gravity;
    p.vel.x *= state.friction;
    p.vel.y *= state.friction;
    p.pos.x += p.vel.x;
    p.pos.y += p.vel.y;

    // Wall bounce
    if (p.pos.x - p.size < 0) {
      p.pos.x = p.size;
      p.vel.x *= -0.6;
    }
    if (p.pos.x + p.size > state.width) {
      p.pos.x = state.width - p.size;
      p.vel.x *= -0.6;
    }
    if (p.pos.y - p.size < 0) {
      p.pos.y = p.size;
      p.vel.y *= -0.6;
    }
    if (p.pos.y + p.size > state.height) {
      p.pos.y = state.height - p.size;
      p.vel.y *= -0.6;
    }

    // Coin collection
    for (const coin of state.coins) {
      if (coin.collected) continue;
      const dx = p.pos.x - coin.pos.x;
      const dy = p.pos.y - coin.pos.y;
      if (Math.sqrt(dx * dx + dy * dy) < p.size + 12) {
        coin.collected = true;
        state.hud.score += coin.value;
      }
    }
  }

  broadcastToClients({ type: 'state', payload: state });
}

// ── COMMAND DISPATCHER ───────────────────────────────────────

type CmdResult = { ok: boolean; data?: unknown; error?: string };

function dispatch(cmd: { action: string; params?: Record<string, unknown> }): CmdResult {
  const p = cmd.params ?? {};

  switch (cmd.action) {
    // ── NEW: load storyboard from approved package ──────────
    case 'load_storyboard': {
      const pkg = p.package as StoryboardPackage | undefined;
      if (!pkg) return { ok: false, error: 'Missing params.package (StoryboardPackage)' };
      if (!pkg.hitl?.readyForBuild) {
        return {
          ok: false,
          error:
            '⚑ HITL gate is CLOSED. A human must approve the storyboard ' +
            'before the game server will accept it. Call storyboard_director → approve_storyboard.',
        };
      }

      // Seed world from downstream briefs
      const wb = pkg.downstreamBriefs.worldBuilder;
      const gb = pkg.downstreamBriefs.gameBalance;

      state.width = wb.canvasSize.width;
      state.height = wb.canvasSize.height;
      state.gravity = gb.gravityPreset;
      state.friction = gb.frictionPreset;
      state.theme = {
        backgroundColor: wb.backgroundColor,
        lightingMood: pkg.panels[0]?.canvasHint.lightingMood ?? 'dark',
        gridVisible: wb.gridVisible,
        ambientParticles: pkg.panels[0]?.canvasHint.ambientParticles ?? false,
      };
      state.hud = {
        title: pkg.acts[0]?.title ?? 'Clawix Game',
        message: pkg.panels[0]?.emotionalTarget ?? 'Begin…',
        score: 0,
      };
      state.premise = pkg.premise;
      state.storyboardLoaded = true;
      state.currentPanelId = pkg.panels[0]?.id ?? null;

      // Auto-scatter coins from balance brief
      state.coins = [];
      for (let i = 0; i < gb.coinCount; i++) {
        state.coins.push({
          id: `coin_${i}`,
          pos: {
            x: 60 + Math.random() * (state.width - 120),
            y: 60 + Math.random() * (state.height - 120),
          },
          value: gb.coinValue,
          collected: false,
        });
      }

      console.log(`[game-server] Storyboard loaded: "${pkg.premise.slice(0, 60)}…"`);
      return {
        ok: true,
        data: {
          loaded: true,
          panelCount: pkg.panels.length,
          coinsScattered: gb.coinCount,
          theme: state.theme,
          hud: state.hud,
        },
      };
    }

    // ── NEW: advance to next storyboard panel ───────────────
    case 'advance_panel': {
      const pkg = p.package as StoryboardPackage | undefined;
      if (!pkg) return { ok: false, error: 'Missing params.package' };
      const currentIndex = pkg.panels.findIndex(
        (panel: ScenePanel) => panel.id === state.currentPanelId,
      );
      const next = pkg.panels[currentIndex + 1];
      if (!next) return { ok: true, data: { message: 'Already at final panel' } };

      state.currentPanelId = next.id;
      state.theme.backgroundColor = next.canvasHint.backgroundColor;
      state.theme.lightingMood = next.canvasHint.lightingMood;
      state.theme.ambientParticles = next.canvasHint.ambientParticles ?? false;
      state.hud.message = next.emotionalTarget;

      broadcastToClients({ type: 'state', payload: state });
      return { ok: true, data: { advancedTo: next.id, title: next.title } };
    }

    // ── EXISTING ACTIONS (unchanged from v1) ────────────────

    case 'start_game': {
      if (!state.storyboardLoaded) {
        return {
          ok: false,
          error:
            'Cannot start game: no approved storyboard loaded. ' +
            'Call storyboard_director → produce → approve → load_storyboard first.',
        };
      }
      state.running = true;
      state.tick = 0;
      state.hud.message = String(p.message ?? 'Game started!');
      return { ok: true, data: { running: true } };
    }

    case 'stop_game':
      state.running = false;
      return { ok: true, data: { running: false } };

    case 'set_world':
      if (p.gravity !== undefined) state.gravity = Number(p.gravity);
      if (p.friction !== undefined) state.friction = Number(p.friction);
      if (p.width !== undefined) state.width = Number(p.width);
      if (p.height !== undefined) state.height = Number(p.height);
      return { ok: true, data: { gravity: state.gravity, friction: state.friction } };

    case 'spawn_player': {
      const id = String(p.id ?? `player_${Date.now()}`);
      state.players[id] = {
        id,
        pos: { x: Number(p.x ?? state.width / 2), y: Number(p.y ?? state.height / 2) },
        vel: { x: 0, y: 0 },
        color: String(p.color ?? '#5C8EFF'),
        size: Number(p.size ?? 24),
        label: String(p.label ?? id),
        alive: true,
      };
      return { ok: true, data: { spawned: id } };
    }

    case 'move_player': {
      const pid = String(p.id ?? 'player_1');
      const pl = state.players[pid];
      if (!pl) return { ok: false, error: `No player: ${pid}` };
      pl.vel.x = Number(p.vx ?? 0);
      pl.vel.y = Number(p.vy ?? 0);
      return { ok: true, data: { id: pid, vel: pl.vel } };
    }

    case 'teleport_player': {
      const pid = String(p.id ?? 'player_1');
      const pl = state.players[pid];
      if (!pl) return { ok: false, error: `No player: ${pid}` };
      pl.pos.x = Number(p.x ?? pl.pos.x);
      pl.pos.y = Number(p.y ?? pl.pos.y);
      pl.vel = { x: 0, y: 0 };
      return { ok: true, data: { id: pid, pos: pl.pos } };
    }

    case 'set_player_color': {
      const pid = String(p.id ?? 'player_1');
      const pl = state.players[pid];
      if (!pl) return { ok: false, error: `No player: ${pid}` };
      pl.color = String(p.color ?? '#FFFFFF');
      return { ok: true, data: { id: pid, color: pl.color } };
    }

    case 'remove_player': {
      const pid = String(p.id ?? 'player_1');
      delete state.players[pid];
      return { ok: true, data: { removed: pid } };
    }

    case 'spawn_coins': {
      const count = Number(p.count ?? 5);
      const value = Number(p.value ?? 10);
      for (let i = 0; i < count; i++) {
        state.coins.push({
          id: `coin_${Date.now()}_${i}`,
          pos: {
            x: 60 + Math.random() * (state.width - 120),
            y: 60 + Math.random() * (state.height - 120),
          },
          value,
          collected: false,
        });
      }
      return { ok: true, data: { spawned: count } };
    }

    case 'clear_coins':
      state.coins = [];
      return { ok: true };

    case 'set_hud':
      if (p.title !== undefined) state.hud.title = String(p.title);
      if (p.message !== undefined) state.hud.message = String(p.message);
      if (p.score !== undefined) state.hud.score = Number(p.score);
      return { ok: true, data: state.hud };

    case 'reset':
      state.running = false;
      state.tick = 0;
      state.players = {};
      state.coins = [];
      state.storyboardLoaded = false;
      state.currentPanelId = null;
      state.premise = '';
      state.hud = { title: 'Clawix Game', message: 'Reset. Load a storyboard to begin.', score: 0 };
      state.gravity = 0;
      state.friction = 0.92;
      state.theme = {
        backgroundColor: '#0f0f14',
        lightingMood: 'dark',
        gridVisible: true,
        ambientParticles: false,
      };
      return { ok: true, data: 'reset complete' };

    case 'get_state':
      return { ok: true, data: state };

    default:
      return { ok: false, error: `Unknown action: ${cmd.action}` };
  }
}

// ── WEBSOCKET SERVERS ────────────────────────────────────────

const clientSockets = new Set<WebSocket>();

const clientServer = new WebSocketServer({ port: 9090 });
clientServer.on('connection', (ws) => {
  clientSockets.add(ws);
  console.log('[client] Browser connected');
  ws.send(JSON.stringify({ type: 'state', payload: state }));
  ws.on('close', () => clientSockets.delete(ws));
});

function broadcastToClients(msg: object) {
  const json = JSON.stringify(msg);
  for (const ws of clientSockets) {
    if (ws.readyState === WebSocket.OPEN) ws.send(json);
  }
}

const agentServer = new WebSocketServer({ port: 9091 });
agentServer.on('connection', (ws) => {
  console.log('[agent] Clawix agent connected');
  ws.on('message', (raw) => {
    try {
      const cmd = JSON.parse(raw.toString());
      console.log('[agent] ←', cmd.action);
      const result = dispatch(cmd);
      ws.send(JSON.stringify(result));
      broadcastToClients({ type: 'state', payload: state });
    } catch (e) {
      ws.send(JSON.stringify({ ok: false, error: String(e) }));
    }
  });
  ws.on('close', () => console.log('[agent] disconnected'));
});

setInterval(gameTick, TICK_MS);

console.log('🎮 Game server v2 (storyboard-aware)');
console.log('   Browser → ws://localhost:9090');
console.log('   Agent   → ws://localhost:9091');
console.log('   Flow: produce_storyboard → approve → load_storyboard → start_game');
