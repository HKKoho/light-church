// packages/api/src/connectors/__tests__/vercel.client.test.ts
import { describe, expect, it, vi } from 'vitest';

import { VercelClient, projectNameFor } from '../vercel.client.js';

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const creds = { token: 'vc', teamId: 'team_1', projectName: 'events' };
const noSleep = async () => {};

describe('projectNameFor', () => {
  it('slugs the event name into a valid project name', () => {
    expect(projectNameFor('events', 'Youth Camp 2026!', 'a1b2c3')).toBe(
      'events-youth-camp-2026-a1b2c3',
    );
    expect(projectNameFor('events', '青年營會', 'a1b2c3')).toBe('events-a1b2c3');
  });
});

describe('VercelClient', () => {
  it('deploys, waits until ready and returns the public alias', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        ok({ id: 'dpl_1', url: 'events-abc.vercel.app', readyState: 'BUILDING' }),
      )
      .mockResolvedValueOnce(
        ok({
          id: 'dpl_1',
          url: 'events-abc.vercel.app',
          readyState: 'READY',
          alias: ['events.vercel.app'],
        }),
      );
    const result = await new VercelClient(creds, fetchFn, noSleep).deployPage('events', '<html>');
    expect(result).toEqual({ url: 'https://events.vercel.app', deploymentId: 'dpl_1' });
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.vercel.com/v13/deployments?teamId=team_1');
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: 'events',
      target: 'production',
      files: [{ file: 'index.html', data: '<html>' }],
    });
  });

  it('fails on a deployment error or an API error', async () => {
    const errored = vi.fn().mockResolvedValue(ok({ id: 'd', url: 'x', readyState: 'ERROR' }));
    await expect(
      new VercelClient({ ...creds, teamId: null }, errored, noSleep).deployPage('p', ''),
    ).rejects.toThrow('ERROR');

    const denied = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Bad token' } }), { status: 403 }),
      );
    await expect(new VercelClient(creds, denied, noSleep).deployPage('p', '')).rejects.toThrow(
      'Vercel deploy failed: Bad token',
    );
  });
});
