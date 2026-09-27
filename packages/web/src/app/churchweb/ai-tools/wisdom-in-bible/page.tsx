'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleDashed, Lightbulb, Loader2 } from 'lucide-react';
import { WISDOM_MEMBER_PATH, type WisdomMemberCycle } from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { SignInCard } from '@/components/church-site/sign-in-card';
import { useWisdomSiteT } from '@/components/church-site/wisdom-messages';
import { authFetch } from '@/lib/auth';

/** Wisdom in Bible for members: the published lessons by cycle, with progress. */
export default function WisdomCoursePage() {
  const t = useWisdomSiteT();
  const { user, isLoading } = useAuth();
  const [cycles, setCycles] = useState<WisdomMemberCycle[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    authFetch<{ data: WisdomMemberCycle[] }>('/api/v1/wisdom/cycles')
      .then((res) => setCycles(res.data))
      .catch(() => setFailed(true));
  }, [user]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Lightbulb className="size-7 text-amber-500" />
          {t.wisdomName}
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">{t.wisdomIntro}</p>
      </div>

      {isLoading || (user && !cycles && !failed) ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : !user ? (
        <SignInCard prompt={t.signInPrompt} label={t.signIn} returnTo={WISDOM_MEMBER_PATH} />
      ) : failed || !cycles ? (
        <p className="text-sm text-destructive">{t.loadFailed}</p>
      ) : cycles.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noModules}</p>
      ) : (
        cycles.map((cycle) => (
          <section key={cycle.id}>
            <h2 className="text-xl font-semibold">{cycle.title}</h2>
            {cycle.description && (
              <p className="mt-1 text-sm text-muted-foreground">{cycle.description}</p>
            )}
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {cycle.modules.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`${WISDOM_MEMBER_PATH}/${m.id}`}
                    className="flex h-full items-start gap-3 rounded-lg border px-4 py-3 hover:border-primary"
                  >
                    {m.completed ? (
                      <CheckCircle2
                        className="mt-0.5 size-5 shrink-0 text-emerald-600"
                        aria-label={t.completed}
                      />
                    ) : (
                      <CircleDashed
                        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                        aria-label={m.started ? t.started : undefined}
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block font-medium">{m.title}</span>
                      {m.subtitle && (
                        <span className="block text-sm text-muted-foreground">{m.subtitle}</span>
                      )}
                      {m.started && !m.completed && (
                        <span className="mt-1 block text-xs text-amber-600">{t.started}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
