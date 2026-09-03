---
version: 1.0.0
createdAt: 2026-06-22
genre: collector
approximatePlayMinutes: 5
readyForBuild: true
---

# Ruth in the Field of Boaz

## 1. Premise

This is a collector game about Ruth's faithfulness and costly belonging (Ruth 1–2). Set on the harvest roads between Moab and Bethlehem, it is built for a youth-group player who has been taught that loyalty is sentimental — and walks away knowing it is sacrificial. The player moves through four scenes as Ruth: choosing to stay with Naomi, arriving as a stranger, gleaning what the harvesters leave behind, and receiving a place she did not earn. The game ends not with a trophy but with a meal shared between strangers who chose each other.

## 2. Persona

| Field                  | Description                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `whyTheyPlay`          | To feel what it means to stay when leaving would have been easier                             |
| `whatTheyNeedFromGame` | The weight of a choice that costs something real                                              |
| `whatBreaksImmersion`  | Violence, mockery of Naomi's grief, countdown pressure, a forced "correct" theological answer |
| `background`           | Youth group (ages 13–17), familiar with the story's surface but not its emotional depth       |
| `location`             | Ancient Near East — Moabite road and Bethlehem barley fields                                  |

## 3. Emotional arc

| Stage         | Player emotion   | Scene type |
| ------------- | ---------------- | ---------- |
| opening       | warmth-and-dread | exterior   |
| inciting      | grief            | dialogue   |
| rising        | determination    | exterior   |
| dark_night    | exposure         | action     |
| turn          | recognition      | dialogue   |
| climax        | quiet-effort     | action     |
| resolution    | belonging        | interior   |
| carry_forward | still-joy        | cutscene   |

## 4. Acts

**Act 1 — The World Before** (SB-001, SB-002)

- emotionalPurpose: Establish the cost of Ruth's choice before any reward appears
- openingScene: "The Vow on the Road"
- closingScene: "Arriving in Bethlehem"
- keyTension: Ruth is a foreigner choosing a people who have not chosen her yet
- playerAgency: Forward movement — there is no turning back

**Act 2 — The World Changed** (SB-003, SB-004)

- emotionalPurpose: Let the player feel what being seen with kindness does after being unseen
- openingScene: "The Field of Boaz"
- closingScene: "The Evening Meal"
- keyTension: Receiving what you cannot earn
- playerAgency: Gleaning — gathering what remains, not claiming what was never offered

## 5. Scene panels

```
id: SB-001
act: Act 1
title: The Vow on the Road
setting:
  location: Moabite road, edge of the plateau
  timeOfDay: dawn
  atmosphere: dry, still, the moment before a long journey begins
  sounds: wind across stones, distant birds
  culturalMarkers: dusty road, sandstone outcrops, two figures at a crossroads
charactersPresent: [Ruth, Naomi]
playerAction: Begin moving forward — the road only goes one way now
emotionalTarget: The weight of a promise that costs everything
dialogueNotes: '"Where you go, I will go. Where you die, I will die." (Ruth 1:16–17)'
canvasHint:
  backgroundColor: '#120a0a'
  lightingMood: dim
  ambientParticles: false
linksToNext: SB-002
```

```
id: SB-002
act: Act 1
title: Arriving in Bethlehem
setting:
  location: Town gate, Bethlehem
  timeOfDay: midday
  atmosphere: murmuring townswomen, curious stares, the grief of a homecoming that isn't joyful
  sounds: market noise, women's voices, children running
  culturalMarkers: stone gate, market stalls, the familiar become strange
charactersPresent: [Ruth, Naomi, Townswomen]
playerAction: Collect what little is left — overlooked grain at the margins
emotionalTarget: The sting of being seen as foreign, and the refusal to be ashamed of it
dialogueNotes: '"Is this Naomi?" The town barely recognised her.'
canvasHint:
  backgroundColor: '#0f0a06'
  lightingMood: dark
  ambientParticles: false
linksToNext: SB-003
```

```
id: SB-003
act: Act 2
title: The Field of Boaz
setting:
  location: Barley field outside Bethlehem
  timeOfDay: afternoon
  atmosphere: gold light, harvesters singing, the field full but the edges open
  sounds: grain rustling, distant singing, footsteps in dry earth
  culturalMarkers: sheaves tied and standing, workers in rows, a foreman watching
charactersPresent: [Ruth, Boaz's workers, Boaz]
playerAction: Glean every sheaf the harvesters left behind — collect what was given without asking
emotionalTarget: The slow surprise of being noticed and protected without having earned it
dialogueNotes: '"Do not go to glean in another field, but keep close to my young women." (Ruth 2:8)'
canvasHint:
  backgroundColor: '#1a0f04'
  lightingMood: golden
  ambientParticles: true
linksToNext: SB-004
```

```
id: SB-004
act: Act 2
title: The Evening Meal
setting:
  location: Threshing floor edge, Bethlehem
  timeOfDay: dusk
  atmosphere: fire and lamplight, the day's work done, bread and roasted grain on a shared cloth
  sounds: low voices, fire crackling, evening birds
  culturalMarkers: threshing floor, oil lamps, the shared meal that signals belonging
charactersPresent: [Ruth, Boaz, other workers]
playerAction: Bring the last of the gleaned grain home — the harvest is complete
emotionalTarget: You belong somewhere you did not expect to belong
dialogueNotes: '"She ate until she was satisfied, and she had some left over." (Ruth 2:14)'
canvasHint:
  backgroundColor: '#14100a'
  lightingMood: golden
  ambientParticles: true
linksToNext: END
```

## 6. Downstream briefs

```
worldBuilder:
  priorityPanelIds: [SB-001, SB-002]
  visualTone: "collector — Ruth's faithfulness at harvest, warm amber light"
  canvasSize: { width: 800, height: 500 }
  backgroundColor: '#120a0a'
  gridVisible: true

narrativeEngine:
  toneOfVoice: poetic
  dialogueDensity: medium
  branchingPhilosophy: "Every meaningful choice has a visible consequence"

gameBalance:
  difficultyPhilosophy: "Difficulty should mirror emotional tension, not just skill"
  gravityPreset: 0
  frictionPreset: 0.95
  coinCount: 8
  coinValue: 25
```

## 7. HITL checklist

```
premiseReviewed: true
personaValidated: true
emotionalArcFelt: true
panelsVisualised: true
downstreamBriefsComplete: true
ethicalBoundariesRespected: true
readyForBuild: true
```

## Reviewer notes

Approved 2026-06-22. "The emotional arc is right — especially the 'belonging without earning' framing for SB-004. Keep it."
