'use client';

import type { ActivityContent } from '@clawix/shared';
import { PackingView, PeopleView, ScheduleView } from '@/app/(dashboard)/activities/activity-views';
import { useCompanionT } from './messages';
import { noteKey, type CompanionState } from './use-device-state';

const panel =
  'flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900';
const heading = 'font-serif text-lg font-bold text-emerald-900 dark:text-emerald-200';

/** Every note written under a reflection question, grouped by day. */
export function JournalTab({
  devotionals,
  state,
  onOpenDay,
}: {
  devotionals: ActivityContent['devotionals'];
  state: CompanionState;
  onOpenDay: (index: number) => void;
}) {
  const t = useCompanionT();
  const days = devotionals
    .map((d, index) => ({
      d,
      index,
      entries: d.reflections
        .map((q, i) => ({ q, note: state.notes[noteKey(d.day, i)]?.trim() ?? '' }))
        .filter((e) => e.note),
    }))
    .filter((x) => x.entries.length > 0);

  if (days.length === 0) return <p className="text-sm text-muted-foreground">{t.noJournal}</p>;
  return (
    <div className="flex flex-col gap-4">
      {days.map(({ d, index, entries }) => (
        <section key={d.day} className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className={heading}>
              {t.day(d.day)} · {d.title}
            </h3>
            <button
              type="button"
              onClick={() => onOpenDay(index)}
              className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {t.goToDay} →
            </button>
          </div>
          {entries.map((e, i) => (
            <div key={i} className="border-l-2 border-amber-400 pl-3">
              <p className="text-sm text-muted-foreground">{e.q}</p>
              <p className="whitespace-pre-wrap" style={{ fontSize: state.fontSize }}>
                {e.note}
              </p>
            </div>
          ))}
        </section>
      ))}
      <p className="text-xs text-muted-foreground">{t.savedOnDevice}</p>
    </div>
  );
}

function InfoItems({ title, items }: { title: string; items: ActivityContent['notices'] }) {
  if (items.length === 0) return null;
  return (
    <section className={panel}>
      <h3 className={heading}>{title}</h3>
      <dl className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i}>
            {item.label && <dt className="text-sm font-semibold">{item.label}</dt>}
            <dd className="whitespace-pre-wrap text-sm leading-relaxed">{item.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Trip background, notices, timetable, contacts and packing list. */
export function InfoTab({ activityId, content }: { activityId: string; content: ActivityContent }) {
  const t = useCompanionT();
  return (
    <div className="flex flex-col gap-4">
      {content.summary && (
        <section className={panel}>
          <h3 className={heading}>{t.summary}</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{content.summary}</p>
        </section>
      )}
      <InfoItems title={t.notices} items={content.notices} />
      <InfoItems title={t.background} items={content.background} />
      {content.schedule.length > 0 && (
        <section className={panel}>
          <h3 className={heading}>{t.schedule}</h3>
          <ScheduleView content={content} />
        </section>
      )}
      {(content.contacts.length > 0 || content.team.length > 0) && (
        <section className={panel}>
          <PeopleView content={content} />
        </section>
      )}
      {content.packing.length > 0 && (
        <section className={panel}>
          <h3 className={heading}>{t.packing}</h3>
          <PackingView activityId={activityId} content={content} />
        </section>
      )}
    </div>
  );
}
