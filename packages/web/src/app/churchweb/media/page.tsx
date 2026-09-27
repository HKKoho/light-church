import type { Metadata } from 'next';
import { MediaCard } from '@/components/church-site/site-cards';
import { L } from '@/components/church-site/site-label';
import { getPublicMedia } from '@/lib/church-site';

export const metadata: Metadata = { title: 'Sermons & Media' };

export default async function ChurchMediaPage() {
  const media = await getPublicMedia();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">
        <L k="media" />
      </h1>
      <p className="mt-2 text-muted-foreground">
        <L k="mediaIntro" />
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {media.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            <L k="noMedia" />
          </p>
        ) : (
          media.map((m) => <MediaCard key={m.id} item={m} full />)
        )}
      </div>
    </div>
  );
}
