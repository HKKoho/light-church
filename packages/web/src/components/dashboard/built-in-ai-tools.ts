import {
  Building2,
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
  readonly key:
    | 'gameBuilder'
    | 'missionCamp'
    | 'rollCall'
    | 'aiSurvey'
    | 'qrRegistration'
    | 'venueRental';
  readonly href: string;
  readonly icon: LucideIcon;
}

export const BUILT_IN_AI_TOOLS: readonly BuiltInAiTool[] = [
  { key: 'rollCall', href: '/roll-call', icon: ClipboardCheck },
  { key: 'missionCamp', href: '/activities', icon: Tent },
  { key: 'gameBuilder', href: '/game-studio', icon: Gamepad2 },
  { key: 'aiSurvey', href: '/ai-survey', icon: ClipboardList },
  { key: 'qrRegistration', href: '/qr-registration', icon: QrCode },
  { key: 'venueRental', href: '/venue-rental', icon: Building2 },
];

// Uploaded tools (`<data>/AITools/<name>/`) listed ahead of the built-ins, in
// this order; every other uploaded tool follows the built-ins.
const LEADING_UPLOADED_TOOLS: readonly string[] = ['sunday-service-bulletin', 'finance-pipeline'];

/** Splits uploaded tools into those shown before the built-ins and the rest. */
export function splitUploadedTools<T extends { readonly name: string }>(
  tools: readonly T[],
): { readonly leading: readonly T[]; readonly rest: readonly T[] } {
  return {
    leading: LEADING_UPLOADED_TOOLS.flatMap((name) => tools.filter((tool) => tool.name === name)),
    rest: tools.filter((tool) => !LEADING_UPLOADED_TOOLS.includes(tool.name)),
  };
}
