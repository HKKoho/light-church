vi.mock('@clawix/shared', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JwtPayload } from '../../auth/auth.types.js';
import type { CartoonizeService } from '../cartoonize.service.js';
import type { TalkingFaceAvatarController as TalkingFaceAvatarControllerType } from '../talkingface-avatar.controller.js';

describe('TalkingFaceAvatarController.cartoonize', () => {
  let tmpDir: string;
  let controller: TalkingFaceAvatarControllerType;
  let mockCartoonize: { generate: ReturnType<typeof vi.fn> };
  const req = { user: { sub: 'user-1' } as JwtPayload } as unknown as Parameters<
    TalkingFaceAvatarControllerType['cartoonize']
  >[2];

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avatar-test-'));
    process.env['TALKINGFACE_AVATAR_DIR'] = tmpDir;
    vi.resetModules();

    const { TalkingFaceAvatarController } = await import('../talkingface-avatar.controller.js');
    mockCartoonize = { generate: vi.fn() };
    controller = new TalkingFaceAvatarController(mockCartoonize as unknown as CartoonizeService);

    await fs.writeFile(path.join(tmpDir, 'source-1.jpg'), Buffer.from('fake-jpeg'));
  });

  afterEach(async () => {
    delete process.env['TALKINGFACE_AVATAR_DIR'];
    await fs.rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('cartoonizes a photo and stores it as a new avatar linked to the source', async () => {
    mockCartoonize.generate.mockResolvedValue({ image: Buffer.from('cartoon-bytes') });

    const result = await controller.cartoonize('source-1', { style: 'face_paint_v2' }, req);

    expect(mockCartoonize.generate).toHaveBeenCalledWith(Buffer.from('fake-jpeg'), 'face_paint_v2');
    expect(result.filename).toBe('cartoon-face_paint_v2.jpg');

    const meta = JSON.parse(
      await fs.readFile(path.join(tmpDir, `${result.photoId}.meta.json`), 'utf8'),
    ) as { sourcePhotoId: string; style: string };
    expect(meta.sourcePhotoId).toBe('source-1');
    expect(meta.style).toBe('face_paint_v2');

    const stored = await fs.readFile(path.join(tmpDir, `${result.photoId}.jpg`));
    expect(stored.toString()).toBe('cartoon-bytes');
  });

  it('rejects an invalid style before calling the sidecar', async () => {
    await expect(controller.cartoonize('source-1', { style: 'bogus' }, req)).rejects.toThrow(
      /Unsupported style/,
    );
    expect(mockCartoonize.generate).not.toHaveBeenCalled();
  });

  it('404s for an unknown source photoId', async () => {
    await expect(
      controller.cartoonize('does-not-exist', { style: 'face_paint_v2' }, req),
    ).rejects.toThrow(/not found/i);
  });

  it('surfaces sidecar failures', async () => {
    mockCartoonize.generate.mockRejectedValue(new Error('cartoonize sidecar boom'));
    await expect(
      controller.cartoonize('source-1', { style: 'face_paint_v2' }, req),
    ).rejects.toThrow(/boom/);
  });
});
