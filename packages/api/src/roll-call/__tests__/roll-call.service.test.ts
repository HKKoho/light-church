// packages/api/src/roll-call/__tests__/roll-call.service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import type { AuditLogRepository } from '../../db/audit-log.repository.js';
import type { RollCallRepository } from '../../db/roll-call.repository.js';
import type { SystemSettingsRepository } from '../../db/system-settings.repository.js';
import type { LocalLlmService } from '../../engine/local-llm/local-llm.service.js';
import { RollCallAiService } from '../roll-call-ai.service.js';
import { RollCallService } from '../roll-call.service.js';

const leader = { id: 'u-leader', role: 'ministry_leader' };
const volunteer = { id: 'u-vol', role: 'volunteer' };
const admin = { id: 'u-admin', role: 'super_admin' };

interface Member {
  id: string;
  groupId: string;
  name: string;
  note: string;
  active: boolean;
  sex: string;
  birthYear: number | null;
  followedUpAt: Date | null;
  followUpNote: string;
  createdAt: Date;
}

const people = (...names: string[]) => names.map((name) => ({ name }));

function fakeRepo() {
  const members: Member[] = [];
  let seq = 0;
  const group = { id: 'g1', name: 'Youth', description: '', _count: { members: 0 }, sessions: [] };
  return {
    members,
    findGroup: vi.fn(async (id: string) => (id === 'g1' ? group : null)),
    listMembers: vi.fn(async () => [...members]),
    addMembers: vi.fn(
      async (groupId: string, input: { name: string; sex?: string; birthYear?: number | null }[]) =>
        input.map((p) => {
          const m: Member = {
            id: `m${++seq}`,
            groupId,
            name: p.name,
            note: '',
            active: true,
            sex: p.sex ?? '',
            birthYear: p.birthYear ?? null,
            followedUpAt: null,
            followUpNote: '',
            createdAt: new Date(Date.now() + seq),
          };
          members.push(m);
          return m;
        }),
    ),
    findMember: vi.fn(async (id: string) => members.find((m) => m.id === id) ?? null),
    updateMember: vi.fn(async (id: string, data: Partial<Member>) => {
      const m = members.find((x) => x.id === id)!;
      Object.assign(m, data);
      return m;
    }),
    mergeMembers: vi.fn(async (_keepId: string, mergeId: string) => {
      members.splice(
        members.findIndex((m) => m.id === mergeId),
        1,
      );
    }),
    listGroups: vi.fn(async () => [group]),
    findSession: vi.fn(async (id: string) =>
      id === 's1'
        ? {
            id: 's1',
            groupId: 'g1',
            date: new Date('2026-09-20T00:00:00Z'),
            label: '',
            guestCount: 0,
            marks: [],
          }
        : null,
    ),
    saveSession: vi.fn(),
    deleteSession: vi.fn(),
    listSessions: vi.fn(async () => []),
  };
}

