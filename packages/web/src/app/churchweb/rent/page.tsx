'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRentT } from './messages';
import { VenueApplicationForm } from './venue-application-form';

/**
 * Public "Rent a Church Place" form — no sign-in. Submissions go to the
 * throttled public API route and are reviewed by staff at /venue-rental.
 */
export default function RentPage() {
  const t = useRentT();
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
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
    </div>
  );
}
