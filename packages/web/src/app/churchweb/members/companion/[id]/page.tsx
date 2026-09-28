'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Compass,
  Edit3,
  Heart,
  Loader2,
  MapPin,
  Music,
  type LucideIcon,
} from 'lucide-react';
import { CHURCH_SITE_BASE, COMPANION_MEMBER_PATH, type ActivityDetail } from '@clawix/shared';
import { useAssetUrl } from '@/app/(dashboard)/activities/activity-api';
import { useAuth } from '@/components/auth-provider';
import { DevotionalTab } from '@/components/church-site/companion/devotional-tab';
import { HymnalTab } from '@/components/church-site/companion/hymnal-tab';
import { InfoTab, JournalTab } from '@/components/church-site/companion/info-tabs';
import { useCompanionT } from '@/components/church-site/companion/messages';
import {
  EMPTY_COMPANION_STATE,
  useDeviceState,
} from '@/components/church-site/companion/use-device-state';
import { SignInCard } from '@/components/church-site/sign-in-card';
import { authFetch } from '@/lib/auth';

type Tab = 'devotional' | 'hymnal' | 'journal' | 'info';
const TAB_ICONS: Record<Tab, LucideIcon> = {
  devotional: BookOpen,
  hymnal: Music,
  journal: Edit3,
  info: Compass,
};

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
      <span className="rounded-lg bg-emerald-50 p-2 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block font-mono text-sm font-semibold">{value}</span>
      </span>
    </div>
  );
}

function Companion({ activity }: { activity: ActivityDetail }) {
  const t = useCompanionT();
  const { id, content } = activity;
  const [tab, setTab] = useState<Tab>('devotional');
  const [dayIndex, setDayIndex] = useState(0);
  const [state, setState] = useDeviceState(`activity-companion:${id}`, EMPTY_COMPANION_STATE);
  const cover = useAssetUrl(id, content.coverAssetId);

  const total = content.devotionals.length;
  const done = content.devotionals.filter((d) => state.daysRead.includes(d.day)).length;
  const answers = Object.values(state.notes).filter((n) => n.trim()).length;
  const dates = [content.startDate, content.endDate].filter(Boolean).join(' – ');

  return (
    <div className="bg-stone-50 pb-12 dark:bg-stone-950">
      <header className="relative isolate overflow-hidden">
        {cover ? (
          <img src={cover} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 -z-20 bg-gradient-to-br from-emerald-800 via-teal-700 to-amber-600" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pt-6 pb-8 text-white">
          <Link
            href={`${CHURCH_SITE_BASE}/members`}
            className="flex w-fit items-center gap-1 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            {t.back}
          </Link>
          <span className="mt-10 w-max rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">
            {t.companion}
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-wide md:text-4xl">
            {activity.title}
          </h1>
          {content.theme && <p className="max-w-3xl text-white/90">{content.theme}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/80">
            {content.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-4" />
                {content.location}
              </span>
            )}
            {dates && (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-4" />
                {dates}
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="border-b border-dashed border-stone-300 px-4 py-4 dark:border-stone-700">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat icon={BookOpen} label={t.stats.progress} value={t.stats.daysRead(done, total)} />
          <Stat icon={Edit3} label={t.stats.journal} value={t.stats.answers(answers)} />
          <Stat
            icon={Heart}
            label={t.stats.bookmarks}
            value={t.stats.songs(state.savedSongs.length)}
          />
        </div>
      </section>

      <nav className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
        <div className="mx-auto flex max-w-6xl overflow-x-auto px-4">
          {(Object.keys(TAB_ICONS) as Tab[]).map((key) => {
            const Icon = TAB_ICONS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex flex-1 shrink-0 items-center justify-center gap-1.5 border-b-2 px-4 py-3.5 text-sm whitespace-nowrap transition md:flex-initial ${
                  tab === key
                    ? 'border-emerald-700 font-bold text-emerald-800 dark:text-emerald-300'
                    : 'border-transparent text-muted-foreground hover:text-emerald-700'
                }`}
              >
                <Icon className="size-4" />
                {t.tabs[key]}
                {key === 'hymnal' && content.songs.length > 0 && (
                  <span className="rounded bg-stone-200 px-1.5 font-mono text-[10px] dark:bg-stone-700">
                    {content.songs.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === 'devotional' && (
          <DevotionalTab
            devotionals={content.devotionals}
            state={state}
            onState={setState}
            dayIndex={dayIndex}
            onDayIndex={setDayIndex}
          />
        )}
        {tab === 'hymnal' && (
          <HymnalTab activityId={id} songs={content.songs} state={state} onState={setState} />
        )}
        {tab === 'journal' && (
          <JournalTab
            devotionals={content.devotionals}
            state={state}
            onOpenDay={(i) => {
              setDayIndex(i);
              setTab('devotional');
            }}
          />
        )}
        {tab === 'info' && <InfoTab activityId={id} content={content} />}
      </main>
    </div>
  );
}

/** A members' field companion for one Mission/Camp activity: devotionals, songs and trip info. */
export default function CompanionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useCompanionT();
  const { user, isLoading } = useAuth();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    authFetch<{ data: ActivityDetail }>(`/api/v1/activities/${encodeURIComponent(id)}`)
      .then((res) => setActivity(res.data))
      .catch(() => setFailed(true));
  }, [user, id]);

  if (activity) return <Companion activity={activity} />;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-10">
      {isLoading || (user && !failed) ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : !user ? (
        <SignInCard
          prompt={t.signInPrompt}
          label={t.signIn}
          returnTo={`${COMPANION_MEMBER_PATH}/${id}`}
        />
      ) : (
        <p className="text-sm text-destructive">{t.loadFailed}</p>
      )}
    </div>
  );
}
