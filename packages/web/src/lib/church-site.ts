import type {
  PublicChurchSite,
  SiteEventInfo,
  SiteMediaInfo,
  SitePageDetail,
} from '@clawix/shared';

// Server-side reads for the public /churchweb pages. In Docker the web
// container reaches the API over the compose network (API_INTERNAL_URL);
// in development both run on localhost.
const API =
  process.env['API_INTERNAL_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

/** Public site content changes rarely: refresh at most once a minute. */
const REVALIDATE_SECONDS = 60;

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}/api/v1/public/site${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data: T };
    return body.data;
  } catch {
    // API down: pages render their empty state instead of crashing.
    return null;
  }
}

export const getPublicSite = () => get<PublicChurchSite>('');
export const getPublicPage = (slug: string) =>
  get<SitePageDetail>(`/page?slug=${encodeURIComponent(slug)}`);
export const getPublicEvents = async () => (await get<SiteEventInfo[]>('/events')) ?? [];
export const getPublicMedia = async () => (await get<SiteMediaInfo[]>('/media')) ?? [];
