// packages/api/src/church-site/site-profile.ts
//
// The church's name, tagline, service times and contact details. An AI model
// reads them off the home and contact pages; without an AI provider (or if
// its reply is unusable) we keep what the page markup gives away.
import { z } from 'zod';
import {
  createLogger,
  siteContactSchema,
  siteServiceTimeSchema,
  type SiteContact,
  type SiteServiceTime,
} from '@clawix/shared';

import type { OneShotLlmService } from '../engine/one-shot/one-shot-llm.service.js';
import type { SiteMeta } from './site-extractor.js';

const logger = createLogger('church-site:profile');

/** Keep the prompt small: the facts are near the top of these pages. */
const MAX_PAGE_CHARS = 6000;

export interface SiteProfile {
  readonly churchName: string;
  readonly tagline: string;
  readonly serviceTimes: SiteServiceTime[];
  readonly contact: SiteContact;
}

const SYSTEM_PROMPT = `You read a church website and return its key facts as JSON.
Reply with ONLY a JSON object, no prose, in this shape:
{"churchName": string, "tagline": string,
 "serviceTimes": [{"label": string, "time": string}],
 "contact": {"locations": [{"name": string, "address": string, "phone": string}],
             "email": string, "phone": string}}
Copy names, addresses and times exactly as written on the site, in the site's own language.
Use "" or [] when the site does not say. Never invent details.`;

const aiReplySchema = z.object({
  churchName: z.string().trim().max(120).catch(''),
  tagline: z.string().trim().max(300).catch(''),
  serviceTimes: z
    .array(z.unknown())
    .catch([])
    .transform((items) =>
      items.flatMap((i) => {
        const r = siteServiceTimeSchema.safeParse(i);
        return r.success ? [r.data] : [];
      }),
    ),
  contact: siteContactSchema.catch({ locations: [], email: '', phone: '' }),
});

/** The first JSON object in a model reply, or null. */
export function parseProfileReply(reply: string): z.infer<typeof aiReplySchema> | null {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = aiReplySchema.safeParse(JSON.parse(reply.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** What we know without AI: the markup's name, description, mailto and tel links. */
export function fallbackProfile(meta: SiteMeta): SiteProfile {
  return {
    churchName: meta.churchName,
    tagline: meta.tagline,
    serviceTimes: [],
    contact: { locations: [], email: meta.emails[0] ?? '', phone: meta.phones[0] ?? '' },
  };
}

export async function buildProfile(
  meta: SiteMeta,
  pages: readonly { title: string; markdown: string }[],
  llm: OneShotLlmService,
  userId: string,
): Promise<SiteProfile> {
  const fallback = fallbackProfile(meta);
  const prompt = pages
    .map((p) => `# ${p.title}\n\n${p.markdown.slice(0, MAX_PAGE_CHARS)}`)
    .join('\n\n---\n\n');
  try {
    const reply = await llm.complete({
      system: SYSTEM_PROMPT,
      prompt: `Church website pages:\n\n${prompt}`,
      userId,
      usageTag: 'ai-tool:church-site',
      temperature: 0,
    });
    const ai = parseProfileReply(reply);
    if (!ai) {
      logger.warn('AI profile reply was not usable; using page markup only');
      return fallback;
    }
    return {
      churchName: ai.churchName || fallback.churchName,
      tagline: ai.tagline || fallback.tagline,
      serviceTimes: ai.serviceTimes,
      contact: {
        locations: ai.contact.locations,
        email: ai.contact.email || fallback.contact.email,
        phone: ai.contact.phone || fallback.contact.phone,
      },
    };
  } catch (err) {
    logger.warn({ err: String(err) }, 'AI profile unavailable; using page markup only');
    return fallback;
  }
}
