'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Delete,
  Loader2,
  Mic,
  MicOff,
  Phone,
  User,
  X,
} from 'lucide-react';
import type {
  RollCallCheckIn,
  RollCallGroupDetail,
  RollCallKioskMatch,
  RollCallKioskResult,
  RollCallSessionDetail,
} from '@clawix/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth';
import { useSpeechInput } from '../../../conversations/use-speech-input';
import { digitsFrom, groupApi } from '../../roll-call-api';
import { useSmartT } from '../../smart-messages';

// Self check-in, after City Gospel Church's kiosk: type or say the last four
// digits of your phone, pick your name, confirm. Runs full-screen on a
// signed-in tablet at the door; the screen resets itself after each person.

type Step =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'pick'; matches: RollCallKioskMatch[] }
  | { kind: 'done'; result: RollCallKioskResult }
  | { kind: 'error'; message: string };

const RESET_SECONDS = 5;
const FEED_MS = 5000;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

export default function KioskPage() {
  const s = useSmartT();
  const { groupId } = useParams<{ groupId: string }>();
  const sessionId = useSearchParams().get('session');
  const api = groupApi(groupId);
  const [group, setGroup] = useState<RollCallGroupDetail | null>(null);
  const [session, setSession] = useState<RollCallSessionDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [digits, setDigits] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [feed, setFeed] = useState<RollCallCheckIn[]>([]);
  const [countdown, setCountdown] = useState(RESET_SECONDS);
  const [speechError, setSpeechError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const speech = useSpeechInput((text, isFinal) => {
    const heard = isFinal ? digitsFrom(text) : null;
    if (heard) setDigits(heard);
  });

  useEffect(() => {
    if (!sessionId) {
      setMissing(true);
      return;
    }
    Promise.all([
      authFetch<{ data: RollCallGroupDetail }>(api),
      authFetch<{ data: RollCallSessionDetail }>(`${api}/sessions/${sessionId}`),
    ])
      .then(([g, sess]) => {
        setGroup(g.data);
        setSession(sess.data);
      })
      .catch(() => setMissing(true));
  }, [api, sessionId]);

  // The log shows the latest few; the session gives the full count.
  const loadFeed = useCallback(() => {
    if (!sessionId) return;
    authFetch<{ data: RollCallCheckIn[] }>(`${api}/sessions/${sessionId}/check-ins`)
      .then((res) => setFeed(res.data))
      .catch(() => undefined);
    authFetch<{ data: RollCallSessionDetail }>(`${api}/sessions/${sessionId}`)
      .then((res) => setSession(res.data))
      .catch(() => undefined);
  }, [api, sessionId]);

  useEffect(() => {
    loadFeed();
    const id = setInterval(loadFeed, FEED_MS);
    return () => clearInterval(id);
  }, [loadFeed]);

  const reset = useCallback(() => {
    setDigits('');
    setStep({ kind: 'idle' });
    inputRef.current?.focus();
  }, []);

  // Look up as soon as four digits are in.
  useEffect(() => {
    if (digits.length !== 4 || step.kind !== 'idle' || !sessionId) return;
    setStep({ kind: 'searching' });
    authFetch<{ data: RollCallKioskMatch[] }>(`${api}/kiosk/lookup`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, digits }),
    })
      .then(({ data }) => {
        const [only] = data;
        if (!only) setStep({ kind: 'error', message: s.kioskNotFound });
        else if (data.length === 1 && only.checkedIn)
          setStep({ kind: 'done', result: { status: 'already', name: only.name } });
        else setStep({ kind: 'pick', matches: data });
      })
      .catch((err: unknown) =>
        setStep({ kind: 'error', message: err instanceof Error ? err.message : s.kioskNotFound }),
      );
  }, [api, digits, sessionId, step.kind, s.kioskNotFound]);

  // Finished screens reset themselves.
  useEffect(() => {
    if (step.kind !== 'done' && step.kind !== 'error') return;
    setCountdown(RESET_SECONDS);
    const id = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(id);
          reset();
          return RESET_SECONDS;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step.kind, reset]);

  const confirm = async (memberId: string) => {
    try {
      const { data } = await authFetch<{ data: RollCallKioskResult }>(`${api}/kiosk/check-in`, {
        method: 'POST',
        body: JSON.stringify({ sessionId, digits, memberId }),
      });
      setStep({ kind: 'done', result: data });
      loadFeed();
    } catch (err: unknown) {
      setStep({ kind: 'error', message: err instanceof Error ? err.message : s.kioskNotFound });
    }
  };

  const press = (key: (typeof KEYS)[number]) => {
    if (step.kind !== 'idle') return;
    if (key === 'clear') setDigits('');
    else if (key === 'back') setDigits((d) => d.slice(0, -1));
    else setDigits((d) => (d + key).slice(0, 4));
  };

  const toggleSpeech = () => {
    if (!speech.supported) {
      setSpeechError(true);
      return;
    }
    if (speech.listening) speech.stop();
    else speech.start();
  };

  const back = `/roll-call/${groupId}`;

  if (missing) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background p-6 text-center">
        <AlertCircle className="size-16 text-muted-foreground" />
        <p className="max-w-md text-xl font-semibold text-muted-foreground">{s.kioskNoSession}</p>
        <Button variant="outline" asChild>
          <Link href={back}>
            <ArrowLeft className="mr-2 size-4" />
            {s.kioskExit}
          </Link>
        </Button>
      </div>
    );
  }
  if (!group || !session) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Badge className="animate-pulse bg-emerald-600">{s.kioskLive}</Badge>
          <span className="truncate text-lg font-bold">
            {group.name} · {session.label || session.date}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{s.kioskCount(session.presentCount)}</Badge>
          <Button variant="ghost" size="icon" asChild aria-label={s.kioskExit} title={s.kioskExit}>
            <Link href={back}>
              <X className="size-5" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-y-auto md:grid-cols-2">
        <section className="flex flex-col items-center justify-center gap-6 border-b bg-muted/20 p-6 md:border-b-0 md:border-r">
          {step.kind === 'pick' ? (
            <div className="flex w-full max-w-md flex-col gap-4 text-center">
              <User className="mx-auto size-12 text-sky-600" />
              <h2 className="text-2xl font-bold">{s.kioskPick}</h2>
              {step.matches.map((m) => (
                <Button
                  key={m.id}
                  size="lg"
                  variant={m.checkedIn ? 'outline' : 'default'}
                  className="h-auto min-h-16 flex-col py-3 text-xl"
                  onClick={() =>
                    m.checkedIn
                      ? setStep({ kind: 'done', result: { status: 'already', name: m.name } })
                      : void confirm(m.id)
                  }
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="size-5" />
                    {m.name}
                  </span>
                  {m.department && <span className="text-sm opacity-80">{m.department}</span>}
                </Button>
              ))}
              <p className="text-sm text-muted-foreground">{s.kioskConfirm}</p>
              <Button variant="ghost" onClick={reset}>
                {s.clear}
              </Button>
            </div>
          ) : step.kind === 'done' ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="size-24 text-emerald-500" />
              <h2 className="text-4xl font-bold text-emerald-600">{s.kioskDone}</h2>
              <p className="text-xl text-muted-foreground">
                {step.result.status === 'already'
                  ? s.kioskAlready(step.result.name)
                  : s.kioskWelcome(step.result.name)}
              </p>
              <p className="text-sm text-muted-foreground">{s.kioskReset(countdown)}</p>
            </div>
          ) : step.kind === 'error' ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="size-16 text-destructive" />
              <h2 className="max-w-md text-2xl font-bold text-destructive">{step.message}</h2>
              <p className="text-sm text-muted-foreground">{s.kioskReset(countdown)}</p>
            </div>
          ) : (
            <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
              <Phone className="size-12 text-sky-600" />
              <h2 className="text-3xl font-bold">{s.kioskTitle}</h2>
              <p className="text-muted-foreground">{s.kioskPrompt}</p>
              <input
                ref={inputRef}
                autoFocus
                inputMode="numeric"
                aria-label={s.kioskPrompt}
                value={digits}
                disabled={step.kind === 'searching'}
                placeholder="0000"
                maxLength={4}
                onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="h-20 w-full rounded-lg border bg-background text-center font-mono text-5xl tracking-[1.5rem] text-sky-700 dark:text-sky-300"
              />
              <div className="grid w-full grid-cols-3 gap-2">
                {KEYS.map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    className="h-14 text-2xl"
                    aria-label={key === 'back' ? 'Backspace' : key === 'clear' ? s.clear : key}
                    onClick={() => press(key)}
                  >
                    {key === 'back' ? (
                      <Delete className="size-6" />
                    ) : key === 'clear' ? (
                      <span className="text-base">{s.clear}</span>
                    ) : (
                      key
                    )}
                  </Button>
                ))}
              </div>
              <Button
                variant={speech.listening ? 'destructive' : 'outline'}
                className="h-12 rounded-full px-6"
                onClick={toggleSpeech}
              >
                {speech.listening ? (
                  <MicOff className="mr-2 size-5" />
                ) : (
                  <Mic className="mr-2 size-5" />
                )}
                {speech.listening ? s.kioskListening : s.kioskSpeak}
              </Button>
              {speechError && <p className="text-sm text-muted-foreground">{s.kioskNoSpeech}</p>}
              {step.kind === 'searching' && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  {s.kioskSearching}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 p-6">
          <h3 className="flex items-center gap-2 font-semibold">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            {s.kioskLog}
          </h3>
          {feed.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{s.kioskWaiting}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {feed.map((c) => (
                <li
                  key={c.memberId}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <User className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{c.name}</span>
                    {c.method === 'kiosk' && <Badge variant="outline">{s.kioskByKiosk}</Badge>}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {new Date(c.markedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