describe('RollCallService', () => {
  let repo: ReturnType<typeof fakeRepo>;
  let service: RollCallService;

  beforeEach(() => {
    repo = fakeRepo();
    service = new RollCallService(repo as unknown as RollCallRepository);
  });

  it('adds only new names, and re-activates a returning member', async () => {
    await service.addMembers('g1', people('Peter Chan', '陳大文'));
    await service.updateMember('g1', 'm1', { active: false }, leader);
    const result = await service.addMembers('g1', people('chan peter', 'Mary Lee', 'Mary  Lee'));
    expect(result.map((m) => [m.name, m.active])).toEqual([
      ['Peter Chan', true],
      ['Mary Lee', true],
    ]);
    expect(repo.members).toHaveLength(3);
  });

  it('merges members with the same name automatically, keeping the earliest', async () => {
    await service.addMembers('g1', [
      { name: 'Mary Lee' },
      { name: 'John', sex: 'male', birthYear: 1990 },
    ]);
    // A rename that collides with an existing name merges the two people.
    const survivor = await service.updateMember('g1', 'm2', { name: 'mary  lee' }, leader);
    expect(survivor).toMatchObject({ id: 'm1', name: 'Mary Lee', sex: 'male', birthYear: 1990 });
    expect(repo.mergeMembers).toHaveBeenCalledWith('m1', 'm2');
    expect(repo.members.map((m) => m.id)).toEqual(['m1']);
  });

  it('fills in blank details when a known name is added again', async () => {
    await service.addMembers('g1', people('Amy'));
    const [amy] = await service.addMembers('g1', [{ name: 'amy', sex: 'female', birthYear: 2010 }]);
    expect(amy).toMatchObject({ id: 'm1', sex: 'female', birthYear: 2010 });
  });

  it('records a pastoral follow-up (managers only)', async () => {
    await service.addMembers('g1', people('Amy'));
    await expect(service.followUp('g1', 'm1', 'Called', volunteer)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    const amy = await service.followUp('g1', 'm1', 'Called', leader);
    expect(amy.followUpNote).toBe('Called');
    expect(amy.followedUpAt).not.toBeNull();
  });

  it('shows follow-up counts on the group list only to managers', async () => {
    expect((await service.listGroups(volunteer))[0]?.followUpCount).toBe(0);
    expect((await service.listGroups(leader))[0]?.followUpCount).toBe(0);
  });

  it('only records members of the group as present', async () => {
    await service.addMembers('g1', people('Amy'));
    await service.saveSession('g1', 's1', {
      date: '2026-09-20',
      label: 'Sunday',
      guestCount: 3,
      presentIds: ['m1', 'm1', 'someone-else'],
    });
    expect(repo.saveSession).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ presentIds: ['m1'], guestCount: 3 }),
    );
  });

  it('lets volunteers take the roll but not manage the group', async () => {
    await service.addMembers('g1', people('Amy', 'Amie'));
    await expect(service.mergeMembers('g1', 'm1', 'm2', volunteer)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.insights('g1', volunteer)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.deleteSession('g1', 's1', volunteer)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await service.mergeMembers('g1', 'm1', 'm2', leader);
    expect(repo.mergeMembers).toHaveBeenCalledWith('m1', 'm2');
  });

  it('does not reach across groups', async () => {
    await expect(service.getSession('g1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getGroup('g2', leader)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('RollCallAiService', () => {
  let repo: ReturnType<typeof fakeRepo>;
  let settings: { settings: Record<string, unknown> };
  let llm: { model: string; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  let audit: { create: ReturnType<typeof vi.fn> };
  let ai: RollCallAiService;

  beforeEach(async () => {
    repo = fakeRepo();
    settings = { settings: {} };
    llm = {
      model: 'qwen2.5vl:7b',
      status: vi.fn(async () => ({ available: true, model: 'qwen2.5vl:7b', reason: null })),
      json: vi.fn(),
    };
    audit = { create: vi.fn() };
    const settingsRepo = {
      get: vi.fn(async () => settings),
      update: vi.fn(async (patch: Record<string, unknown>) => {
        settings.settings = { ...settings.settings, ...patch };
        return settings;
      }),
    };
    const service = new RollCallService(repo as unknown as RollCallRepository);
    ai = new RollCallAiService(
      llm as unknown as LocalLlmService,
      settingsRepo as unknown as SystemSettingsRepository,
      repo as unknown as RollCallRepository,
      service,
      audit as unknown as AuditLogRepository,
    );
    await service.addMembers('g1', people('陳大文', 'Chan Tai Man', 'Mary Lee', 'Mary Lea'));
  });

  it('is off until a super admin switches it on', async () => {
    expect((await ai.status()).enabled).toBe(false);
    await expect(ai.setEnabled(true, leader)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(ai.duplicates('g1', true, leader)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(llm.json).not.toHaveBeenCalled();

    expect((await ai.setEnabled(true, admin)).enabled).toBe(true);
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'rollcall.ai.enable' }),
    );
  });

  it('finds spelling duplicates on the server without the model', async () => {
    const pairs = await ai.duplicates('g1', false, leader);
    expect(pairs.map((p) => [p.a.name, p.b.name, p.source])).toEqual([
      ['Mary Lee', 'Mary Lea', 'local'],
    ]);
    expect(llm.json).not.toHaveBeenCalled();
  });

  it('matches the local model’s romanisations on the server, so it cannot invent pairs', async () => {
    await ai.setEnabled(true, admin);
    await ai['rollCall'].addMembers('g1', people('Peter Wong', '陈大文'));
    llm.json.mockResolvedValueOnce({
      names: [
        { i: 0, cantonese: 'Chan Tai Man', mandarin: 'Chen Da Wen', traditional: '陳大文' },
        { i: 1, cantonese: 'Chan Tai Man', mandarin: 'Chen Da Wen', traditional: '陳大文' },
        { i: 99, cantonese: 'Peter Wong' },
      ],
    });
    const pairs = await ai.duplicates('g1', true, leader);
    expect(pairs.map((p) => [p.a.name, p.b.name, p.source])).toEqual([
      ['Mary Lee', 'Mary Lea', 'local'],
      ['陳大文', '陈大文', 'local'],
      ['陳大文', 'Chan Tai Man', 'ai'],
      ['陈大文', 'Chan Tai Man', 'ai'],
    ]);
    // Only Chinese names are sent, and the audit log holds counts, not names.
    const prompt = String(llm.json.mock.calls[0]?.[0]);
    expect(prompt).toContain('陳大文');
    expect(prompt).not.toContain('Mary Lee');
    expect(JSON.stringify(audit.create.mock.calls)).not.toContain('陳大文');
  });
});
