import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TOOL_SERVER_UNAVAILABLE,
  TOOL_STORAGE_MESSAGE,
  buildToolSrcDoc,
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

describe('fetch guard at runtime', () => {
  const originalFetch = window.fetch;
  afterEach(() => {
    window.fetch = originalFetch;
  });

  it('answers relative-URL fetches with a 503 explaining server features are off', async () => {
    const passthrough = vi.fn(async () => new Response('ok'));
    window.fetch = passthrough as unknown as typeof fetch;
    new Function(extractShim(buildToolSrcDoc('<head></head>', {})))();

    const res = await window.fetch('/api/analyze-bulletins', { method: 'POST' });
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe(TOOL_SERVER_UNAVAILABLE);
    expect(passthrough).not.toHaveBeenCalled();

    await window.fetch('https://fonts.googleapis.com/css2');
    expect(passthrough).toHaveBeenCalledTimes(1);
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
