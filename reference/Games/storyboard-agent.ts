/**
 * STORYBOARD-DIRECTOR · Visual Pre-Production Agent
 * ─────────────────────────────────────────────────
 * Phase 1 of the Clawix × TypeScript game stack.
 * Produces a typed storyboard package that GAME-MASTER
 * must approve (HITL gate) before any game-server action runs.
 *
 * All types are shared with game-server.ts via StoryboardPackage.
 * Import this file wherever you need the storyboard schema.
 */

// ── SHARED TYPES ────────────────────────────────────────────

export interface PlayerPersona {
  name: string;
  age: number;
  location: string;
  background: string;
  privateStruggle: string;
  publicFace: string;
  whyTheyPlay: string;
  whatTheyNeedFromGame: string;
  whatBreaksImmersion: string;
}

export interface EmotionalBeat {
  stage:
    | 'opening'
    | 'inciting'
    | 'rising'
    | 'dark_night'
    | 'turn'
    | 'climax'
    | 'resolution'
    | 'carry_forward';
  playerEmotion: string;
  gameMechanic: string;
  sceneType: 'interior' | 'exterior' | 'cutscene' | 'puzzle' | 'dialogue' | 'action';
}

export interface ScenePanel {
  id: string; // e.g. "SB-001"
  act: string;
  title: string;
  setting: {
    location: string;
    timeOfDay: string;
    atmosphere: string;
    sounds: string;
    culturalMarkers: string;
  };
  charactersPresent: string[];
  playerAction: string;
  emotionalTarget: string;
  dialogueNotes: string;
  canvasHint: {
    // direct hint to game-server renderer
    backgroundColor: string; // hex
    ambientParticles?: boolean;
    lightingMood: 'bright' | 'dim' | 'dark' | 'golden' | 'cold';
  };
  linksToNext: string;
}

export interface ActDefinition {
  number: number;
  title: string;
  emotionalPurpose: string;
  openingScene: string;
  closingScene: string;
  keyTension: string;
  playerAgency: string;
  panelIds: string[];
}

export interface DownstreamBriefs {
  worldBuilder: {
    priorityPanelIds: string[];
    visualTone: string;
    canvasSize: { width: number; height: number };
    backgroundColor: string;
    gridVisible: boolean;
  };
  narrativeEngine: {
    toneOfVoice: string;
    dialogueDensity: 'heavy' | 'medium' | 'light';
    branchingPhilosophy: string;
  };
  gameBalance: {
    difficultyPhilosophy: string;
    gravityPreset: number;
    frictionPreset: number;
    coinCount: number;
    coinValue: number;
  };
}

export interface HITLChecklist {
  premiseReviewed: boolean;
  personaValidated: boolean;
  emotionalArcFelt: boolean;
  panelsVisualised: boolean;
  downstreamBriefsComplete: boolean;
  ethicalBoundariesRespected: boolean;
  readyForBuild: boolean; // GAME-MASTER checks this before any dispatch()
}

export interface StoryboardPackage {
  version: string;
  createdAt: string;
  premise: string; // Section 1 — 150-200 word emotional truth
  persona: PlayerPersona; // Section 2
  emotionalArc: EmotionalBeat[]; // Section 3
  acts: ActDefinition[]; // Section 4
  panels: ScenePanel[]; // Section 5 — min 4 panels for a short game
  downstreamBriefs: DownstreamBriefs; // Section 6
  hitl: HITLChecklist; // Section 7 — gate
}

// ── BRIEF INPUT ─────────────────────────────────────────────

export interface GameBrief {
  emotionalTruth: string;
  genre: 'puzzle' | 'platformer' | 'narrative' | 'arena' | 'collector';
  playerPersonaHint: string;
  culturalSetting: string;
  ethicalBoundaries: string[];
  approximatePlayMinutes: number;
}

// ── STORYBOARD DIRECTOR ─────────────────────────────────────

