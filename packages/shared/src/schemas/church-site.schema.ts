import { z } from 'zod';

// Church Website: the church's public site at /churchweb, imported from its
// existing website and extended with events, media, rent and a members area.
// One church per Light Church install, so there is a single site.

/** Import the site, edit settings and pages. */
export const SITE_ADMIN_ROLES: readonly string[] = ['super_admin', 'senior_pastor', 'admin_staff'];

/** Publish events and media. */
export const SITE_EDITOR_ROLES: readonly string[] = [
  ...SITE_ADMIN_ROLES,
  'pastor',
  'ministry_leader',
];

export const SITE_VISIBILITIES = ['public', 'members', 'hidden'] as const;
export type SiteVisibility = (typeof SITE_VISIBILITIES)[number];

export const SITE_MEDIA_KINDS = ['video', 'audio', 'document', 'link'] as const;
export type SiteMediaKind = (typeof SITE_MEDIA_KINDS)[number];

export const SITE_IMPORT_STATUSES = ['idle', 'running', 'done', 'failed'] as const;
export type SiteImportStatus = (typeof SITE_IMPORT_STATUSES)[number];

/** Base path of the public site in the web app. */
export const CHURCH_SITE_BASE = '/churchweb';

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional().default('');
const httpUrl = z
  .string()
  .trim()
  .url()
  .max(2000)
  .refine((u) => /^https?:\/\//i.test(u), 'Use an http(s) link');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const visibility = z.enum(SITE_VISIBILITIES);

/** A page path under /churchweb: segments of letters (any script), digits, - or _. */
export const siteSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[\p{L}\p{N}_-]+(\/[\p{L}\p{N}_-]+)*$/u, 'Letters, digits, - and _ separated by /');

/** Either an internal /churchweb path or an outside http(s) link. */
const navHref = z
  .string()
  .trim()
  .max(2000)
  .refine((h) => h.startsWith(CHURCH_SITE_BASE) || /^https?:\/\//i.test(h), 'Invalid link');

const navLink = z.object({ label: text(80), href: navHref });
export const siteNavItemSchema = navLink.extend({
  children: z.array(navLink).max(30).default([]),
});
export type SiteNavItem = z.infer<typeof siteNavItemSchema>;

export const siteContactSchema = z.object({
  locations: z
    .array(
      z.object({
        name: optionalText(100),
        address: optionalText(300),
        phone: optionalText(40),
      }),
    )
    .max(10)
    .default([]),
  email: optionalText(200),
  phone: optionalText(40),
});
export type SiteContact = z.infer<typeof siteContactSchema>;

export const siteServiceTimeSchema = z.object({ label: text(100), time: text(100) });
export type SiteServiceTime = z.infer<typeof siteServiceTimeSchema>;

export const importChurchSiteSchema = z.object({ url: httpUrl });
export type ImportChurchSiteInput = z.infer<typeof importChurchSiteSchema>;

export const updateChurchSiteSchema = z.object({
  churchName: text(120),
  tagline: optionalText(300),
  logoUrl: z.union([httpUrl, z.literal('')]).default(''),
  nav: z.array(siteNavItemSchema).max(20),
  contact: siteContactSchema,
  serviceTimes: z.array(siteServiceTimeSchema).max(20),
  published: z.boolean(),
});
export type UpdateChurchSiteInput = z.infer<typeof updateChurchSiteSchema>;

export const saveSitePageSchema = z.object({
  slug: siteSlugSchema,
  title: text(200),
  markdown: z.string().max(200_000),
  visibility,
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});
export type SaveSitePageInput = z.infer<typeof saveSitePageSchema>;

export const saveSiteEventSchema = z.object({
  title: text(200),
  date: isoDate,
  time: optionalText(40),
  location: optionalText(200),
  description: z.string().max(10_000).default(''),
  registrationUrl: z.union([httpUrl, z.literal('')]).default(''),
  visibility,
});
export type SaveSiteEventInput = z.infer<typeof saveSiteEventSchema>;

export const saveSiteMediaSchema = z.object({
  title: text(200),
  kind: z.enum(SITE_MEDIA_KINDS),
  url: httpUrl,
  speaker: optionalText(100),
  date: isoDate,
  description: z.string().max(5000).default(''),
  visibility,
});
export type SaveSiteMediaInput = z.infer<typeof saveSiteMediaSchema>;

export interface ChurchSiteInfo {
  readonly sourceUrl: string | null;
  readonly churchName: string;
  readonly tagline: string;
  readonly logoUrl: string;
  readonly nav: SiteNavItem[];
  readonly contact: SiteContact;
  readonly serviceTimes: SiteServiceTime[];
  readonly published: boolean;
  readonly importStatus: SiteImportStatus;
  readonly importError: string | null;
  readonly importedAt: string | null;
}

export interface SitePageSummary {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly visibility: SiteVisibility;
  readonly sortOrder: number;
  readonly sourceUrl: string | null;
  readonly edited: boolean;
  readonly updatedAt: string;
}

export interface SitePageDetail extends SitePageSummary {
  readonly markdown: string;
}

export interface SiteEventInfo extends Required<SaveSiteEventInput> {
  readonly id: string;
}

export interface SiteMediaInfo extends Required<SaveSiteMediaInput> {
  readonly id: string;
}

/** What the public site needs for its layout (header, footer) and home page. */
export interface PublicChurchSite {
  readonly site: Omit<ChurchSiteInfo, 'importStatus' | 'importError' | 'sourceUrl'>;
  readonly pages: Pick<SitePageSummary, 'slug' | 'title'>[];
}

/** Everything a signed-in member can see beyond the public site. */
export interface MembersChurchSite {
  readonly pages: Pick<SitePageSummary, 'slug' | 'title'>[];
  readonly events: SiteEventInfo[];
  readonly media: SiteMediaInfo[];
}
