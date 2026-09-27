'use client';

import { useState, type ReactNode } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import {
  MAX_VENUE_ROOMS,
  VENUE_ACTIVITY_MODES,
  VENUE_ACTIVITY_NATURES,
  VENUE_ATTENDANCE_RANGES,
  VENUE_AUDIENCES,
  VENUE_PAID_MODE,
  VENUE_ROOM_TYPE,
  VENUE_TITLES,
  VENUE_TYPES,
  venueApplicationSchema,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { choiceLabel } from '@/components/venue-rental/choice-labels';
import { ApiError, apiFetch } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useRentT, type RentMessages } from './messages';
import { emptySession, FieldError, SessionFields } from './session-fields';

const initialForm = () => ({
  organization: '',
  contactPerson: '',
  contactTitle: '',
  mobile: '',
  email: '',
  venueType: '',
  roomCount: 1,
  sessions: [emptySession()],
  activityNature: '',
  activityMode: '',
  activityFee: '',
  targetAudience: [] as string[],
  attendanceRange: '',
  description: '',
  repName: '',
  repTitle: '',
  website: '',
});
type Form = ReturnType<typeof initialForm>;

/** Which message to show for a failed field, keyed by the Zod issue path. */
function errorFor(path: string, t: RentMessages): string {
  if (path === 'email') return t.errEmail;
  if (path === 'mobile') return t.errMobile;
  if (path === 'activityFee') return t.errFee;
  if (path === 'targetAudience') return t.errAudience;
  if (/^sessions\.\d+\.date$/.test(path)) return t.errDate;
  if (/^sessions\.\d+\.(start|end)$/.test(path)) return t.errTime;
  return t.errRequired;
}

