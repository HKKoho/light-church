vi.mock('@clawix/shared', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  ExternalServiceError: class ExternalServiceError extends Error {
    constructor(service: string, message: string) {
      super(`External service '${service}' error: ${message}`);
    }
  },
}));

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';

import { CartoonizeService, isCartoonStyle } from '../cartoonize.service.js';

function makeConfigService(url: string | null = 'http://cartoonize.test'): ConfigService {
  return { get: () => url ?? undefined } as unknown as ConfigService;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isCartoonStyle', () => {
  it('accepts known styles and rejects everything else', () => {
    expect(isCartoonStyle('face_paint_v2')).toBe(true);
    expect(isCartoonStyle('paprika')).toBe(true);
    expect(isCartoonStyle('hayao')).toBe(false);
    expect(isCartoonStyle(undefined)).toBe(false);
    expect(isCartoonStyle(42)).toBe(false);
  });
});

describe('CartoonizeService', () => {
  it('posts the image and style, returns the cartoonized JPEG', async () => {
    const responseBytes = new Uint8Array([1, 2, 3]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(responseBytes.buffer),
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new CartoonizeService(makeConfigService());
    const result = await service.generate(Buffer.from('source-bytes'), 'face_paint_v2');

    expect(result.image).toEqual(Buffer.from(responseBytes));
    expect(fetchMock).toHaveBeenCalledWith(
      'http://cartoonize.test/generate',
      expect.objectContaining({ method: 'POST' }),
    );
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('style')).toBe('face_paint_v2');
  });

  it('wraps a non-OK response in ExternalServiceError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('sidecar exploded'),
      }),
    );

    const service = new CartoonizeService(makeConfigService());
    await expect(service.generate(Buffer.from('x'), 'paprika')).rejects.toThrow(/sidecar exploded/);
  });

  it('wraps a network failure in ExternalServiceError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const service = new CartoonizeService(makeConfigService());
    await expect(service.generate(Buffer.from('x'), 'paprika')).rejects.toThrow(/ECONNREFUSED/);
  });
});

describe('CartoonizeService without CARTOONIZE_URL', () => {
  it('constructs fine and only fails the cartoon request', async () => {
    const service = new CartoonizeService(makeConfigService(null));
    await expect(service.generate(Buffer.from('x'), 'paprika')).rejects.toThrow(
      /CARTOONIZE_URL is not configured/,
    );
  });
});
