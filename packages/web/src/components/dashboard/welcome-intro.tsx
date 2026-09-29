'use client';

import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useAuth, WELCOME_INTRO_PENDING_KEY } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useT, type Messages } from '@/lib/i18n';
import { BriefPlayer } from './brief-player';

const OPT_OUT_KEY = (userId: string) => `lc-welcome-intro-off:${userId}`;

const messages = {
  en: {
    title: 'Welcome to Light Church',
    ask: 'Would you like a brief introduction, read aloud? It takes about a minute.',
    yes: 'Yes, play it',
    notNow: 'Not now',
    never: 'Don’t ask again',
    close: 'Close',
    script: [
      'Welcome to Light Church. Light Church exists so that pastors, deacons and ministry teams can spend their hours where Jesus spent His: with people. It takes on the rosters, bulletins, minutes and reports, one small, trusted help at a time. AI prepares; a person listens, prays and decides.',
      'That is why we suggest you start with the AI Tools, before working with AI helper agents. Each tool does one useful thing, and you stay in charge of every step.',
      'Working with AI is a journey in how closely a person stays in the loop. As you learn to work with AI, you can give it more autonomy. Along the way you will also learn its weaknesses and mistakes. And your own role changes: less doing the work yourself, and more guiding, monitoring and giving direction.',
      'So every time you use a tool, it is also a learning exercise. I hope you enjoy it.',
    ],
  },
  'zh-TW': {
    title: '歡迎嚟到光教會',
    ask: '想唔想聽一段簡短嘅語音介紹？大約一分鐘。',
    yes: '好，播放',
    notNow: '遲啲先',
    never: '唔使再問',
    close: '關閉',
    script: [
      '歡迎嚟到光教會。光教會嘅心意，係等牧者、執事同事工團隊，可以將時間用喺耶穌最看重嘅地方，就係同人一齊。排班、週刊、會議記錄同報告呢啲行政工作，由光教會一步一步、一次一個可信任嘅幫助去分擔。AI 負責預備；由人聆聽、禱告同作決定。',
      '所以我哋建議你先由「AI 工具」開始，之後先同 AI 小幫手代理合作。每個工具只做一件有用嘅事，每一步都由你話事。',
      '同 AI 合作，其實係一個過程，睇下人喺迴路入面參與得幾深。你越識得同 AI 合作，就可以畀佢越多自主；過程中，你亦會認識佢嘅缺點同錯誤。而你自己嘅角色都會轉變：少啲親手做，多啲引導、監察同指示方向。',
      '所以每次用工具，都係一次學習。希望你享受呢個過程。',
    ],
  },
} satisfies Messages<{
  title: string;
  ask: string;
  yes: string;
  notNow: string;
  never: string;
  close: string;
  script: string[];
}>;

function readStorage(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: () => Storage, key: string, value: string | null) {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // Storage unavailable — the choice just isn't remembered.
  }
}

/**
 * After sign-in, asks once whether the user would like a spoken one-minute
 * introduction to Light Church, and reads it in English or Cantonese.
 */
export function WelcomeIntro() {
  const t = useT(messages);
  const { user } = useAuth();
  const [step, setStep] = useState<'closed' | 'ask' | 'play'>('closed');

  useEffect(() => {
    if (!user) return;
    if (readStorage(() => sessionStorage, WELCOME_INTRO_PENDING_KEY) === null) return;
    writeStorage(() => sessionStorage, WELCOME_INTRO_PENDING_KEY, null);
    if (readStorage(() => localStorage, OPT_OUT_KEY(user.sub)) === null) setStep('ask');
  }, [user]);

  const neverAgain = () => {
    if (user) writeStorage(() => localStorage, OPT_OUT_KEY(user.sub), '1');
    setStep('closed');
  };

  return (
    <Dialog open={step !== 'closed'} onOpenChange={(open) => !open && setStep('closed')}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="size-5 text-sky-500" />
            {t.title}
          </DialogTitle>
          {step === 'ask' && <DialogDescription>{t.ask}</DialogDescription>}
        </DialogHeader>
        {step === 'play' && <BriefPlayer paragraphs={t.script} autoPlay />}
        <DialogFooter className="gap-2 sm:justify-between">
          {step === 'ask' ? (
            <>
              <Button variant="ghost" onClick={neverAgain}>
                {t.never}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('closed')}>
                  {t.notNow}
                </Button>
                <Button onClick={() => setStep('play')}>{t.yes}</Button>
              </div>
            </>
          ) : (
            <Button className="sm:ml-auto" variant="outline" onClick={() => setStep('closed')}>
              {t.close}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
