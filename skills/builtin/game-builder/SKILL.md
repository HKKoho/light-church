---
name: game-builder
description: Build short, Scripture-rooted narrative games (parables, Bible stories, discipleship journeys) as self-contained Projector items. Use when asked to build any game, interactive story, or VBS/youth-ministry play experience — enforces a storyboard-first human-approval gate before any code is written.
version: 1.0.0
author: light-church
tags: [games, projector, storyboard, discipleship, youth-ministry]
---

# Game Builder

Games built with this skill appear instantly on the user's **Projector** page, exactly like calculators or converters — a single self-contained HTML file with an embedded canvas game loop. There is no live game server and no network call of any kind, in or out.

**Sandbox constraints:** the finished game runs in a sandboxed iframe with NO network access — it CANNOT use `fetch()`, `WebSocket`, or any API call. This is a deliberate adaptation of the storyboard-first architecture in `/reference/Games` (which assumed a standalone dual-WebSocket game server on fixed ports) to Clawix's hardened, networkless agent sandbox. Everything the game needs — art direction, scene order, physics, win condition — is baked into the HTML at build time from the approved storyboard.

**Save to Workspace:** the game CAN save text back to the workspace via the postMessage bridge (see `references/starter-template.html`) — useful for a "completion note" a leader can print, or exporting the storyboard as a lesson companion.

---

## The four phases — never skip one

1. **STORYBOARD** — you write the story design as a markdown file. Nothing is built yet.
2. **APPROVE** — a human reads it and explicitly approves it. This is the HITL gate.
3. **BUILD** — only after approval, you (the coordinator) spawn coder sub-agents to build the HTML game.
4. **DELIVER** — tell the user where to find it.

Never spawn a build before the storyboard's `readyForBuild` flag is `true`. A good story poorly built disappoints; a bad story well built is worse. The gate exists so a human discerns the spiritual and emotional content before any of it ships.

---

## Phase 1 — STORYBOARD (you do this directly, no spawn)

Gather a brief from the conversation: the emotional/spiritual truth or Bible passage (e.g. "the prodigal son's road home", "David facing Goliath with nothing but trust", "the Good Samaritan's costly compassion"), a genre, the audience (age range, VBS class, youth group, family devotion), and roughly how many minutes of play.

**Genres** (no combat/arena genre — Light Church games are non-violent by policy):

- `puzzle` — gravity 0, friction 1.0
- `platformer` — gravity 0.45, friction 0.88
- `narrative` — gravity 0, friction 1.0, dialogue-heavy
- `collector` — gravity 0, friction 0.95

Read `references/storyboard-schema.md` for the full field list, a worked Good-Samaritan example, and the panel-count formula. Write the storyboard to `/workspace/games/<slug>/storyboard.md` with frontmatter `readyForBuild: false`.

**Content boundaries — apply to every storyboard, no exceptions:**

- No violence or combat against any character; conflict is resolved through courage, compassion, obedience, or trust — never through harming another character.
- No fear-based or manipulative mechanics (jump-scares, shame mechanics, punishing the player for "wrong" answers about faith).
- Theologically sound — if a passage's meaning is contested or unclear, say so in the storyboard's premise and ask the human reviewer rather than guessing. Cross-check tone against the `gospel-mission` skill when in doubt.
- Age-appropriate for the stated audience.
- Every character — including antagonists — is drawn with dignity. No mockery.

## Phase 2 — APPROVE (you do this directly, no spawn)

Show the human the storyboard's premise, persona, and panel list. Ask plainly: _"Does this storyboard reflect the story and feel you want? Reply with 'approved' (and any notes) to open the build gate, or tell me what to change."_

On approval: edit `storyboard.md` frontmatter to `readyForBuild: true`, and append the reviewer's notes and today's date under a `## Reviewer notes` heading. **Do not proceed to Phase 3 while `readyForBuild` is false.**

## Phase 3 — BUILD (spawn sub-agents — only after the gate is open)

Split into exactly 4 sequential spawns. Run all automatically once the gate is open — never ask permission between these steps (permission was already given in Phase 2).

**Before spawning:** replace every `<slug>` in the prompts below with your game's actual slug — the same slug you used when writing the storyboard in Phase 1.

**Spawn #1 (HTML + CSS):**

```
spawn(agent_name="coder", prompt="read_file(\"/skills/builtin/game-builder/references/coder-guide.md\"). Follow the 'Spawn #1 — HTML + CSS scaffold' instructions for the game at slug '<slug>'.")
```

**After spawn #1 returns — verify before proceeding:**
Do `read_file("/workspace/projector/<slug>/index.html")`. Confirm: (a) the file ends with `</html>` and (b) it contains exactly the line `// JAVASCRIPT GOES HERE`. If either check fails, re-run spawn #1 before proceeding to spawn #2.

**Spawn #2 (JavaScript):**

```
spawn(agent_name="coder", prompt="read_file(\"/skills/builtin/game-builder/references/coder-guide.md\"). Follow the 'Spawn #2 — JavaScript' instructions for the game at slug '<slug>'.")
```

**Spawn #3 (Review):**

```
spawn(agent_name="coder", prompt="read_file(\"/skills/builtin/game-builder/references/coder-guide.md\"). Follow the 'Spawn #3 — Review and fix' instructions for the game at slug '<slug>'.")
```

**Spawn #4 (Console):**

```
spawn(agent_name="coder", prompt="read_file(\"/skills/builtin/game-builder/references/coder-guide.md\"). Follow the 'Spawn #4 — Console' instructions for the game at slug '<slug>'.")
```

**Then report:** "Your game **<name>** is ready! It tells the story of <premise in one sentence>. Find it on your Projector page — open `index.html` to play, or `console.html` for the facilitator view with live scene tracking. The storyboard at `/workspace/games/<slug>/storyboard.md` is yours to reuse for a lesson or devotional."

**For modifications:** spawn one coder: `read_file("/skills/builtin/game-builder/references/coder-guide.md")`. Backup `index.html` to `index.backup.html`, then `edit_file` to apply the change. Verify after. Re-open the HITL gate (go back to Phase 2) first if the change alters the story itself rather than a visual or balance tweak.

## Phase 4 — DELIVER

Point the user to the Projector page and to the storyboard companion file. Nothing further is owed — the artifact is static and self-contained.

---

## Coder sub-agents

Coder sub-agents spawned in Phase 3 receive their full instructions from `references/coder-guide.md`. Do not direct coders to read this file.
