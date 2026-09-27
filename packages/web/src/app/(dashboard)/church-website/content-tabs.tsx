'use client';

import {
  SITE_MEDIA_KINDS,
  SITE_VISIBILITIES,
  saveSiteEventSchema,
  saveSiteMediaSchema,
  type SaveSiteEventInput,
  type SaveSiteMediaInput,
  type SiteEventInfo,
  type SiteMediaInfo,
  type SiteMediaKind,
  type SiteVisibility,
} from '@clawix/shared';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ContentList } from './content-list';
import { useChurchWebT, type ChurchWebMessages } from './messages';
import { Field } from './shared';

const today = () => new Date().toISOString().slice(0, 10);

function VisibilitySelect({
  id,
  value,
  onChange,
  t,
}: {
  id: string;
  value: SiteVisibility;
  onChange: (v: SiteVisibility) => void;
  t: ChurchWebMessages;
}) {
  return (
    <Field id={id} label={t.visibility}>
      <Select value={value} onValueChange={(v) => onChange(v as SiteVisibility)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SITE_VISIBILITIES.map((v) => (
            <SelectItem key={v} value={v}>
              {t.visibilities[v]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function EventsTab() {
  const t = useChurchWebT();
  return (
    <ContentList<SiteEventInfo, SaveSiteEventInput>
      api="/api/v1/church-site/events"
      schema={saveSiteEventSchema}
      empty={() => ({
        title: '',
        date: today(),
        time: '',
        location: '',
        description: '',
        registrationUrl: '',
        visibility: 'public',
      })}
      toForm={({ id: _id, ...form }) => form}
      labels={{ add: t.newEvent, edit: t.editEvent, none: t.noEvents }}
      subtitle={(e) => [e.date, e.time, e.location].filter(Boolean).join(' · ')}
      renderForm={(form, set) => (
        <>
          <Field id="event-title" label={t.eventTitle}>
            <Input
              id="event-title"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field id="event-date" label={t.date}>
              <Input
                id="event-date"
                type="date"
                value={form.date}
                onChange={(e) => set({ date: e.target.value })}
              />
            </Field>
            <Field id="event-time" label={t.time}>
              <Input
                id="event-time"
                placeholder="10:30"
                value={form.time}
                onChange={(e) => set({ time: e.target.value })}
              />
            </Field>
            <VisibilitySelect
              id="event-vis"
              value={form.visibility}
              onChange={(v) => set({ visibility: v })}
              t={t}
            />
          </div>
          <Field id="event-location" label={t.location}>
            <Input
              id="event-location"
              value={form.location}
              onChange={(e) => set({ location: e.target.value })}
            />
          </Field>
          <Field id="event-reg" label={t.registrationUrl} hint={t.registrationHint}>
            <Input
              id="event-reg"
              type="url"
              value={form.registrationUrl}
              onChange={(e) => set({ registrationUrl: e.target.value })}
            />
          </Field>
          <Field id="event-desc" label={t.description}>
            <Textarea
              id="event-desc"
              rows={5}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
        </>
      )}
    />
  );
}

export function MediaTab() {
  const t = useChurchWebT();
  return (
    <ContentList<SiteMediaInfo, SaveSiteMediaInput>
      api="/api/v1/church-site/media"
      schema={saveSiteMediaSchema}
      empty={() => ({
        title: '',
        kind: 'video',
        url: '',
        speaker: '',
        date: today(),
        description: '',
        visibility: 'public',
      })}
      toForm={({ id: _id, ...form }) => form}
      labels={{ add: t.newMedia, edit: t.editMedia, none: t.noMedia }}
      subtitle={(m) => [t.kinds[m.kind], m.date, m.speaker].filter(Boolean).join(' · ')}
      renderForm={(form, set) => (
        <>
          <Field id="media-title" label={t.eventTitle}>
            <Input
              id="media-title"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field id="media-kind" label={t.kind}>
              <Select value={form.kind} onValueChange={(v) => set({ kind: v as SiteMediaKind })}>
                <SelectTrigger id="media-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITE_MEDIA_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {t.kinds[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="media-date" label={t.date}>
              <Input
                id="media-date"
                type="date"
                value={form.date}
                onChange={(e) => set({ date: e.target.value })}
              />
            </Field>
            <VisibilitySelect
              id="media-vis"
              value={form.visibility}
              onChange={(v) => set({ visibility: v })}
              t={t}
            />
          </div>
          <Field id="media-url" label={t.url}>
            <Input
              id="media-url"
              type="url"
              value={form.url}
              onChange={(e) => set({ url: e.target.value })}
            />
          </Field>
          <Field id="media-speaker" label={t.speaker}>
            <Input
              id="media-speaker"
              value={form.speaker}
              onChange={(e) => set({ speaker: e.target.value })}
            />
          </Field>
          <Field id="media-desc" label={t.description}>
            <Textarea
              id="media-desc"
              rows={4}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
        </>
      )}
    />
  );
}
