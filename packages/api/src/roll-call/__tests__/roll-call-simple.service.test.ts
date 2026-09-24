// packages/api/src/roll-call/__tests__/roll-call-simple.service.test.ts
import { describe, expect, it, vi } from 'vitest';

import type { RollCallRepository } from '../../db/roll-call.repository.js';
import { RollCallSimpleService } from '../roll-call-simple.service.js';

describe('RollCallSimpleService', () => {
  it('starts empty and keeps each user’s list, dropping ticks for names not on it', async () => {
    const store = new Map<string, unknown>();
    const repo = {
      findSimpleList: vi.fn(async (userId: string) =>
        store.has(userId) ? { data: store.get(userId), updatedAt: new Date() } : null,
      ),
      saveSimpleList: vi.fn(async (userId: string, data: unknown) => {
        store.set(userId, data);
        return { updatedAt: new Date() };
      }),
    };
    const service = new RollCallSimpleService(repo as unknown as RollCallRepository);

    expect(await service.get('u1')).toEqual({ fileName: '', members: [], present: {} });
    await service.save('u1', {
      fileName: 'youth.csv',
      members: [{ id: 'a', name: '陳大文' }],
      present: { a: '2026-09-20T02:00:00.000Z', gone: '2026-09-20T02:01:00.000Z' },
    });
    expect(await service.get('u1')).toEqual({
      fileName: 'youth.csv',
      members: [{ id: 'a', name: '陳大文' }],
      present: { a: '2026-09-20T02:00:00.000Z' },
    });
    expect((await service.get('u2')).members).toEqual([]);
  });
});
