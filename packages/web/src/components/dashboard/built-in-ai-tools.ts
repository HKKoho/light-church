import {
  ClipboardCheck,
  ClipboardList,
  Gamepad2,
  QrCode,
  Tent,
  type LucideIcon,
} from 'lucide-react';

/**
 * Phase 1 AI Tools that are built into Light Church itself (a dashboard page),
 * listed alongside the church-uploaded tools in `<data>/AITools/`.
 * Labels live in each consumer's i18n messages under `builtInTools[key]`.
 */
export interface BuiltInAiTool {
  readonly key: 'gameBuilder' | 'missionCamp' | 'rollCall' | 'aiSurvey' | 'qrRegistration';
  readonly href: string;
  readonly icon: LucideIcon;
}

export const BUILT_IN_AI_TOOLS: readonly BuiltInAiTool[] = [
  { key: 'gameBuilder', href: '/game-studio', icon: Gamepad2 },
  { key: 'missionCamp', href: '/activities', icon: Tent },
  { key: 'rollCall', href: '/roll-call', icon: ClipboardCheck },
  { key: 'aiSurvey', href: '/ai-survey', icon: ClipboardList },
  { key: 'qrRegistration', href: '/qr-registration', icon: QrCode },
];
