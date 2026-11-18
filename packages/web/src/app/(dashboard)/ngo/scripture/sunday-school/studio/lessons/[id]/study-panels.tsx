'use client';

import type { ReactNode } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import type { SundaySchoolCheck, SundaySchoolExegesis, SundaySchoolReview } from '@clawix/shared';
import { useStudioT } from '../../messages';

function Sub({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {hint && <p className="text-xs italic text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

/** The Exegete's notes on the passage. */
export function ExegesisPanel({ exegesis }: { exegesis: SundaySchoolExegesis }) {
  const t = useStudioT();
  return (
    <div className="grid gap-4 rounded-lg border p-4 text-sm lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Sub title={t.context}>
          <p className="whitespace-pre-line">{exegesis.historicalContext}</p>
        </Sub>
        <Sub title={t.anchors}>
          <ol className="list-decimal space-y-1 pl-5">
            {exegesis.theologicalAnchors.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </Sub>
      </div>
      <div className="flex flex-col gap-4">
        {exegesis.keyVerses.length > 0 && (
          <Sub title={t.keyVerses} hint={t.keyVersesHint}>
            <ul className="space-y-1">
              {exegesis.keyVerses.map((v) => (
                <li key={v.reference}>
                  <span className="font-medium">{v.reference}</span>
                  <span className="text-muted-foreground"> — {v.gist}</span>
                </li>
              ))}
            </ul>
          </Sub>
        )}
        {exegesis.crossReferences.length > 0 && (
          <Sub title={t.crossRefs}>
            <p>{exegesis.crossReferences.join(' · ')}</p>
          </Sub>
        )}
        {exegesis.wordNotes.length > 0 && (
          <Sub title={t.wordNotes}>
            <ul className="space-y-1">
              {exegesis.wordNotes.map((n) => (
                <li key={n.term}>
                  <span className="font-medium">{n.term}</span>{' '}
                  <span className="text-muted-foreground">
                    ({[n.language, n.transliteration, n.strongsId].filter(Boolean).join(', ')})
                  </span>{' '}
                  — {n.meaning}
                </li>
              ))}
            </ul>
          </Sub>
        )}
      </div>
    </div>
  );
}

function Check({ name, check }: { name: string; check: SundaySchoolCheck & { extra?: string } }) {
  const t = useStudioT();
  const ok = check.status === 'verified';
  const Icon = ok ? ShieldCheck : ShieldAlert;
  return (
    <li className="flex gap-3 rounded-lg border p-3">
      <Icon className={`mt-0.5 size-4 shrink-0 ${ok ? 'text-emerald-600' : 'text-amber-600'}`} />
      <div className="flex min-w-0 flex-col gap-0.5 text-sm">
        <span className="font-medium">
          {name} · <span className="font-normal">{ok ? t.verified : t.needsReview}</span>
        </span>
        {(check.detail || check.extra) && (
          <span className="text-xs text-muted-foreground">{check.detail || check.extra}</span>
        )}
      </div>
    </li>
  );
}

/** The Reviewer's checks; pacing is recomputed from the current blocks. */
export function ReviewPanel({
  review,
  allocatedMinutes,
  targetMinutes,
}: {
  review: SundaySchoolReview;
  allocatedMinutes: number;
  targetMinutes: number;
}) {
  const t = useStudioT();
  const pacingOk = Math.abs(allocatedMinutes - targetMinutes) <= 2;
  const passed = review.passed && pacingOk;
  return (
    <div className="flex flex-col gap-3">
      <p className={`text-sm font-medium ${passed ? 'text-emerald-600' : 'text-amber-600'}`}>
        {passed ? t.reviewPassed : t.reviewNeeds}
      </p>
      {review.summary && <p className="text-sm">{review.summary}</p>}
      <ul className="grid gap-2 md:grid-cols-2">
        <Check name={t.checks.verseAccuracy} check={review.verseAccuracy} />
        <Check name={t.checks.ageFit} check={review.ageFit} />
        <Check name={t.checks.doctrine} check={review.doctrine} />
        <Check
          name={t.checks.pacing}
          check={{
            status: pacingOk ? 'verified' : 'needs_review',
            detail: '',
            extra: t.pacingDetail(allocatedMinutes, targetMinutes),
          }}
        />
      </ul>
    </div>
  );
}
