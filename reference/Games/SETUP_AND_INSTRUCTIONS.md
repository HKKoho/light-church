# Clawix × TypeScript Game v2 — Storyboard-First

## Setup & Agent Instructions

---

## FILE STRUCTURE

```
clawix-ts-game-v2/
├── storyboard/
│   └── storyboard-agent.ts       ← Types + StoryboardDirector class (Phase 1)
├── skill/
│   ├── storyboard-skill.ts       ← Clawix skill: produce / approve / assert HITL
│   └── game-controller-skill.ts  ← Clawix skill: game commands + load_storyboard
├── server/
│   └── game-server.ts            ← WebSocket game engine (storyboard-aware)
└── client/
    └── index.html                ← Canvas renderer (reads theme from state)
```

All six files are pure TypeScript (or HTML). No YAML, no GDScript, no second language.

---

## THE STORYBOARD GATE

The game server **refuses to run** `start_game` unless an approved storyboard
has been loaded. The enforcement chain is:

```
storyboard_director.produce_storyboard
  → hitl.readyForBuild = false  (gate CLOSED)

Human calls storyboard_director.approve_storyboard
  → hitl.readyForBuild = true   (gate OPEN)

game_controller.load_storyboard (passes package)
  → game-server reads package, seeds world, coins, theme

game_controller.start_game
  → now allowed — game loop begins
```

Trying to call `start_game` before this sequence returns:

```json
{ "ok": false, "error": "Cannot start game: no approved storyboard loaded." }
```

---

## SETUP (6 steps)

### Step 1 — Install dependencies

```bash
npm install ws typescript
npm install --save-dev @types/ws ts-node
```

### Step 2 — Start the game server

```bash
npx ts-node server/game-server.ts
```

Output:

```
🎮 Game server v2 (storyboard-aware)
   Browser → ws://localhost:9090
   Agent   → ws://localhost:9091
   Flow: produce_storyboard → approve → load_storyboard → start_game
```

### Step 3 — Open the browser renderer

Open `client/index.html`. The canvas shows the storyboard gate overlay until
a storyboard is loaded. The premise text appears at the bottom once loaded.

### Step 4 — Register skills in Clawix

In **Dashboard → Skills → Create Skill**, register two skills:

- `storyboard_director` — using the YAML block at the bottom of `storyboard-skill.ts`
- `game_controller` — using the YAML block at the bottom of `game-controller-skill.ts`

### Step 5 — Create the GAME-MASTER agent

In **Agents → Create Agent**:

```yaml
name: GAME-MASTER
model: claude-sonnet-4-6
skills:
  - storyboard_director
  - game_controller
system_prompt: |
  You are GAME-MASTER, the primary orchestrator of the Clawix × TypeScript game stack.

  You follow a strict sequence. Never skip a phase.

  PHASE 1 — STORYBOARD (always first)
  Call storyboard_director with action=produce_storyboard and a GameBrief.
  Present the storyboard package to the human for review.
  Wait for the human to say "approve" or give reviewer notes.
  Then call storyboard_director with action=approve_storyboard.
  The HITL gate is now open.

  PHASE 2 — LOAD
  Call game_controller with action=load_storyboard, passing the approved package.
  The game server seeds world physics, coin count, canvas theme, and HUD from
  the storyboard's downstreamBriefs automatically.

  PHASE 3 — BUILD
  Spawn players using storyboard-grounded names, colors, and starting positions.
  The worldBuilder brief gives you canvas size, background, and visual tone.
  The gameBalance brief gives you gravity, friction, coin count, coin value.

  PHASE 4 — RUN
  Call game_controller with action=start_game.
  Narrate what is happening. Advance panels using action=advance_panel when
  a scene transition is appropriate.

  GAME BRIEF FIELDS:
    emotionalTruth      — one sentence: what should the player feel at the end?
    genre               — platformer | arena | collector | puzzle | narrative
    playerPersonaHint   — who is this game for?
    culturalSetting     — where / when is this world?
    ethicalBoundaries   — what will we never do?
    approximatePlayMinutes — e.g. 5

  AVAILABLE GAME ACTIONS (after storyboard approved):
    load_storyboard, advance_panel,
    start_game, stop_game, set_world,
    spawn_player, move_player, teleport_player,
    set_player_color, remove_player,
    spawn_coins, clear_coins,
    set_hud, reset, get_state
```

### Step 6 — Run a complete session

Try this conversation with GAME-MASTER:

```
Build a short collector game about a wanderer searching for light
in a dark city. For a player who feels lost but keeps going.
5 minutes long. No violence, no countdown pressure.
```

GAME-MASTER will:

1. Call `produce_storyboard` with a GameBrief derived from your description
2. Present the storyboard (premise, persona, emotional arc, panels, briefs)
3. Wait for you to say "looks good, approve it"
4. Call `approve_storyboard`
5. Call `load_storyboard` → game world seeds from the storyboard
6. Spawn a player grounded in the persona
7. Call `start_game` → game loop begins, canvas theme reflects the story

---

## WHAT CHANGED FROM v1

|                  | v1 (original zip)            | v2 (this pack)                                     |
| ---------------- | ---------------------------- | -------------------------------------------------- |
| Storyboard       | None                         | `storyboard-agent.ts` — typed classes              |
| Storyboard skill | None                         | `storyboard-skill.ts` — produce / approve / assert |
| Game skill       | `game_controller_skill.yaml` | `game-controller-skill.ts` — TypeScript            |
| Game server      | v1 game-server.ts            | Imports storyboard types, enforces HITL gate       |
| `start_game`     | Always works                 | Blocked unless storyboard loaded                   |
| Canvas theme     | Fixed dark                   | Driven by `StoryboardPackage.panels[n].canvasHint` |
| File format      | Mixed (YAML + TS + HTML)     | Pure TypeScript + HTML                             |

---

## EXTENDING (agent-authored)

Because every file is TypeScript, GAME-MASTER can extend the game directly:

```
Here is storyboard-agent.ts and game-server.ts.
Add a ScenePanel type called 'boss_encounter' that spawns a large
red enemy that moves toward the nearest player at half their speed.
Give me the updated dispatch() case and the new StoryboardPackage field.
```

The agent writes TypeScript. You paste it in. The same language runs
in the storyboard, the skill, and the game loop — one stack, one author.

---

_Clawix × TypeScript Game v2 · AIbyML · clawix.aibyml.com_
