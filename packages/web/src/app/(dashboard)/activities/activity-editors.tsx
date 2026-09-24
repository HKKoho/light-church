'use client';

import type { ActivityAssetInfo, ActivityContent } from '@clawix/shared';
import { ACTIVITY_KINDS } from '@clawix/shared';
import { Field, RowsEditor, type FieldSpec } from './rows-editor';
import { useActivityT } from './messages';

type Content = ActivityContent;
type Info = Content['background'][number];
type Day = Content['schedule'][number];
type Member = Content['team'][number];
type Contact = Content['contacts'][number];
type Devotional = Content['devotionals'][number];
type Song = Content['songs'][number];

interface EditorProps {
  readonly content: Content;
  readonly onChange: (patch: Partial<Content>) => void;
}

export function OverviewEditor({ content, onChange }: EditorProps) {
  const t = useActivityT();
  const f = t.fields;
  const specs: FieldSpec<Content>[] = [
    {
      key: 'kind',
      label: t.kindLabel,
      type: 'select',
      options: ACTIVITY_KINDS.map((k) => ({ value: k, label: t.kinds[k] })),
    },
    { key: 'location', label: f.location, type: 'text' },
    { key: 'startDate', label: f.startDate, type: 'date' },
    { key: 'endDate', label: f.endDate, type: 'date' },
    { key: 'theme', label: f.theme, type: 'text', wide: true },
    { key: 'summary', label: f.summary, type: 'textarea', wide: true },
  ];
  const info: FieldSpec<Info>[] = [
    { key: 'label', label: f.label, type: 'text', wide: true },
    { key: 'text', label: f.text, type: 'textarea', wide: true },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {specs.map((spec) => (
          <Field
            key={spec.key}
            id={`overview-${spec.key}`}
            spec={spec}
            value={content[spec.key]}
            onChange={(v) => onChange({ [spec.key]: v })}
          />
        ))}
      </div>
      <RowsEditor
        id="notices"
        title={f.notices}
        rows={content.notices}
        fields={info}
        makeEmpty={() => ({ label: '', text: '' })}
        summary={(r) => r.label || r.text.slice(0, 60)}
        onChange={(notices) => onChange({ notices })}
      />
      <RowsEditor
        id="background"
        title={f.background}
        rows={content.background}
        fields={info}
        makeEmpty={() => ({ label: '', text: '' })}
        summary={(r) => r.label || r.text.slice(0, 60)}
        onChange={(background) => onChange({ background })}
        collapsible
      />
    </div>
  );
}

export function ScheduleEditor({ content, onChange }: EditorProps) {
  const t = useActivityT();
  const f = t.fields;
  const fields: FieldSpec<Day>[] = [
    { key: 'date', label: f.date, type: 'text', wide: true },
    { key: 'morning', label: f.morning, type: 'textarea' },
    { key: 'noon', label: f.noon, type: 'textarea' },
    { key: 'afternoon', label: f.afternoon, type: 'textarea' },
    { key: 'evening', label: f.evening, type: 'textarea' },
  ];
  return (
    <RowsEditor
      id="schedule"
      rows={content.schedule}
      fields={fields}
      makeEmpty={() => ({ date: '', morning: '', noon: '', afternoon: '', evening: '' })}
      summary={(r, i) => r.date || t.day(i + 1)}
      onChange={(schedule) => onChange({ schedule })}
    />
  );
}

export function PeopleEditor({ content, onChange }: EditorProps) {
  const t = useActivityT();
  const f = t.fields;
  const member: FieldSpec<Member>[] = [
    { key: 'name', label: f.name, type: 'text' },
    { key: 'role', label: f.role, type: 'text' },
    { key: 'phone', label: f.phone, type: 'text' },
  ];
  const contact: FieldSpec<Contact>[] = [
    ...(member as FieldSpec<Contact>[]),
    { key: 'email', label: f.email, type: 'text' },
  ];
  return (
    <div className="flex flex-col gap-6">
      <RowsEditor
        id="contacts"
        title={f.contacts}
        rows={content.contacts}
        fields={contact}
        makeEmpty={() => ({ name: '', role: '', phone: '', email: '' })}
        summary={(r) => r.name}
        onChange={(contacts) => onChange({ contacts })}
      />
      <RowsEditor
        id="team"
        title={f.team}
        rows={content.team}
        fields={member}
        makeEmpty={() => ({ name: '', role: '', phone: '' })}
        summary={(r) => r.name}
        onChange={(team) => onChange({ team })}
      />
    </div>
  );
}

