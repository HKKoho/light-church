'use client';

import { useEffect, useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import type { ActivityContent } from '@clawix/shared';
import { useAssetUrl } from './activity-api';
import { useActivityT } from './messages';

const Empty = () => {
  const t = useActivityT();
  return <p className="text-sm text-muted-foreground">{t.nothingYet}</p>;
};

const Prose = ({ text }: { text: string }) => (
  <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
);

function InfoList({ title, items }: { title: string; items: ActivityContent['background'] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.map((item, i) => (
        <div key={i} className="rounded-md border bg-muted/30 p-3">
          {item.label && <p className="mb-1 text-sm font-medium">{item.label}</p>}
          <Prose text={item.text} />
        </div>
      ))}
    </section>
  );
}

export function OverviewView({
  activityId,
  content,
}: {
  activityId: string;
  content: ActivityContent;
}) {
  const t = useActivityT();
  const cover = useAssetUrl(activityId, content.coverAssetId);
  const facts = [
    [t.fields.theme, content.theme],
    [t.fields.location, content.location],
  ].filter(([, v]) => v);
  return (
    <div className="flex flex-col gap-6">
      {cover && <img src={cover} alt="" className="max-h-72 w-full rounded-lg object-cover" />}
      {facts.length > 0 && (
        <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr]">
          {facts.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {content.summary && <Prose text={content.summary} />}
      <InfoList title={t.fields.notices} items={content.notices} />
      <InfoList title={t.fields.background} items={content.background} />
      {!content.summary &&
        !facts.length &&
        !content.notices.length &&
        !content.background.length && <Empty />}
    </div>
  );
}

export function ScheduleView({ content }: { content: ActivityContent }) {
  const t = useActivityT();
  if (content.schedule.length === 0) return <Empty />;
  const slots = ['morning', 'noon', 'afternoon', 'evening'] as const;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {content.schedule.map((day, i) => (
        <div key={i} className="rounded-md border p-3">
          <p className="mb-2 font-medium">{day.date}</p>
          <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
            {slots
              .filter((s) => day[s])
              .map((s) => (
                <div key={s} className="contents">
                  <dt className="text-muted-foreground">{t.fields[s]}</dt>
                  <dd className="whitespace-pre-wrap">{day[s]}</dd>
                </div>
              ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

interface Person {
  name: string;
  role: string;
  phone: string;
  email?: string;
}

function PeopleTable({ title, people }: { title: string; people: readonly Person[] }) {
  if (people.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="divide-y rounded-md border">
        {people.map((p, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
            <span className="font-medium">{p.name}</span>
            {p.role && <span className="text-muted-foreground">{p.role}</span>}
            <span className="ml-auto flex gap-3">
              {p.phone && (
                <a
                  href={`tel:${p.phone.replace(/[^\d+]/g, '')}`}
                  className="flex items-center gap-1 hover:underline"
                >
                  <Phone className="size-3.5" />
                  {p.phone}
                </a>
              )}
              {p.email && (
                <a href={`mailto:${p.email}`} className="flex items-center gap-1 hover:underline">
                  <Mail className="size-3.5" />
                  {p.email}
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PeopleView({ content }: { content: ActivityContent }) {
  const t = useActivityT();
  if (content.team.length === 0 && content.contacts.length === 0) return <Empty />;
  return (
    <div className="flex flex-col gap-6">
      <PeopleTable title={t.fields.contacts} people={content.contacts} />
      <PeopleTable title={t.fields.team} people={content.team} />
    </div>
  );
}

/** Packing checklist; ticks are a per-device convenience kept in localStorage. */
export function PackingView({
  activityId,
  content,
}: {
  activityId: string;
  content: ActivityContent;
}) {
  const t = useActivityT();
  const key = `activity-packing:${activityId}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setChecked(JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, boolean>);
    } catch {
      setChecked({});
    }
  }, [key]);
  const toggle = (item: string) => {
    const next = { ...checked, [item]: !checked[item] };
    setChecked(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage unavailable (private window) — ticks last for this visit only.
    }
  };
  if (content.packing.length === 0) return <Empty />;
  return (
    <div className="flex flex-col gap-2">
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {content.packing.map((item, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={!!checked[item]}
                onChange={() => toggle(item)}
              />
              <span className={checked[item] ? 'text-muted-foreground line-through' : ''}>
                {item}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{t.checkedHint}</p>
    </div>
  );
}

export function NotesView({ content }: { content: ActivityContent }) {
  return content.notes ? <Prose text={content.notes} /> : <Empty />;
}

export function DevotionalsView({ content }: { content: ActivityContent }) {
  const t = useActivityT();
  const [index, setIndex] = useState(0);
  const devotionals = content.devotionals;
  const d = devotionals[Math.min(index, devotionals.length - 1)];
  if (!d) return <Empty />;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {devotionals.map((dv, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`rounded-full border px-3 py-1 text-xs ${d === dv ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {t.day(dv.day)}
          </button>
        ))}
      </div>
      <article className="flex flex-col gap-4">
        <header>
          <p className="text-xs text-muted-foreground">{t.day(d.day)}</p>
          <h3 className="text-lg font-semibold">{d.title}</h3>
          {d.scriptureRef && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{d.scriptureRef}</p>
          )}
        </header>
        {d.scriptureText && (
          <blockquote className="border-l-2 border-emerald-500/60 pl-4 text-sm italic leading-relaxed whitespace-pre-wrap">
            {d.scriptureText}
          </blockquote>
        )}
        {d.guide && <Prose text={d.guide} />}
        {d.reflections.length > 0 && (
          <section>
            <h4 className="mb-1 text-sm font-semibold">{t.reflections}</h4>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {d.reflections.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          </section>
        )}
        {d.prayer && (
          <section className="rounded-md bg-muted/40 p-3">
            <h4 className="mb-1 text-sm font-semibold">{t.prayer}</h4>
            <Prose text={d.prayer} />
          </section>
        )}
      </article>
    </div>
  );
}
