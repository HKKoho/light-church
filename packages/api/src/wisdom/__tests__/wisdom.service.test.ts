import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { saveWisdomModuleSchema } from '@clawix/shared';

import type { AuditLogRepository } from '../../db/audit-log.repository.js';
import type { WisdomRepository } from '../../db/wisdom.repository.js';
import { toModuleDetail } from '../wisdom.mappers.js';
import { WisdomService } from '../wisdom.service.js';

const pastor = { id: 'u-pastor', role: 'pastor' };
const member = { id: 'u-member', role: 'member' };

const perspective = { book: '箴言 1:7', theme: 'Order', description: 'Fear of the Lord' };
const moduleInput = (extra: Record<string, unknown> = {}) =>
  saveWisdomModuleSchema.parse({
    cycleId: 'c1',
    title: '第 1 課 什麼是智慧？',
    status: 'published',
    lifeQuestions: [
      { text: 'What is wisdom?' },
      { id: 'q-choice', text: 'Is karma real?', type: 'multi_choice', options: ['Yes', 'No'] },
    ],
    perspectives: { PROVERBS: perspective, ECCLESIASTES: perspective, JOB: perspective },
    discussionPrompts: ['Share one story'],
    ...extra,
  });

function fakeRepo() {
  const cycles = new Map<string, Record<string, unknown>>([
    ['c1', { id: 'c1', title: 'Cycle 1', description: '', sortOrder: 1 }],
  ]);
  const modules = new Map<string, Record<string, unknown>>();
  const responses = new Map<string, Record<string, unknown>>();
  let seq = 0;
  const key = (u: string, m: string) => `${u}:${m}`;
  return {
    modules,
    responses,
    findCycle: vi.fn(async (id: string) => cycles.get(id) ?? null),
    createCycle: vi.fn(async (d: Record<string, unknown>) => {
      const row = { ...d, id: `c${++seq}` };
      cycles.set(row.id, row);
      return row;
    }),
    updateCycle: vi.fn(async (id: string, d: Record<string, unknown>) => ({
      ...cycles.get(id),
      ...d,
    })),
    deleteCycle: vi.fn(async (id: string) => cycles.delete(id)),
    listCycles: vi.fn(async (statuses?: string[]) =>
      [...cycles.values()].map((c) => ({
        ...c,
        modules: [...modules.values()].filter(
          (m) =>
            m['cycleId'] === c['id'] && (!statuses || statuses.includes(m['status'] as string)),
        ),
      })),
    ),
    findModule: vi.fn(async (id: string) => modules.get(id) ?? null),
    createModule: vi.fn(async (d: Record<string, unknown>) => {
      const row = { ...d, id: `m${++seq}`, updatedAt: new Date() };
      modules.set(row.id, row);
      return row;
    }),
    updateModule: vi.fn(async (id: string, d: Record<string, unknown>) => {
      const row = { ...modules.get(id), ...d, updatedAt: new Date() };
      modules.set(id, row);
      return row;
    }),
    deleteModule: vi.fn(async (id: string) => modules.delete(id)),
    responseCounts: vi.fn(async () => new Map([['m-x', { responses: 3, completed: 1 }]])),
    listUserResponses: vi.fn(async (u: string) =>
      [...responses.values()].filter((r) => r['userId'] === u),
    ),
    findResponse: vi.fn(async (u: string, m: string) => responses.get(key(u, m)) ?? null),
    saveResponse: vi.fn(
      async (u: string, m: string, answers: unknown, completedAt?: Date | null) => {
        const prev = responses.get(key(u, m));
        const row = {
          userId: u,
          moduleId: m,
          answers,
          completedAt: completedAt === undefined ? (prev?.['completedAt'] ?? null) : completedAt,
        };
        responses.set(key(u, m), row);
        return row;
      },
    ),
    listPeerResponses: vi.fn(async (m: string, exclude: string) =>
      [...responses.values()].filter((r) => r['moduleId'] === m && r['userId'] !== exclude),
    ),
  };
}

