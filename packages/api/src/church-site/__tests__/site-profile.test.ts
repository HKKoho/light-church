import { describe, expect, it, vi } from 'vitest';

import type { OneShotLlmService } from '../../engine/one-shot/one-shot-llm.service.js';
import type { SiteMeta } from '../site-extractor.js';
import { buildProfile, fallbackProfile, parseProfileReply } from '../site-profile.js';

const meta: SiteMeta = {
  churchName: 'Example Church',
  tagline: 'A church in the city',
  logoUrl: '',
  emails: ['hello@example.org'],
  phones: ['12345678'],
};
const pages = [{ title: 'Home', markdown: 'Sunday worship 10:30am' }];
const llm = (reply: string | Error) =>
  ({
    complete: vi.fn(async () => {
      if (reply instanceof Error) throw reply;
      return reply;
    }),
  }) as unknown as OneShotLlmService;

describe('parseProfileReply', () => {
  it('reads JSON inside prose and drops bad service times', () => {
    const reply = `Here you go:\n{"churchName":"茶果嶺浸信會","tagline":"","serviceTimes":[{"label":"主日崇拜","time":"9:45"},{"label":""}],"contact":{"locations":[{"name":"茶果嶺堂","address":"茶果嶺道161號","phone":"2717-1325"}],"email":"a@b.org","phone":""}}`;
    expect(parseProfileReply(reply)).toEqual({
      churchName: '茶果嶺浸信會',
      tagline: '',
      serviceTimes: [{ label: '主日崇拜', time: '9:45' }],
      contact: {
        locations: [{ name: '茶果嶺堂', address: '茶果嶺道161號', phone: '2717-1325' }],
        email: 'a@b.org',
        phone: '',
      },
    });
  });

  it('returns null without usable JSON', () => {
    expect(parseProfileReply('no json here')).toBeNull();
    expect(parseProfileReply('{not json}')).toBeNull();
  });
});

describe('buildProfile', () => {
  it('uses the AI reply, filling gaps from the page markup', async () => {
    const service = llm('{"churchName":"","serviceTimes":[{"label":"Worship","time":"10:30"}]}');
    const profile = await buildProfile(meta, pages, service, 'user-1');
    expect(profile).toEqual({
      churchName: 'Example Church',
      tagline: 'A church in the city',
      serviceTimes: [{ label: 'Worship', time: '10:30' }],
      contact: { locations: [], email: 'hello@example.org', phone: '12345678' },
    });
    expect(service.complete).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', usageTag: 'ai-tool:church-site' }),
    );
  });

  it('falls back to the markup when AI is unavailable or unusable', async () => {
    expect(await buildProfile(meta, pages, llm(new Error('no provider')), 'u')).toEqual(
      fallbackProfile(meta),
    );
    expect(await buildProfile(meta, pages, llm('sorry'), 'u')).toEqual(fallbackProfile(meta));
  });
});