export function PackingEditor({ content, onChange }: EditorProps) {
  const t = useActivityT();
  return (
    <Field<{ packing: string[] }>
      id="packing"
      spec={{ key: 'packing', label: t.fields.packing, type: 'lines', wide: true }}
      value={content.packing}
      onChange={(v) => onChange({ packing: v as string[] })}
    />
  );
}

export function NotesEditor({ content, onChange }: EditorProps) {
  const t = useActivityT();
  return (
    <Field<{ notes: string }>
      id="notes"
      spec={{ key: 'notes', label: t.fields.notes, type: 'textarea', wide: true }}
      value={content.notes}
      onChange={(v) => onChange({ notes: v as string })}
    />
  );
}

export function DevotionalsEditor({ content, onChange }: EditorProps) {
  const t = useActivityT();
  const f = t.fields;
  const fields: FieldSpec<Devotional>[] = [
    { key: 'day', label: f.day, type: 'number' },
    { key: 'title', label: f.devotionalTitle, type: 'text' },
    { key: 'scriptureRef', label: f.scriptureRef, type: 'text', wide: true },
    { key: 'scriptureText', label: f.scriptureText, type: 'textarea', wide: true },
    { key: 'guide', label: f.guide, type: 'textarea', wide: true },
    { key: 'reflections', label: f.reflections, type: 'lines', wide: true },
    { key: 'prayer', label: f.prayer, type: 'textarea', wide: true },
  ];
  return (
    <RowsEditor
      id="devotionals"
      rows={content.devotionals}
      fields={fields}
      makeEmpty={() => ({
        day: content.devotionals.length + 1,
        title: '',
        scriptureRef: '',
        scriptureText: '',
        guide: '',
        reflections: [],
        prayer: '',
      })}
      summary={(r) => `${t.day(r.day)} · ${r.title}`}
      onChange={(devotionals) => onChange({ devotionals })}
      collapsible
    />
  );
}

export function SongsEditor({
  content,
  onChange,
  assets,
}: EditorProps & { readonly assets: readonly ActivityAssetInfo[] }) {
  const t = useActivityT();
  const f = t.fields;
  const audio = [
    { value: '', label: t.noAudio },
    ...assets.filter((a) => a.kind === 'audio').map((a) => ({ value: a.id, label: a.fileName })),
  ];
  const fields: FieldSpec<Song>[] = [
    { key: 'title', label: f.songTitle, type: 'text' },
    {
      key: 'lang',
      label: f.lang,
      type: 'select',
      options: (['zh', 'en', 'other'] as const).map((l) => ({ value: l, label: t.langs[l] })),
    },
    { key: 'category', label: f.category, type: 'text' },
    { key: 'author', label: f.author, type: 'text' },
    { key: 'youtubeId', label: f.youtube, type: 'text' },
    { key: 'audioAssetId', label: f.audio, type: 'select', options: audio },
    { key: 'lyrics', label: f.lyrics, type: 'textarea', wide: true },
  ];
  return (
    <RowsEditor
      id="songs"
      rows={content.songs.map((s) => ({ ...s, audioAssetId: s.audioAssetId ?? '' }))}
      fields={fields}
      makeEmpty={() => ({
        title: '',
        lang: 'zh' as const,
        category: '',
        author: '',
        lyrics: '',
        youtubeId: '',
        audioAssetId: '',
      })}
      summary={(r) => r.title}
      onChange={(songs) =>
        onChange({ songs: songs.map((s) => ({ ...s, audioAssetId: s.audioAssetId || null })) })
      }
      collapsible
    />
  );
}
