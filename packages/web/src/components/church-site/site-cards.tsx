import {
  CalendarDays,
  Clock,
  ExternalLink,
  FileText,
  Headphones,
  Link2,
  MapPin,
  PlayCircle,
} from 'lucide-react';
import type { SiteEventInfo, SiteMediaInfo, SiteMediaKind } from '@clawix/shared';
import { L, MediaKindLabel } from './site-label';
import { SiteMarkdown } from './site-markdown';

export function EventCard({ event, full = false }: { event: SiteEventInfo; full?: boolean }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <h3 className="font-semibold">{event.title}</h3>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarDays className="size-4" />
          {event.date}
        </span>
        {event.time && (
          <span className="flex items-center gap-1">
            <Clock className="size-4" />
            {event.time}
          </span>
        )}
        {event.location && (
          <span className="flex items-center gap-1">
            <MapPin className="size-4" />
            {event.location}
          </span>
        )}
      </div>
      {full && event.description && <SiteMarkdown markdown={event.description} />}
      {event.registrationUrl && (
        <a
          href={event.registrationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex w-fit items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <L k="register" />
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </article>
  );
}

const KIND_ICON: Record<SiteMediaKind, typeof PlayCircle> = {
  video: PlayCircle,
  audio: Headphones,
  document: FileText,
  link: Link2,
};

/** The YouTube video id in a watch, youtu.be or embed link. */
export function youtubeId(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(
    url,
  );
  return m?.[1] ?? null;
}

export function MediaCard({ item, full = false }: { item: SiteMediaInfo; full?: boolean }) {
  const Icon = KIND_ICON[item.kind];
  const yt = item.kind === 'video' ? youtubeId(item.url) : null;
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border bg-card">
      {yt && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block aspect-video bg-muted"
        >
          <img
            src={`https://img.youtube.com/vi/${yt}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        </a>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Icon className="size-3.5" />
          <MediaKindLabel kind={item.kind} /> · {item.date}
          {item.speaker && ` · ${item.speaker}`}
        </span>
        <h3 className="font-semibold">{item.title}</h3>
        {full && item.description && <SiteMarkdown markdown={item.description} />}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <L k="watch" />
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </article>
  );
}