describe('WisdomService', () => {
  let repo: ReturnType<typeof fakeRepo>;
  let audit: { create: ReturnType<typeof vi.fn> };
  let service: WisdomService;

  beforeEach(() => {
    repo = fakeRepo();
    audit = { create: vi.fn() };
    service = new WisdomService(
      repo as unknown as WisdomRepository,
      audit as unknown as AuditLogRepository,
    );
  });

  describe('staff', () => {
    it('only lets editors change the course', async () => {
      await expect(service.listAdmin(member)).rejects.toThrow(ForbiddenException);
      await expect(service.createModule(moduleInput(), member)).rejects.toThrow(ForbiddenException);
    });

    it('gives new questions an id and keeps existing ones', async () => {
      const created = await service.createModule(moduleInput(), pastor);
      const [first, second] = created.lifeQuestions;
      expect(first?.id).toMatch(/[0-9a-f-]{36}/);
      expect(second?.id).toBe('q-choice');
      expect(audit.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'wisdom.module.create' }),
      );
    });

    it('rejects a module in a missing cycle', async () => {
      await expect(service.createModule(moduleInput({ cycleId: 'nope' }), pastor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lists cycles with answer counts', async () => {
      await service.createModule(moduleInput(), pastor);
      const [cycle] = await service.listAdmin(pastor);
      expect(cycle?.modules[0]).toMatchObject({ responses: 0, completed: 0 });
    });

    it('updates and deletes cycles and modules', async () => {
      const m = await service.createModule(moduleInput(), pastor);
      const updated = await service.updateModule(m.id, moduleInput({ title: 'New' }), pastor);
      expect(updated.title).toBe('New');
      expect((await service.getModule(m.id, pastor)).title).toBe('New');
      await service.deleteModule(m.id, pastor);
      await expect(service.getModule(m.id, pastor)).rejects.toThrow(NotFoundException);

      const c = await service.createCycle(
        { title: 'Cycle 2', description: '', sortOrder: 2 },
        pastor,
      );
      expect(
        (await service.updateCycle(c.id, { title: 'Two', description: '', sortOrder: 2 }, pastor))
          .title,
      ).toBe('Two');
      await service.deleteCycle(c.id, pastor);
      await expect(service.deleteCycle(c.id, pastor)).rejects.toThrow(NotFoundException);
    });
  });

  describe('members', () => {
    it('shows only published modules and hides drafts', async () => {
      const draft = await service.createModule(moduleInput({ status: 'draft' }), pastor);
      expect(await service.listForMember(member.id)).toEqual([]);
      await expect(service.getForMember(draft.id, member.id)).rejects.toThrow(NotFoundException);
    });

    it('saves known answers only and keeps completion once set', async () => {
      const m = await service.createModule(moduleInput(), pastor);
      const qid = m.lifeQuestions[0]!.id;
      const saved = await service.saveAnswers(m.id, member.id, {
        answers: { [qid]: ' Fear of God ', d0: 'story', summary: '', bogus: 'x' },
        completed: true,
      });
      expect(saved.answers).toEqual({ [qid]: 'Fear of God', d0: 'story' });
      expect(saved.completed).toBe(true);

      const again = await service.saveAnswers(m.id, member.id, { answers: { d0: 'edit' } });
      expect(again.completed).toBe(true);

      const [cycle] = await service.listForMember(member.id);
      expect(cycle?.modules[0]).toMatchObject({ started: true, completed: true });
      expect((await service.getForMember(m.id, member.id)).answers).toEqual({ d0: 'edit' });
    });

    it('summarises other members anonymously', async () => {
      const m = await service.createModule(moduleInput(), pastor);
      const qid = m.lifeQuestions[0]!.id;
      await service.saveAnswers(m.id, 'u-a', { answers: { [qid]: 'Trust', 'q-choice': 'Yes' } });
      await service.saveAnswers(m.id, 'u-b', { answers: { 'q-choice': 'Yes' } });
      await service.saveAnswers(m.id, member.id, { answers: { [qid]: 'mine' } });

      const [open, choice] = await service.insight(m.id, member.id);
      expect(open).toEqual({ questionId: qid, respondents: 1, counts: {}, samples: ['Trust'] });
      expect(choice).toEqual({
        questionId: 'q-choice',
        respondents: 2,
        counts: { Yes: 2, No: 0 },
        samples: [],
      });
    });
  });

  it('reads imported rows leniently', () => {
    const detail = toModuleDetail({
      id: 'm',
      cycleId: 'c',
      title: 't',
      subtitle: '',
      sortOrder: 0,
      status: 'published',
      lifeQuestions: [{ text: 'x', options: ['a', 3] }, 'junk'],
      perspectives: { JOB: { book: 'Job 1' } },
      tensionGuide: '',
      tensionGuideAudioUrl: '',
      discussionPrompts: ['p', 7],
      summary: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(detail.lifeQuestions[0]).toMatchObject({ id: 'q0', type: 'open', options: ['a'] });
    expect(detail.lifeQuestions[1]).toMatchObject({ id: 'q1', text: '' });
    expect(detail.perspectives.JOB.book).toBe('Job 1');
    expect(detail.perspectives.PROVERBS.book).toBe('');
    expect(detail.discussionPrompts).toEqual(['p']);
  });
});
