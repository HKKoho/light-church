'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, CalendarDays, Loader2, MapPin, Pencil, Save, X } from 'lucide-react';
import type { ActivityAssetInfo, ActivityContent, ActivityDetail } from '@clawix/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authFetch } from '@/lib/auth';
import { ACTIVITIES_API, dateRange, youtubeIdFrom } from '../activity-api';
import {
  DevotionalsView,
  NotesView,
  OverviewView,
  PackingView,
  PeopleView,
  ScheduleView,
} from '../activity-views';
import {
  DevotionalsEditor,
  NotesEditor,
  OverviewEditor,
  PackingEditor,
  PeopleEditor,
  ScheduleEditor,
  SongsEditor,
} from '../activity-editors';
import { FilesPanel } from '../files-panel';
import { SongsView } from '../songs-view';
import { useActivityT } from '../messages';

const TABS = [
  'overview',
  'schedule',
  'people',
  'packing',
  'devotionals',
  'songs',
  'files',
  'notes',
] as const;

/** Drops blank lines that the one-per-line editors leave behind. */
function tidy(content: ActivityContent): ActivityContent {
  const lines = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);
  return {
    ...content,
    packing: lines(content.packing),
    devotionals: content.devotionals.map((d) => ({ ...d, reflections: lines(d.reflections) })),
    songs: content.songs.map((s) => ({ ...s, youtubeId: youtubeIdFrom(s.youtubeId) })),
  };
}

export default function ActivityPage() {
  const t = useActivityT();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState<ActivityContent | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authFetch<{ data: ActivityDetail }>(`${ACTIVITIES_API}/${id}`);
      setActivity(res.data);
      setTitle(res.data.title);
      setDraft(res.data.content);
      setEditing((e) => e || (res.data.canEdit && searchParams.get('edit') === '1'));
    } catch (err: unknown) {
      setNotice({ error: true, text: err instanceof Error ? err.message : t.loadError });
    }
  }, [id, searchParams, t.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (!activity || !draft) {
    return (
      <div className="p-6">
        {notice ? (
          <p className="text-sm text-destructive">{notice.text}</p>
        ) : (
          <Loader2 className="size-5 animate-spin" />
        )}
      </div>
    );
  }

  const change = (patch: Partial<ActivityContent>) => {
    setDraft({ ...draft, ...patch });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await authFetch<{ data: ActivityDetail }>(`${ACTIVITIES_API}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: title.trim(), content: tidy(draft) }),
      });
      setActivity(res.data);
      setDraft(res.data.content);
      setDirty(false);
      setEditing(false);
      setNotice({ error: false, text: t.saved });
    } catch (err: unknown) {
      setNotice({ error: true, text: err instanceof Error ? err.message : t.saveFailed });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setTitle(activity.title);
    setDraft(activity.content);
    setDirty(false);
    setEditing(false);
  };

  const assetsChanged = (assets: ActivityAssetInfo[]) => {
    const ids = new Set(assets.map((a) => a.id));
    const keep = (x: string | null) => (x && ids.has(x) ? x : null);
    // Mirror the server, which clears references to deleted files.
    const prune = (c: ActivityContent): ActivityContent => ({
      ...c,
      coverAssetId: keep(c.coverAssetId),
      songs: c.songs.map((s) => ({ ...s, audioAssetId: keep(s.audioAssetId) })),
    });
    setActivity({ ...activity, assets, content: prune(activity.content) });
    setDraft(prune(draft));
  };

  const content = editing ? draft : activity.content;
  const props = { content, onChange: change };

  return (
    <div className="flex flex-col gap-5 p-6">
      <Link
        href="/activities"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.back}
      </Link>

      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {editing ? (
            <Input
              value={title}
              maxLength={200}
              aria-label={t.titleLabel}
              className="text-lg font-semibold"
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
            />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight">{activity.title}</h1>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary">{t.kinds[content.kind]}</Badge>
            {content.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {content.location}
              </span>
            )}
            {(content.startDate || content.endDate) && (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                {dateRange(content.startDate, content.endDate)}
              </span>
            )}
          </div>
        </div>
        {activity.canEdit &&
          (editing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={discard} disabled={saving}>
                <X className="mr-1.5 size-4" />
                {t.discard}
              </Button>
              <Button onClick={() => void save()} disabled={saving || title.trim() === ''}>
                {saving ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-4" />
                )}
                {saving ? t.saving : t.save}
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1.5 size-4" />
              {t.edit}
            </Button>
          ))}
      </div>

      {!activity.canEdit && <p className="text-xs text-muted-foreground">{t.viewOnly}</p>}
      {editing && dirty && <p className="text-xs text-amber-600">{t.unsaved}</p>}
      {notice && (
        <p className={`text-sm ${notice.error ? 'text-destructive' : 'text-emerald-600'}`}>
          {notice.text}
        </p>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="flex-none">
              {t.tabs[tab]}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="pt-4">
          <TabsContent value="overview">
            {editing ? (
              <OverviewEditor {...props} />
            ) : (
              <OverviewView activityId={id} content={content} />
            )}
          </TabsContent>
          <TabsContent value="schedule">
            {editing ? <ScheduleEditor {...props} /> : <ScheduleView content={content} />}
          </TabsContent>
          <TabsContent value="people">
            {editing ? <PeopleEditor {...props} /> : <PeopleView content={content} />}
          </TabsContent>
          <TabsContent value="packing">
            {editing ? (
              <PackingEditor {...props} />
            ) : (
              <PackingView activityId={id} content={content} />
            )}
          </TabsContent>
          <TabsContent value="devotionals">
            {editing ? <DevotionalsEditor {...props} /> : <DevotionalsView content={content} />}
          </TabsContent>
          <TabsContent value="songs">
            {editing ? (
              <SongsEditor {...props} assets={activity.assets} />
            ) : (
              <SongsView activityId={id} content={content} />
            )}
          </TabsContent>
          <TabsContent value="files">
            <FilesPanel
              activityId={id}
              assets={activity.assets}
              canEdit={activity.canEdit}
              coverAssetId={content.coverAssetId}
              onSetCover={editing ? (coverAssetId) => change({ coverAssetId }) : undefined}
              onAssetsChanged={assetsChanged}
            />
          </TabsContent>
          <TabsContent value="notes">
            {editing ? <NotesEditor {...props} /> : <NotesView content={content} />}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
