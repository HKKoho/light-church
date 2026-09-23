import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TOOL_FETCH_RESULT,
  TOOL_SERVER_UNAVAILABLE,
  TOOL_STORAGE_MESSAGE,
  buildToolSrcDoc,
  isToolFetchRequest,
  isToolStorageMessage,
} from '../ai-tool-storage-bridge';

function extractShim(srcDoc: string): string {
  const match = /<script>([\s\S]*?)<\/script>/.exec(srcDoc);
  if (!match?.[1]) throw new Error('shim not found');
  return match[1];
}

describe('buildToolSrcDoc', () => {
  it('injects the shim right after <head>, before the tool’s own scripts', () => {
    const html = '<!DOCTYPE html><html><head><script src="app.js"></script></head><body/></html>';
    const out = buildToolSrcDoc(html, {});
    expect(out.indexOf('light-church:ai-tool-storage')).toBeLessThan(out.indexOf('app.js'));
    expect(out.startsWith('<!DOCTYPE html><html><head><script>')).toBe(true);
  });

  it('adds a <head> when the tool has none, or prepends for fragments', () => {
    expect(buildToolSrcDoc('<html><body>x</body></html>', {})).toMatch(
      /^<html><head><script>[\s\S]*<\/script><\/head><body>x/,
    );
    expect(buildToolSrcDoc('<p>x</p>', {})).toMatch(/^<script>[\s\S]*<\/script><p>x<\/p>$/);
  });

  it('cannot be broken out of by saved data containing </script>', () => {
    const out = buildToolSrcDoc('<head></head>', { k: '</script><script>alert(1)</script>' });
    expect(out.match(/<\/script>/g)).toHaveLength(1);
  });
});

describe('storage shim at runtime', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage');

  afterEach(() => {
    if (original) Object.defineProperty(window, 'localStorage', original);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('serves the saved snapshot and posts changes to the parent', () => {
    vi.useFakeTimers();
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);
    new Function(extractShim(buildToolSrcDoc('<head></head>', { roll: '{"members":[1]}' })))();

    expect(window.localStorage.getItem('roll')).toBe('{"members":[1]}');
    expect(window.localStorage.getItem('missing')).toBeNull();

    window.localStorage.setItem('roll', '{"members":[1,2]}');
    window.localStorage.removeItem('other');
    expect(window.localStorage.length).toBe(1);
    expect(post).not.toHaveBeenCalled(); // debounced

    vi.advanceTimersByTime(300);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      { type: TOOL_STORAGE_MESSAGE, data: { roll: '{"members":[1,2]}' } },
      '*',
    );
  });
});

describe('fetch forwarding at runtime', () => {
  const originalFetch = window.fetch;
  afterEach(() => {
    window.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('forwards relative-URL fetches to the parent and resolves with its reply', async () => {
    const passthrough = vi.fn(async () => new Response('ok'));
    window.fetch = passthrough as unknown as typeof fetch;
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);
    new Function(extractShim(buildToolSrcDoc('<head></head>', {})))();

    const pending = window.fetch('/api/analyze-bulletins', { method: 'post', body: '{"a":1}' });
    const request = post.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(isToolFetchRequest(request)).toBe(true);
    expect(request).toMatchObject({
      url: '/api/analyze-bulletins',
      method: 'POST',
      body: '{"a":1}',
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        data: { type: TOOL_FETCH_RESULT, id: request['id'], status: 503, body: '{"error":"x"}' },
      }),
    );
    const res = await pending;
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'x' });
    expect(passthrough).not.toHaveBeenCalled();

    await window.fetch('https://fonts.googleapis.com/css2');
    expect(passthrough).toHaveBeenCalledTimes(1);
  });

  it('falls back to a 503 explanation if the parent never answers', async () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);
    new Function(extractShim(buildToolSrcDoc('<head></head>', {})))();

    const pending = window.fetch('/api/anything');
    vi.advanceTimersByTime(120_000);
    const res = await pending;
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe(TOOL_SERVER_UNAVAILABLE);
  });
});

describe('isToolStorageMessage', () => {
  it('accepts only well-formed string maps', () => {
    expect(isToolStorageMessage({ type: TOOL_STORAGE_MESSAGE, data: { a: 'b' } })).toBe(true);
    expect(isToolStorageMessage({ type: TOOL_STORAGE_MESSAGE, data: { a: 1 } })).toBe(false);
    expect(isToolStorageMessage({ type: TOOL_STORAGE_MESSAGE, data: ['a'] })).toBe(false);
    expect(isToolStorageMessage({ type: 'other', data: {} })).toBe(false);
    expect(isToolStorageMessage(null)).toBe(false);
  });
});
