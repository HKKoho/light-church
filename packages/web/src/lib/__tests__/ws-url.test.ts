import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveWsBase } from '../ws-url';

describe('resolveWsBase', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers NEXT_PUBLIC_WS_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_WS_URL', 'ws://localhost:3011/');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:9999');
    expect(resolveWsBase()).toBe('ws://localhost:3011');
  });

  it('derives the socket URL from NEXT_PUBLIC_API_URL when WS is unset or empty', () => {
    vi.stubEnv('NEXT_PUBLIC_WS_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3011');
    expect(resolveWsBase()).toBe('ws://localhost:3011');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://church.example.org/');
    expect(resolveWsBase()).toBe('wss://church.example.org');
  });

  it('falls back to the page host on :3001 when neither is set', () => {
    vi.stubEnv('NEXT_PUBLIC_WS_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    expect(resolveWsBase()).toBe(`ws://${window.location.hostname}:3001`);
  });
});
