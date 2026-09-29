'use client';

import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    guestTitle: 'Pathway for guests',
    memberTitle: 'Pathway for members',
    or: 'or',
    then: 'then',
    guests: [
      { who: 'Baptised believers', steps: ['Faith class', 'First Reading', 'Application'] },
      {
        who: 'Believers not yet baptised',
        steps: ['First Reading', 'Baptism class', 'Faith class'],
      },
      { who: 'Not yet believers', steps: ['Gospel class'], next: 'First Reading' },
    ],
    cycle: ['First Reading', 'Application', 'Introduction', 'Faith', 'Spiritual Reading'],
    cycleLabel:
      'Members cycle through First Reading, Application, Introduction, Faith and Spiritual Reading, then begin again.',
  },
  'zh-TW': {
    guestTitle: '主日學系統內為來賓而設的進程',
    memberTitle: '主日學系統內為會友而設的進程',
    or: '或',
    then: '之後',
    guests: [
      { who: '信主已受浸來賓', steps: ['信仰班', '初讀班', '應用班'] },
      { who: '信主未受浸來賓', steps: ['初讀班', '浸禮班', '信仰班'] },
      { who: '未信主來賓', steps: ['福音班'], next: '初讀班' },
    ],
    cycle: ['初讀班', '應用班', '導論班', '信仰班', '靈閱班'],
    cycleLabel: '會友循環進修：初讀班、應用班、導論班、信仰班、靈閱班，然後再開始。',
  },
} satisfies Messages<{
  guestTitle: string;
  memberTitle: string;
  or: string;
  then: string;
  guests: { who: string; steps: string[]; next?: string }[];
  cycle: string[];
  cycleLabel: string;
}>;

/** Offsets each column down a step, like the staircase in the printed plan. */
const STAGGER = ['', 'md:mt-6', 'md:mt-12'] as const;

/** Three guest groups, each an arrow into the classes that suit them. */
export function GuestPathway() {
  const t = useT(messages);
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{t.guestTitle}</h3>
      <div className="grid gap-3 md:grid-cols-3">
        {t.guests.map((g, i) => (
          <div key={g.who} className={`flex flex-col ${STAGGER[i] ?? ''}`}>
            <div
              className="bg-foreground py-2 pl-3 pr-8 text-sm font-semibold text-background"
              style={{
                clipPath:
                  'polygon(0 0, calc(100% - 1rem) 0, 100% 50%, calc(100% - 1rem) 100%, 0 100%)',
              }}
            >
              {g.who}
            </div>
            <ul className="flex flex-1 flex-col gap-1 border border-t-0 p-3 text-sm">
              {g.steps.map((step, j) => (
                <li key={step}>
                  <span className="font-medium">{step}</span>
                  {j < g.steps.length - 1 && <span className="text-muted-foreground"> {t.or}</span>}
                </li>
              ))}
              {g.next && (
                <li>
                  <span className="text-muted-foreground">{t.then} </span>
                  <span className="font-medium">{g.next}</span>
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

const CX = 220;
const CY = 190;
const R = 140;
const NODE_W = 124;
const NODE_H = 40;
/** Degrees trimmed from each end of an arc so arrows stop short of the boxes. */
const GAP = 30;

const point = (deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
};

/** Five classes on a clockwise loop, starting from First Reading at the top. */
export function MemberCycle() {
  const t = useT(messages);
  const step = 360 / t.cycle.length;
  const angleOf = (i: number) => -90 + i * step;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{t.memberTitle}</h3>
      <svg
        viewBox="0 0 440 370"
        role="img"
        aria-label={t.cycleLabel}
        className="mx-auto w-full max-w-md text-foreground"
      >
        <defs>
          <marker
            id="cycle-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10" fill="none" stroke="currentColor" strokeWidth="2" />
          </marker>
        </defs>
        {t.cycle.map((_, i) => {
          const from = point(angleOf(i) + GAP);
          const to = point(angleOf(i + 1) - GAP);
          return (
            <path
              key={`arc-${i}`}
              d={`M${from.x},${from.y} A${R},${R} 0 0 1 ${to.x},${to.y}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              markerEnd="url(#cycle-arrow)"
            />
          );
        })}
        {t.cycle.map((name, i) => {
          const { x, y } = point(angleOf(i));
          return (
            <g key={name}>
              <rect
                x={x - NODE_W / 2}
                y={y - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx="10"
                className="fill-foreground"
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-background text-[14px] font-semibold"
              >
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
