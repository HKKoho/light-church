'use client';

import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Check, Loader2, Plus, Save, X } from 'lucide-react';
import {
  updateChurchSiteSchema,
  type ChurchSiteInfo,
  type UpdateChurchSiteInput,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { authFetch } from '@/lib/auth';
import { useChurchWebT } from './messages';
import { ErrorBanner, errorMessage, Field } from './shared';

const fromSite = (s: ChurchSiteInfo): UpdateChurchSiteInput => ({
  churchName: s.churchName,
  tagline: s.tagline,
  logoUrl: s.logoUrl,
  nav: s.nav,
  contact: s.contact,
  serviceTimes: s.serviceTimes,
  published: s.published,
});

/** Move item i one place up (-1) or down (+1). */
function move<T>(items: readonly T[], i: number, by: -1 | 1): T[] {
  const next = [...items];
  const j = i + by;
  if (j < 0 || j >= next.length) return next;
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

function RowButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button type="button" size="icon" variant="ghost" aria-label={label} onClick={onClick}>
      {children}
    </Button>
  );
}

export function SiteTab({
  site,
  onSaved,
}: {
  site: ChurchSiteInfo;
  onSaved: (s: ChurchSiteInfo) => void;
}) {
  const t = useChurchWebT();
  const [form, setForm] = useState<UpdateChurchSiteInput>(() => fromSite(site));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<UpdateChurchSiteInput>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  };
  const setContact = (patch: Partial<UpdateChurchSiteInput['contact']>) =>
    set({ contact: { ...form.contact, ...patch } });

  const save = async () => {
    setError(null);
    const parsed = updateChurchSiteSchema.safeParse(form);
    if (!parsed.success) {
      setError(`${t.invalid} (${parsed.error.issues[0]?.path.join('.') ?? ''})`);
      return;
    }
    setBusy(true);
    try {
      const res = await authFetch<{ data: ChurchSiteInfo }>('/api/v1/church-site', {
        method: 'PUT',
        body: JSON.stringify(parsed.data),
      });
      onSaved(res.data);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
            <div>
              <p className="font-medium">{t.published}</p>
              <p className="text-xs text-muted-foreground">{t.publishedNote}</p>
            </div>
            <Switch
              checked={form.published}
              onCheckedChange={(v) => set({ published: v })}
              aria-label={t.published}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="churchName" label={t.churchName}>
              <Input
                id="churchName"
                value={form.churchName}
                onChange={(e) => set({ churchName: e.target.value })}
              />
            </Field>
            <Field id="logoUrl" label={t.logoUrl}>
              <Input
                id="logoUrl"
                type="url"
                value={form.logoUrl}
                onChange={(e) => set({ logoUrl: e.target.value })}
              />
            </Field>
          </div>
          <Field id="tagline" label={t.tagline}>
            <Input
              id="tagline"
              value={form.tagline}
              onChange={(e) => set({ tagline: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.serviceTimes}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {form.serviceTimes.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                aria-label={t.serviceLabel}
                placeholder={t.serviceLabel}
                value={s.label}
                onChange={(e) =>
                  set({
                    serviceTimes: form.serviceTimes.map((x, j) =>
                      j === i ? { ...x, label: e.target.value } : x,
                    ),
                  })
                }
              />
              <Input
                aria-label={t.serviceTime}
                placeholder={t.serviceTime}
                value={s.time}
                onChange={(e) =>
                  set({
                    serviceTimes: form.serviceTimes.map((x, j) =>
                      j === i ? { ...x, time: e.target.value } : x,
                    ),
                  })
                }
              />
              <RowButton
                label={t.delete}
                onClick={() => set({ serviceTimes: form.serviceTimes.filter((_, j) => j !== i) })}
              >
                <X className="size-4" />
              </RowButton>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="self-start"
            onClick={() => set({ serviceTimes: [...form.serviceTimes, { label: '', time: '' }] })}
          >
            <Plus className="size-4" />
            {t.add}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.contact}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="email" label={t.email}>
              <Input
                id="email"
                type="email"
                value={form.contact.email}
                onChange={(e) => setContact({ email: e.target.value })}
              />
            </Field>
            <Field id="phone" label={t.phone}>
              <Input
                id="phone"
                value={form.contact.phone}
                onChange={(e) => setContact({ phone: e.target.value })}
              />
            </Field>
          </div>
          <p className="text-sm font-medium">{t.locations}</p>
          {form.contact.locations.map((loc, i) => {
            const update = (patch: Partial<typeof loc>) =>
              setContact({
                locations: form.contact.locations.map((x, j) => (j === i ? { ...x, ...patch } : x)),
              });
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_1fr_auto]">
                <Input
                  aria-label={t.locationName}
                  placeholder={t.locationName}
                  value={loc.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
                <Input
                  aria-label={t.address}
                  placeholder={t.address}
                  value={loc.address}
                  onChange={(e) => update({ address: e.target.value })}
                />
                <Input
                  aria-label={t.phone}
                  placeholder={t.phone}
                  value={loc.phone}
                  onChange={(e) => update({ phone: e.target.value })}
                />
                <RowButton
                  label={t.delete}
                  onClick={() =>
                    setContact({ locations: form.contact.locations.filter((_, j) => j !== i) })
                  }
                >
                  <X className="size-4" />
                </RowButton>
              </div>
            );
          })}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="self-start"
            onClick={() =>
              setContact({
                locations: [...form.contact.locations, { name: '', address: '', phone: '' }],
              })
            }
          >
            <Plus className="size-4" />
            {t.add}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.menu}</CardTitle>
          <p className="text-xs text-muted-foreground">{t.menuNote}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {form.nav.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] items-center gap-2">
              <Input
                aria-label={t.label}
                value={item.label}
                onChange={(e) =>
                  set({
                    nav: form.nav.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                  })
                }
              />
              <span className="truncate text-xs text-muted-foreground">
                {item.href}
                {item.children.length > 0 && ` (+${item.children.length})`}
              </span>
              <div className="flex">
                <RowButton label="Up" onClick={() => set({ nav: move(form.nav, i, -1) })}>
                  <ArrowUp className="size-4" />
                </RowButton>
                <RowButton label="Down" onClick={() => set({ nav: move(form.nav, i, 1) })}>
                  <ArrowDown className="size-4" />
                </RowButton>
                <RowButton
                  label={t.delete}
                  onClick={() => set({ nav: form.nav.filter((_, j) => j !== i) })}
                >
                  <X className="size-4" />
                </RowButton>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ErrorBanner message={error} />
      <Button className="self-start" onClick={() => void save()} disabled={busy}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : saved ? (
          <Check className="size-4" />
        ) : (
          <Save className="size-4" />
        )}
        {saved ? t.saved : t.save}
      </Button>
    </div>
  );
}
