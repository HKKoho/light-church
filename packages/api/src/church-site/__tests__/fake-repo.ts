import { vi } from 'vitest';

import type { ChurchSiteRepository } from '../../db/church-site.repository.js';

type Row = Record<string, unknown> & { id: string; slug: string; editedAt: Date | null };

/** In-memory stand-in for ChurchSiteRepository. */
export function fakeChurchSiteRepo() {
  let site: Record<string, unknown> = {
    id: 'default',
    sourceUrl: null,
    churchName: '',
    tagline: '',
    logoUrl: '',
    nav: [],
    contact: {},
    serviceTimes: [],
    published: false,
    importStatus: 'idle',
    importError: null,
    importedAt: null,
    updatedAt: new Date(),
  };
  const pages = new Map<string, Row>();
  let seq = 0;
  const repo = {
    pages,
    get site() {
      return site;
    },
    getSite: vi.fn(async () => site),
    updateSite: vi.fn(async (data: Record<string, unknown>) => {
      site = { ...site, ...data };
      return site;
    }),
    claimImport: vi.fn(async (sourceUrl: string) => {
      if (site['importStatus'] === 'running') return false;
      site = { ...site, importStatus: 'running', importError: null, sourceUrl };
      return true;
    }),
    listPages: vi.fn(async (visibility?: string[]) =>
      [...pages.values()]
        .filter((p) => !visibility || visibility.includes(p['visibility'] as string))
        .sort((a, b) => (a['sortOrder'] as number) - (b['sortOrder'] as number)),
    ),
    findPage: vi.fn(async (id: string) => pages.get(id) ?? null),
    findPageBySlug: vi.fn(
      async (slug: string) => [...pages.values()].find((p) => p.slug === slug) ?? null,
    ),
    createPage: vi.fn(async (data: Record<string, unknown>) => {
      const row: Row = {
        visibility: 'public',
        sortOrder: 0,
        sourceUrl: null,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
        id: `p${++seq}`,
        slug: data['slug'] as string,
      };
      pages.set(row.id, row);
      return row;
    }),
    updatePage: vi.fn(async (id: string, data: Record<string, unknown>) => {
      const row = { ...pages.get(id)!, ...data, updatedAt: new Date() } as Row;
      pages.set(id, row);
      return row;
    }),
    deletePage: vi.fn(async (id: string) => {
      const row = pages.get(id)!;
      pages.delete(id);
      return row;
    }),
  };
  return repo as typeof repo & ChurchSiteRepository;
}
