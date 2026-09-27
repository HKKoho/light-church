'use client';

import { useState } from 'react';
import { CheckCircle2, GalleryVerticalEnd, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { useRentT } from './messages';
import { VenueApplicationForm } from './venue-application-form';

/**
 * Public "Rent a Church Place" form — no sign-in. Listed in middleware.ts's
 * PUBLIC_PATHS; submissions go to the throttled public API route and are
 * reviewed by staff at /venue-rental.
 */
export default function RentPage() {
  const t = useRentT();
  const { toggleLang } = useLanguage();
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 font-medium">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </span>
            {t.brand}
          </span>
          <Button variant="ghost" size="sm" onClick={toggleLang}>
            <Languages className="size-4" />
            {t.switchLanguage}
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <CheckCircle2 className="size-16 text-green-500" />
            <h2 className="text-2xl font-bold">{t.doneTitle}</h2>
            <p className="max-w-sm text-muted-foreground">{t.doneBody}</p>
            <Button variant="outline" onClick={() => setSubmitted(false)}>
              {t.another}
            </Button>
          </div>
        ) : (
          <VenueApplicationForm onSubmitted={() => setSubmitted(true)} />
        )}
      </main>
    </div>
  );
}
