# game-builder

Author board game definitions for the Light Church board game engine. The engine lives at
`packages/web/src/lib/board-game/` and the UI at `packages/web/src/app/(dashboard)/game/`.

## How it works

The engine is data-driven: you write a `*.game.json` file following the schema below. The
TypeScript code never changes — only the JSON file changes between games.

## Game Definition Schema

```jsonc
{
  "id": "unique-kebab-id",
  "title": "Human-readable game title",
  "subtitle": "Optional tagline",
  "description": "Optional paragraph shown on start screen",
  "minPlayers": 2,
  "maxPlayers": 4,
  "dice": { "count": 1, "sides": 6 },
  "resources": ["grain", "kindness"],   // optional named counters per player
  "winCondition": {
    // ONE of:
    "type": "reachSpace", "spaceId": 23      // first to land on/pass this space
    // "type": "collectResource", "resource": "grain", "amount": 20
  },
  "board": {
    "path": [0, 1, 2, ...],   // ordered array of space ids forming the board path
    "spaces": [
      {
        "id": 0,
        "label": "Start",
        "type": "start",      // start | finish | event | challenge | blessing | safe
        "cardId": "card_id"   // optional — triggers a card draw when landed on
      }
    ]
  },
  "cards": [
    {
      "id": "card_id",
      "title": "Card Name",
      "text": "What happens — written in second person.",
      "flavour": "Optional scripture or quote",
      "effect": {
        "kind": "resource",   // resource | move | skip | none
        "resource": "grain",  // for kind=resource
        "delta": 3,           // positive = gain, negative = lose
        "spaces": 2           // for kind=move (positive=forward, negative=back)
      }
    }
  ]
}
```

## Space types and their visual styles

| type      | color   | use when                               |
|-----------|---------|----------------------------------------|
| start     | green   | starting position                      |
| finish    | amber   | winning space                          |
| event     | blue    | neutral card draw                      |
| challenge | red     | obstacle — skip turn or lose resources |
| blessing  | violet  | positive reward                        |
| safe      | grey    | no effect — just movement              |

## Writing a new game

1. Create `packages/web/src/app/(dashboard)/game/<id>.game.json` following the schema above.
2. In `packages/web/src/app/(dashboard)/game/page.tsx`, change the import line:
   `import ruthGame from './ruth.game.json'` → `import myGame from './<id>.game.json'`
3. That's it. No engine changes needed.

## Design tips

- Aim for 20–30 spaces on the path. Under 16 feels short; over 40 is tedious.
- 40–60% of spaces should be `safe` or `event` (low stakes). Reserve 10–15% for `challenge`.
- Write card text in second person ("You do X").
- Include a short scripture or flavour quote on 30–50% of cards.
- Skip-turn cards (`kind: skip`) should be rare — max 2–3 in the whole deck.
- Name every `cardId` with a meaningful slug that matches the space narrative.

## Example: minimal 10-space game skeleton

```json
{
  "id": "my-game",
  "title": "My Game",
  "minPlayers": 2, "maxPlayers": 4,
  "dice": { "count": 1, "sides": 6 },
  "resources": ["faith"],
  "winCondition": { "type": "reachSpace", "spaceId": 9 },
  "board": {
    "path": [0,1,2,3,4,5,6,7,8,9],
    "spaces": [
      { "id": 0, "label": "Start",  "type": "start" },
      { "id": 1, "label": "Step 1", "type": "safe" },
      { "id": 2, "label": "Trial",  "type": "challenge", "cardId": "trial1" },
      { "id": 9, "label": "Finish", "type": "finish" }
    ]
  },
  "cards": [
    {
      "id": "trial1",
      "title": "A Test of Faith",
      "text": "You face an unexpected trial. Lose 1 faith.",
      "effect": { "kind": "resource", "resource": "faith", "delta": -1 }
    }
  ]
}
```