export class StoryboardDirector {
  /**
   * Produce a full storyboard package from a game brief.
   * In production, this calls the Clawix LLM API.
   * The returned package must pass hitl.readyForBuild === true
   * before GAME-MASTER sends any command to game-server.ts.
   */
  async produce(brief: GameBrief): Promise<StoryboardPackage> {
    const panels = this.buildPanels(brief);
    const acts = this.buildActs(brief, panels);
    const persona = this.buildPersona(brief);
    const arc = this.buildEmotionalArc(brief);
    const briefs = this.buildDownstreamBriefs(brief, panels);

    const pkg: StoryboardPackage = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      premise: this.writePremise(brief),
      persona,
      emotionalArc: arc,
      acts,
      panels,
      downstreamBriefs: briefs,
      hitl: {
        premiseReviewed: false,
        personaValidated: false,
        emotionalArcFelt: false,
        panelsVisualised: false,
        downstreamBriefsComplete: true,
        ethicalBoundariesRespected: true,
        readyForBuild: false, // always starts false — human must flip
      },
    };
    return pkg;
  }

  /** Human reviewer calls this after inspecting the package */
  approve(pkg: StoryboardPackage, reviewerNotes: string): StoryboardPackage {
    console.log(`[STORYBOARD-DIRECTOR] Reviewer notes: ${reviewerNotes}`);
    return {
      ...pkg,
      hitl: {
        premiseReviewed: true,
        personaValidated: true,
        emotionalArcFelt: true,
        panelsVisualised: true,
        downstreamBriefsComplete: true,
        ethicalBoundariesRespected: true,
        readyForBuild: true, // ← HITL gate opens
      },
    };
  }

  /** Validate gate before GAME-MASTER may dispatch */
  assertApproved(pkg: StoryboardPackage): void {
    if (!pkg.hitl.readyForBuild) {
      throw new Error(
        '[STORYBOARD-DIRECTOR] HITL gate is closed. ' +
          'A human must call approve() before the game can be built.',
      );
    }
  }

  // ── PRIVATE BUILDERS ──────────────────────────────────────

  private writePremise(brief: GameBrief): string {
    return (
      `This is a ${brief.genre} game about: ${brief.emotionalTruth}. ` +
      `Set in ${brief.culturalSetting}, it is built for ${brief.playerPersonaHint}. ` +
      `The player should carry something real with them when they put it down — ` +
      `not a high score, but a feeling.`
    );
  }

  private buildPersona(brief: GameBrief): PlayerPersona {
    return {
      name: 'Player',
      age: 0,
      location: brief.culturalSetting,
      background: brief.playerPersonaHint,
      privateStruggle: 'To be defined by the human reviewer',
      publicFace: 'To be defined by the human reviewer',
      whyTheyPlay: brief.emotionalTruth,
      whatTheyNeedFromGame: 'Meaning through play',
      whatBreaksImmersion: brief.ethicalBoundaries.join(', '),
    };
  }

  private buildEmotionalArc(brief: GameBrief): EmotionalBeat[] {
    const sceneTypes: EmotionalBeat['sceneType'][] = [
      'exterior',
      'dialogue',
      'action',
      'puzzle',
      'action',
      'action',
      'cutscene',
      'interior',
    ];
    const stages: EmotionalBeat['stage'][] = [
      'opening',
      'inciting',
      'rising',
      'dark_night',
      'turn',
      'climax',
      'resolution',
      'carry_forward',
    ];
    const emotions = [
      'curiosity',
      'surprise',
      'tension',
      'despair',
      'determination',
      'intensity',
      'relief',
      'meaning',
    ];
    return stages.map((stage, i) => ({
      stage,
      playerEmotion: emotions[i],
      gameMechanic: `Game mechanic for ${stage} — define in narrative brief`,
      sceneType: sceneTypes[i],
    }));
  }

  private buildPanels(brief: GameBrief): ScenePanel[] {
    const count = Math.max(4, Math.min(8, Math.round(brief.approximatePlayMinutes / 3)));
    return Array.from({ length: count }, (_, i) => ({
      id: `SB-${String(i + 1).padStart(3, '0')}`,
      act: i < count / 2 ? 'Act 1' : 'Act 2',
      title: `Scene ${i + 1} — define in storyboard review`,
      setting: {
        location: brief.culturalSetting,
        timeOfDay: i === 0 ? 'dawn' : i === count - 1 ? 'dusk' : 'midday',
        atmosphere: brief.emotionalTruth.split(' ').slice(0, 4).join(' '),
        sounds: 'To be defined',
        culturalMarkers: 'To be defined',
      },
      charactersPresent: ['Player'],
      playerAction: `Action for scene ${i + 1}`,
      emotionalTarget: `Emotion for scene ${i + 1}`,
      dialogueNotes: '',
      canvasHint: {
        backgroundColor: i === 0 ? '#0a0a14' : i === count - 1 ? '#14080a' : '#0f0f18',
        lightingMood: i < 2 ? 'dim' : i === count - 1 ? 'golden' : 'dark',
        ambientParticles: brief.genre === 'narrative',
      },
      linksToNext: i < count - 1 ? `SB-${String(i + 2).padStart(3, '0')}` : 'END',
    }));
  }

  private buildActs(brief: GameBrief, panels: ScenePanel[]): ActDefinition[] {
    const mid = Math.floor(panels.length / 2);
    return [
      {
        number: 1,
        title: 'The World Before',
        emotionalPurpose: "Establish the world and the player's place in it",
        openingScene: panels[0]?.title ?? '',
        closingScene: panels[mid - 1]?.title ?? '',
        keyTension: brief.emotionalTruth,
        playerAgency: 'Exploration and discovery',
        panelIds: panels.slice(0, mid).map((p) => p.id),
      },
      {
        number: 2,
        title: 'The World Changed',
        emotionalPurpose: 'Force the player to act and discover what they are made of',
        openingScene: panels[mid]?.title ?? '',
        closingScene: panels[panels.length - 1]?.title ?? '',
        keyTension: 'The cost of the choice',
        playerAgency: 'Commitment and consequence',
        panelIds: panels.slice(mid).map((p) => p.id),
      },
    ];
  }

  private buildDownstreamBriefs(brief: GameBrief, panels: ScenePanel[]): DownstreamBriefs {
    const physicsMap: Record<string, { gravity: number; friction: number }> = {
      platformer: { gravity: 0.45, friction: 0.88 },
      arena: { gravity: 0, friction: 0.92 },
      collector: { gravity: 0, friction: 0.95 },
      puzzle: { gravity: 0, friction: 1.0 },
      narrative: { gravity: 0, friction: 1.0 },
    };
    const physics = physicsMap[brief.genre] ?? physicsMap.arena;
    return {
      worldBuilder: {
        priorityPanelIds: panels.slice(0, 2).map((p) => p.id),
        visualTone: `${brief.genre} — ${brief.emotionalTruth.split(' ').slice(0, 5).join(' ')}`,
        canvasSize: { width: 800, height: 500 },
        backgroundColor: panels[0]?.canvasHint.backgroundColor ?? '#0f0f14',
        gridVisible: brief.genre !== 'narrative',
      },
      narrativeEngine: {
        toneOfVoice: brief.genre === 'narrative' ? 'poetic' : 'terse',
        dialogueDensity: brief.genre === 'narrative' ? 'heavy' : 'light',
        branchingPhilosophy: 'Every meaningful choice has a visible consequence',
      },
      gameBalance: {
        difficultyPhilosophy: `Difficulty should mirror emotional tension, not just skill`,
        gravityPreset: physics.gravity,
        frictionPreset: physics.friction,
        coinCount: Math.round(brief.approximatePlayMinutes * 1.5),
        coinValue: brief.genre === 'collector' ? 25 : 10,
      },
    };
  }
}

// ── CONVENIENCE EXPORT ───────────────────────────────────────

export const storyboardDirector = new StoryboardDirector();
