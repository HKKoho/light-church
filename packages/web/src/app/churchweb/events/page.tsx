import type { Metadata } from 'next';
import { EventCard } from '@/components/church-site/site-cards';
import { L } from '@/components/church-site/site-label';
import { getPublicEvents } from '@/lib/church-site';

export const metadata: Metadata = { title: 'Events' };

export default async function ChurchEventsPage() {
  const events = await getPublicEvents();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">
        <L k="events" />
      </h1>
      <p className="mt-2 text-muted-foreground">
        <L k="eventsIntro" />
      </p>
      <div className="mt-8 flex flex-col gap-4">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            <L k="noEvents" />
          </p>
        ) : (
          events.map((e) => <EventCard key={e.id} event={e} full />)
        )}
      </div>
    </div>
  );
}