export function VenueApplicationForm({ onSubmitted }: { onSubmitted: () => void }) {
  const t = useRentT();
  const { lang } = useLanguage();
  const [form, setForm] = useState<Form>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const toggleAudience = (a: string) =>
    set({
      targetAudience: form.targetAudience.includes(a)
        ? form.targetAudience.filter((x) => x !== a)
        : [...form.targetAudience, a],
    });

  const submit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setFailure(null);
    const parsed = venueApplicationSchema.safeParse({
      ...form,
      email: form.email.trim(),
      activityFee: form.activityFee === '' ? null : Number(form.activityFee),
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        next[path] ??= errorFor(path, t);
      }
      setErrors(next);
      setFailure(t.fixErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await apiFetch('/api/v1/venue-rental/applications', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      setForm(initialForm());
      onSubmitted();
    } catch (err) {
      setFailure(err instanceof ApiError && err.status === 429 ? t.tooMany : t.failed);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (key: string) => <FieldError message={errors[key]} />;

  const field = (key: string, label: string, control: ReactNode, className?: string) => (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={key}>
        {label} <span className="text-destructive">*</span>
      </Label>
      {control}
      {fieldError(key)}
    </div>
  );

  const text = (
    key: 'organization' | 'contactPerson' | 'email' | 'repName',
    placeholder: string,
  ) => (
    <Input
      id={key}
      type={key === 'email' ? 'email' : 'text'}
      value={form[key]}
      placeholder={placeholder}
      aria-invalid={!!errors[key]}
      onChange={(e) => set({ [key]: e.target.value })}
    />
  );

  const choose = (
    key:
      | 'contactTitle'
      | 'repTitle'
      | 'venueType'
      | 'activityNature'
      | 'activityMode'
      | 'attendanceRange',
    options: readonly string[],
    placeholder: string,
    onChange: (v: string) => void = (v) => set({ [key]: v }),
  ) => (
    <Select value={form[key]} onValueChange={onChange}>
      <SelectTrigger id={key} className="w-full" aria-invalid={!!errors[key]}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {choiceLabel(o, lang)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const section = (n: number, title: string, children: ReactNode) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {n}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        value={form.website}
        onChange={(e) => set({ website: e.target.value })}
      />

      {section(
        1,
        t.sectionApplicant,
        <>
          {field('organization', t.organization, text('organization', t.organizationPlaceholder))}
          <div className="grid gap-3 sm:grid-cols-3">
            {field(
              'contactPerson',
              t.contactPerson,
              text('contactPerson', t.namePlaceholder),
              'sm:col-span-2',
            )}
            {field('contactTitle', t.title_, choose('contactTitle', VENUE_TITLES, t.choose))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {field(
              'mobile',
              t.mobile,
              <Input
                id="mobile"
                inputMode="tel"
                value={form.mobile}
                placeholder={t.mobilePlaceholder}
                aria-invalid={!!errors['mobile']}
                onChange={(e) => set({ mobile: e.target.value.replace(/\D/g, '') })}
              />,
            )}
            {field('email', t.email, text('email', 'example@email.com'))}
          </div>
        </>,
      )}

      {section(
        2,
        t.sectionVenue,
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {field('venueType', t.venueType, choose('venueType', VENUE_TYPES, t.venuePlaceholder))}
            {form.venueType === VENUE_ROOM_TYPE && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="roomCount">{t.roomCount}</Label>
                <Select
                  value={String(form.roomCount)}
                  onValueChange={(v) => set({ roomCount: Number(v) })}
                >
                  <SelectTrigger id="roomCount" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: MAX_VENUE_ROOMS }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {t.rooms(n)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <SessionFields
            sessions={form.sessions}
            errors={errors}
            onChange={(sessions) => set({ sessions })}
          />
        </>,
      )}

      {section(
        3,
        t.sectionActivity,
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {field(
              'activityNature',
              t.activityNature,
              choose('activityNature', VENUE_ACTIVITY_NATURES, t.choose),
            )}
            {field(
              'activityMode',
              t.activityMode,
              choose('activityMode', VENUE_ACTIVITY_MODES, t.choose, (v) =>
                set({ activityMode: v, activityFee: '' }),
              ),
            )}
          </div>
          {form.activityMode === VENUE_PAID_MODE &&
            field(
              'activityFee',
              t.activityFee,
              <Input
                id="activityFee"
                type="number"
                min="0"
                step="0.5"
                placeholder="100"
                value={form.activityFee}
                aria-invalid={!!errors['activityFee']}
                onChange={(e) => set({ activityFee: e.target.value })}
              />,
              'max-w-[200px]',
            )}
          {field(
            'targetAudience',
            t.audience,
            <div className="flex flex-wrap gap-2" role="group" aria-label={t.audience}>
              {VENUE_AUDIENCES.map((a) => (
                <Button
                  key={a}
                  type="button"
                  size="sm"
                  className="rounded-full"
                  variant={form.targetAudience.includes(a) ? 'default' : 'outline'}
                  aria-pressed={form.targetAudience.includes(a)}
                  onClick={() => toggleAudience(a)}
                >
                  {choiceLabel(a, lang)}
                </Button>
              ))}
            </div>,
          )}
          {field(
            'attendanceRange',
            t.attendance,
            choose('attendanceRange', VENUE_ATTENDANCE_RANGES, t.attendancePlaceholder),
            'sm:max-w-[240px]',
          )}
        </>,
      )}

      {section(
        4,
        t.sectionDetails,
        <>
          {field(
            'description',
            t.description,
            <Textarea
              id="description"
              rows={4}
              value={form.description}
              placeholder={t.descriptionPlaceholder}
              aria-invalid={!!errors['description']}
              onChange={(e) => set({ description: e.target.value })}
            />,
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            {field('repName', t.repName, text('repName', t.repPlaceholder), 'sm:col-span-2')}
            {field('repTitle', t.title_, choose('repTitle', VENUE_TITLES, t.choose))}
          </div>
        </>,
      )}

      {failure && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {failure}
        </div>
      )}

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground">{t.submitNote}</p>
        <Button type="submit" size="lg" disabled={submitting} className="shrink-0">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitting ? t.submitting : t.submit}
          {!submitting && <ChevronRight className="size-4" />}
        </Button>
      </div>
    </form>
  );
}
