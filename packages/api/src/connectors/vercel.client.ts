// packages/api/src/connectors/vercel.client.ts
//
// Deploys one static HTML page to Vercel through the REST API. Each event gets
// its own project (`<prefix>-<slug>`) so its production alias stays public and
// stable — Vercel's per-deployment URLs sit behind Vercel Authentication by default.
import { BadGatewayException } from '@nestjs/common';
import type { PublishedQrPage } from '@clawix/shared';

import type { VercelCredentials } from './connector-settings.service.js';

const API = 'https://api.vercel.com';
const POLL_INTERVAL_MS = 1_500;
const POLL_ATTEMPTS = 20;

type Fetch = typeof fetch;

interface Deployment {
  id: string;
  url: string;
  readyState?: string;
  alias?: string[];
}

/** Vercel project name for an event: lower-case, dashes, at most 100 chars. */
export function projectNameFor(prefix: string, eventName: string, suffix: string): string {
  const slug = eventName
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return [prefix, slug, suffix].filter(Boolean).join('-').slice(0, 100);
}

export class VercelClient {
  constructor(
    private readonly creds: VercelCredentials,
    private readonly fetchFn: Fetch = fetch,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}

  private url(path: string): string {
    const team = this.creds.teamId ? `?teamId=${encodeURIComponent(this.creds.teamId)}` : '';
    return `${API}${path}${team}`;
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.fetchFn(this.url(path), {
      ...init,
      headers: { Authorization: `Bearer ${this.creds.token}`, 'Content-Type': 'application/json' },
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const err = body['error'] as { message?: string } | undefined;
      throw new BadGatewayException(`Vercel deploy failed: ${err?.message ?? res.statusText}`);
    }
    return body as T;
  }

  async deployPage(projectName: string, html: string): Promise<PublishedQrPage> {
    let dep = await this.call<Deployment>('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify({
        name: projectName,
        target: 'production',
        files: [{ file: 'index.html', data: html }],
        projectSettings: { framework: null },
      }),
    });

    for (let i = 0; i < POLL_ATTEMPTS && dep.readyState !== 'READY'; i++) {
      if (dep.readyState === 'ERROR' || dep.readyState === 'CANCELED') {
        throw new BadGatewayException(`Vercel deploy failed: ${dep.readyState}`);
      }
      await this.sleep(POLL_INTERVAL_MS);
      dep = await this.call<Deployment>(`/v13/deployments/${dep.id}`);
    }

    const host = dep.alias?.find((a) => a.endsWith('.vercel.app')) ?? dep.alias?.[0] ?? dep.url;
    return { url: `https://${host}`, deploymentId: dep.id };
  }
}
