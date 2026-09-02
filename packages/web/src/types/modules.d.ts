// Type declarations for modules without TypeScript support

declare module 'three' {
  const THREE: unknown;
  export = THREE;
  export default THREE;
}

declare module 'vanta/dist/vanta.net.min' {
  interface VantaNetOptions {
    el: HTMLElement;
    THREE: unknown;
    mouseControls?: boolean;
    touchControls?: boolean;
    gyroControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    scale?: number;
    scaleMobile?: number;
    color?: number;
    backgroundColor?: number;
    points?: number;
    maxDistance?: number;
    spacing?: number;
    showDots?: boolean;
  }

  interface VantaEffect {
    destroy: () => void;
  }

  export default function (options: VantaNetOptions): VantaEffect;
}

declare module '@met4citizen/talkinghead' {
  export interface TalkingHeadOptions {
    ttsEndpoint?: string;
    lipsyncModules?: string[];
    cameraView?: 'full' | 'upper' | 'head';
    avatarMood?: string;
  }

  export interface ShowAvatarOptions {
    url: string;
    body?: 'M' | 'F';
    avatarMood?: string;
    lipsyncLang?: string;
  }

  export interface SpeakAudioOptions {
    audio: AudioBuffer;
    words?: string[];
    wtimes?: number[];
    wdurations?: number[];
    visemes?: string[];
    vtimes?: number[];
    vdurations?: number[];
  }

  export class TalkingHead {
    constructor(container: HTMLElement, options?: TalkingHeadOptions);
    showAvatar(avatar: ShowAvatarOptions, onprogress?: ((progress: number) => void) | null): Promise<void>;
    speakAudio(options: SpeakAudioOptions, opt?: unknown, onsubtitles?: unknown): void;
    start(): void;
    stop(): void;
    dispose(): void;
  }
}

declare module 'vanta/dist/vanta.topology.min' {
  interface VantaTopologyOptions {
    el: HTMLElement;
    p5: unknown;
    mouseControls?: boolean;
    touchControls?: boolean;
    gyroControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    scale?: number;
    scaleMobile?: number;
    color?: number;
    backgroundColor?: number;
  }

  interface VantaEffect {
    destroy: () => void;
  }

  export default function (options: VantaTopologyOptions): VantaEffect;
}
