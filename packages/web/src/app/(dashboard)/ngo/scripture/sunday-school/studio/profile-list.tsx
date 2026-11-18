'use client';

import { useState } from 'react';
import { Pencil, Plus, Users } from 'lucide-react';
import type { SundaySchoolProfileInfo } from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/auth';
import { useStudioT } from './messages';
import { useOptionLabels } from './options';
import { ProfileDialog } from './profile-dialog';
import { API, DeleteButton, errorMessage } from './shared';

/** Class profiles: who each course is written for. */
export function ProfileList({
  profiles,
  onChange,
  onError,
}: {
  profiles: SundaySchoolProfileInfo[];
  onChange: (profiles: SundaySchoolProfileInfo[]) => void;
  onError: (message: string | null) => void;
}) {
  const t = useStudioT();
  const o = useOptionLabels();
  const [editing, setEditing] = useState<SundaySchoolProfileInfo | 'new' | null>(null);

  const remove = async (profile: SundaySchoolProfileInfo) => {
    try {
      await authFetch(`${API}/profiles/${profile.id}`, { method: 'DELETE' });
      onChange(profiles.filter((p) => p.id !== profile.id));
    } catch (err) {
      onError(errorMessage(err, t.failed));
    }
  };

  const saved = (profile: SundaySchoolProfileInfo) => {
    setEditing(null);
    const exists = profiles.some((p) => p.id === profile.id);
    onChange(
      exists ? profiles.map((p) => (p.id === profile.id ? profile : p)) : [...profiles, profile],
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <Button className="w-fit" onClick={() => setEditing('new')}>
        <Plus className="size-4" />
        {t.newProfile}
      </Button>
      {profiles.length === 0 && <p className="text-sm text-muted-foreground">{t.noProfiles}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <Card key={p.id} className="gap-2 py-4">
            <CardHeader className="px-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate">{p.name}</span>
                <div className="ml-auto flex shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`${t.edit} ${p.name}`}
                    onClick={() => setEditing(p)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  {p.courseCount === 0 && (
                    <DeleteButton name={p.name} body="" onConfirm={() => void remove(p)} />
                  )}
                </div>
              </CardTitle>
              <CardDescription className="text-xs">
                {[
                  o.ageStage[p.ageStage],
                  o.maturity[p.spiritualMaturity],
                  o.translation[p.bibleTranslation],
                ].join(' · ')}
              </CardDescription>
              <p className="text-xs text-muted-foreground">
                {o.tradition[p.tradition]} · {t.minutes(p.defaultDurationMinutes)} ·{' '}
                {t.usedBy(p.courseCount)}
              </p>
            </CardHeader>
          </Card>
        ))}
      </div>
      <ProfileDialog profile={editing} onClose={() => setEditing(null)} onSaved={saved} />
    </div>
  );
}
