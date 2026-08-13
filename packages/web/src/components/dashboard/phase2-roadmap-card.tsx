import { Map } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface RoadmapItem {
  readonly title: string;
  readonly eta?: string;
}

// Phase 2A (the original gospel-mission 8-key-areas backlog) shipped in full —
// folded in here rather than kept as its own now-empty section.
const SHIPPED: readonly RoadmapItem[] = [
  { title: 'Pastoral-care agent' },
  { title: 'Speech input & read-aloud' },
  { title: 'Partners Directory' },
  { title: 'Mission Trip Fields' },
  { title: 'Kingdom Impact Indicators' },
  { title: 'Financial Stewardship & Ledger Export' },
  { title: 'Evangelism & Outreach Agent' },
  { title: 'Scripture & Literacy Tracker' },
  { title: 'Consent & Story Permissions Tracker' },
  { title: 'Game Studio live wiring' },
  { title: 'Granular RBAC role taxonomy' },
  { title: 'Categorized ministries top-bar nav' },
  { title: 'Richer pastoral-care content' },
  { title: 'Port all ~20 church-* skills' },
  { title: 'Seed the corresponding agents' },
  { title: 'Add browser-automation tool suite' },
];

// Phase 2C — ChurchAIAssistant pack integration, settings half: make packs a
// first-class, toggleable concept instead of a one-off script.
const PHASE_2C: readonly RoadmapItem[] = [
  { title: 'Pack-installer script' },
  { title: 'Ministry Packs settings tab' },
];

// Phase 2D — ChurchAIAdmin's Attendance/Roll-Call system has no equivalent in
// either this repo or ChurchAIAssistant. Doesn't fit 2A (unrelated backlog),
// 2B (not church-*-skill content), or 2C (not pack infra) — a real gap on its
// own. ChurchAIAdmin's WhatsApp-Bookkeeper receipt-classification idea folds
// into the existing Phase 2A Financial Stewardship item instead of landing
// here, since that item already exists.
const PHASE_2D: readonly RoadmapItem[] = [
  { title: 'Attendance / roll-call tracking' },
  { title: 'AI survey + QR registration' },
];

function RoadmapSection({ label, items }: { label: string; items: readonly RoadmapItem[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </span>
      {items.map((item) =>
        item.eta ? (
          <div key={item.title} className="flex items-center justify-between gap-2">
            <span className="truncate">{item.title}</span>
            <Badge variant="outline" className="shrink-0 font-normal">
              {item.eta}
            </Badge>
          </div>
        ) : (
          <span key={item.title} className="truncate text-muted-foreground">
            {item.title}
          </span>
        ),
      )}
    </div>
  );
}

export function Phase2RoadmapCard() {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
          <Map className="size-3.5" />
          Phase 2 Roadmap
        </CardTitle>
        <CardDescription className="text-[11px]">Planning estimates, not commitments.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 text-xs">
        <RoadmapSection label="Shipped" items={SHIPPED} />
        <RoadmapSection label="Phase 2C" items={PHASE_2C} />
        <RoadmapSection label="Phase 2D" items={PHASE_2D} />
      </CardContent>
    </Card>
  );
}
