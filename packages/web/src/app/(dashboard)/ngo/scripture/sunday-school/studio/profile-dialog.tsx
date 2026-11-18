'use client';

import { useEffect, useState } from 'react';
import {
  SS_AGE_STAGES,
  SS_LITERACY_LEVELS,
  SS_MATURITY_LEVELS,
  SS_TRADITIONS,
  SS_TRANSLATIONS,
  saveSundaySchoolProfileSchema,
  type SaveSundaySchoolProfileData,
  type SundaySchoolProfileInfo,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { useStudioT } from './messages';
import { useOptionLabels } from './options';
import { API, EnumSelect, ErrorBanner, Field, errorMessage } from './shared';

const BLANK: SaveSundaySchoolProfileData = {
  name: '',
  description: '',
  ageStage: 'mixed_adults',
  literacyLevel: 'conversational',
  spiritualMaturity: 'growing',
  bibleTranslation: 'CUNP',
  tradition: 'baptist',
  guardrails: '',
  classSize: 12,
  defaultDurationMinutes: 45,
};

/** Create (`profile` = 'new') or edit a class profile; `null` keeps it closed. */
export function ProfileDialog({
  profile,
  onClose,
  onSaved,
}: {
  profile: SundaySchoolProfileInfo | 'new' | null;
  onClose: () => void;
  onSaved: (profile: SundaySchoolProfileInfo) => void;
}) {
  const t = useStudioT();
  const o = useOptionLabels();
  const [form, setForm] = useState<SaveSundaySchoolProfileData>(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (profile === 'new') setForm(BLANK);
    else if (profile) {
      const { id: _id, courseCount: _c, updatedAt: _u, ...data } = profile;
      setForm(data);
    }
  }, [profile]);

  const set = <K extends keyof SaveSundaySchoolProfileData>(
    key: K,
    value: SaveSundaySchoolProfileData[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    const parsed = saveSundaySchoolProfileSchema.safeParse(form);
    if (!parsed.success) {
      setError(t.invalid);
      return;
    }
    setBusy(true);
    try {
      const editing = profile && profile !== 'new';
      const res = await authFetch<{ data: SundaySchoolProfileInfo }>(
        `${API}/profiles${editing ? `/${profile.id}` : ''}`,
        { method: editing ? 'PUT' : 'POST', body: JSON.stringify(parsed.data) },
      );
      onSaved(res.data);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!profile} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{profile === 'new' ? t.newProfile : t.editProfile}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <ErrorBanner message={error} />
          <Field id="ss-name" label={t.profileName}>
            <Input id="ss-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field id="ss-about" label={t.profileDescription}>
            <Textarea
              id="ss-about"
              rows={2}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ss-age" label={t.ageStage}>
              <EnumSelect
                id="ss-age"
                value={form.ageStage}
                options={SS_AGE_STAGES}
                labels={o.ageStage}
                onChange={(v) => set('ageStage', v)}
              />
            </Field>
            <Field id="ss-literacy" label={t.literacy}>
              <EnumSelect
                id="ss-literacy"
                value={form.literacyLevel}
                options={SS_LITERACY_LEVELS}
                labels={o.literacy}
                onChange={(v) => set('literacyLevel', v)}
              />
            </Field>
            <Field id="ss-maturity" label={t.maturity}>
              <EnumSelect
                id="ss-maturity"
                value={form.spiritualMaturity}
                options={SS_MATURITY_LEVELS}
                labels={o.maturity}
                onChange={(v) => set('spiritualMaturity', v)}
              />
            </Field>
            <Field id="ss-translation" label={t.translation}>
              <EnumSelect
                id="ss-translation"
                value={form.bibleTranslation}
                options={SS_TRANSLATIONS}
                labels={o.translation}
                onChange={(v) => set('bibleTranslation', v)}
              />
            </Field>
            <Field id="ss-tradition" label={t.tradition}>
              <EnumSelect
                id="ss-tradition"
                value={form.tradition}
                options={SS_TRADITIONS}
                labels={o.tradition}
                onChange={(v) => set('tradition', v)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="ss-size" label={t.classSize}>
                <Input
                  id="ss-size"
                  type="number"
                  min={1}
                  value={form.classSize}
                  onChange={(e) => set('classSize', Number(e.target.value))}
                />
              </Field>
              <Field id="ss-minutes" label={t.duration}>
                <Input
                  id="ss-minutes"
                  type="number"
                  min={10}
                  max={180}
                  value={form.defaultDurationMinutes}
                  onChange={(e) => set('defaultDurationMinutes', Number(e.target.value))}
                />
              </Field>
            </div>
          </div>
          <Field id="ss-guardrails" label={t.guardrails} hint={t.guardrailsHint}>
            <Textarea
              id="ss-guardrails"
              rows={2}
              value={form.guardrails}
              onChange={(e) => set('guardrails', e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
