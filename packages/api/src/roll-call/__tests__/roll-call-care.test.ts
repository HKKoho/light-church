// packages/api/src/roll-call/__tests__/roll-call-care.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { RollCallRepository } from '../../db/roll-call.repository.js';
import { RollCallCareService } from '../roll-call-care.service.js';
import { RollCallKioskService } from '../roll-call-kiosk.service.js';
import { RollCallService } from '../roll-call.service.js';

const leader = { id: 'u-leader', role: 'ministry_leader' };
const volunteer = { id: 'u-vol', role: 'volunteer' };

const member = (id: string, name: string, phoneLast4 = '', active = true) => ({
  id,
  groupId: 'g1',
  name,
  note: '',
  active,
  sex: '',
  birthYear: null,
  followedUpAt: null as Date | null,
  followUpNote: '',
  phoneLast4,
  department: id === 'amy' ? 'Choir' : '',
  createdAt: new Date('2026-01-01'),
});

function fakeRepo() {
  const members = [
    member('amy', 'Amy', '1234'),
    member('ben', 'Ben', '1234'),
    member('cat', 'Cat', '5678', false),
  ];
  const marks = new Set<string>(['ben']);
  const group = { id: 'g1', name: 'Sunday', description: '', _count: { members: 3 }, sessions: [] };
  const session = (id: string, date: string, present: string[]) => ({
    id,
    groupId: 'g1',
    date: new Date(`${date}T00:00:00Z`),
    label: '',
    guestCount: 0,
    marks: present.map((memberId) => ({ memberId })),
  });
  return {
    marks,
    findGroup: vi.fn(async (id: string) => (id === 'g1' ? group : null)),
    listGroups: vi.fn(async () => [group]),
    listMembers: vi.fn(async () => members),
    findMember: vi.fn(async (id: string) => members.find((m) => m.id === id) ?? null),
    findByPhone: vi.fn(async (_g: string, digits: string) =>
      members.filter((m) => m.active && m.phoneLast4 === digits),
    ),
    findSession: vi.fn(async (id: string) =>
      id === 's1' ? session('s1', '2026-09-27', [...marks]) : null,
    ),
    listSessions: vi.fn(async () => [
      ...['01', '02', '03', '04', '05', '06'].map((d) =>
        session(`old${d}`, `2026-08-${d}`, ['amy']),
      ),
      session('new1', '2026-09-20', ['amy', 'ben']),
    ]),
    setMark: vi.fn(async (_s: string, memberId: string) => {
      if (marks.has(memberId)) return false;
      marks.add(memberId);
      return true;
    }),
    listCheckIns: vi.fn(async () => [
      {
        memberId: 'ben',
        markedAt: new Date('2026-09-27T01:00:00Z'),
        method: 'kiosk',
        member: { name: 'Ben' },
      },
    ]),
    addCareNote: vi.fn(async (data: { memberId: string; note: string }) => ({
      ...members.find((m) => m.id === data.memberId)!,
      followedUpAt: new Date('2026-09-28T00:00:00Z'),
      followUpNote: data.note,
    })),
    listCareNotes: vi.fn(async () => [
      {
        id: 'n1',
        memberId: 'amy',
        authorId: null,
        kind: 'visit',
        note: 'Hospital',
        createdAt: new Date('2026-09-01'),
        author: { name: 'Pastor Lee' },
      },
      {
        id: 'n2',
        memberId: 'amy',
        authorId: null,
        kind: 'odd',
        note: '',
        createdAt: new Date('2026-08-01'),
        author: null,
      },
    ]),
  };
}

describe('RollCallKioskService', () => {
  let repo: ReturnType<typeof fakeRepo>;
  let kiosk: RollCallKioskService;

  beforeEach(() => {
    repo = fakeRepo();
    const rollCall = new RollCallService(repo as unknown as RollCallRepository);
    kiosk = new RollCallKioskService(repo as unknown as RollCallRepository, rollCall);
  });

  it('finds everyone sharing the last four digits, and who is already in', async () => {
    expect(await kiosk.lookup('g1', 's1', '1234')).toEqual([
      { id: 'amy', name: 'Amy', department: 'Choir', checkedIn: false },
      { id: 'ben', name: 'Ben', department: '', checkedIn: true },
    ]);
    // Removed members can't check in.
    expect(await kiosk.lookup('g1', 's1', '5678')).toEqual([]);
  });

  it('checks a person in once, as a kiosk mark', async () => {
    expect(await kiosk.checkIn('g1', 's1', '1234', 'amy')).toEqual({
      status: 'checked_in',
      name: 'Amy',
    });
    expect(repo.setMark).toHaveBeenCalledWith('s1', 'amy', true, 'kiosk');
    expect((await kiosk.checkIn('g1', 's1', '1234', 'amy')).status).toBe('already');
  });

  it('refuses a check-in whose digits do not match the member', async () => {
    await expect(kiosk.checkIn('g1', 's1', '0000', 'amy')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(kiosk.checkIn('g1', 's1', '5678', 'cat')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('lists recent marks for the live log', async () => {
    expect(await kiosk.feed('g1', 's1')).toEqual([
      { memberId: 'ben', name: 'Ben', markedAt: '2026-09-27T01:00:00.000Z', method: 'kiosk' },
    ]);
  });
});

describe('RollCallCareService', () => {
  let repo: ReturnType<typeof fakeRepo>;
  let care: RollCallCareService;

  beforeEach(() => {
    repo = fakeRepo();
    const rollCall = new RollCallService(repo as unknown as RollCallRepository);
    care = new RollCallCareService(repo as unknown as RollCallRepository, rollCall);
  });

  it('records a follow-up in the care log (managers only)', async () => {
    await expect(
      care.followUp('g1', 'amy', { kind: 'call', note: 'Called' }, volunteer),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const amy = await care.followUp('g1', 'amy', { kind: 'call', note: 'Called' }, leader);
    expect(repo.addCareNote).toHaveBeenCalledWith({
      memberId: 'amy',
      authorId: 'u-leader',
      kind: 'call',
      note: 'Called',
    });
    expect(amy).toMatchObject({ followUpNote: 'Called' });
    expect(amy.followedUpAt).not.toBeNull();
  });

  it('shows a member’s care history, newest first, with who reached out', async () => {
    await expect(care.careLog('g1', 'amy', volunteer)).rejects.toBeInstanceOf(ForbiddenException);
    expect(await care.careLog('g1', 'amy', leader)).toEqual([
      {
        id: 'n1',
        kind: 'visit',
        note: 'Hospital',
        createdAt: '2026-09-01T00:00:00.000Z',
        author: 'Pastor Lee',
      },
      { id: 'n2', kind: 'other', note: '', createdAt: '2026-08-01T00:00:00.000Z', author: null },
    ]);
  });

  it('gathers first-timers to welcome across groups', async () => {
    await expect(care.queue(volunteer)).rejects.toBeInstanceOf(ForbiddenException);
    const queue = await care.queue(leader);
    expect(queue.firstTimers).toEqual([
      expect.objectContaining({ id: 'ben', firstDate: '2026-09-20', groupName: 'Sunday' }),
    ]);
    expect(queue.alerts).toEqual([]);
  });
});
