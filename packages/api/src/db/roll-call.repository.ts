import { Injectable } from '@nestjs/common';

import type {
  RollCallCareNote,
  RollCallGroup,
  RollCallMember,
  RollCallSession,
} from '../generated/prisma/client.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type RollCallGroupRow = RollCallGroup & {
  _count: { members: number };
  sessions: { date: Date }[];
};
export type RollCallSessionRow = RollCallSession & { marks: { memberId: string }[] };
export interface RollCallCheckInRow {
  memberId: string;
  markedAt: Date;
  method: string;
  member: { name: string };
}
export type RollCallCareNoteRow = RollCallCareNote & { author: { name: string } | null };

export interface RollCallMemberData {
  name: string;
  sex?: string;
  birthYear?: number | null;
  phoneLast4?: string;
  department?: string;
}

/** Session dates are calendar days; stored as UTC midnight. */
export const toDbDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
export const fromDbDate = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class RollCallRepository {
  constructor(private readonly prisma: PrismaService) {}

  listGroups(): Promise<RollCallGroupRow[]> {
    return this.prisma.rollCallGroup.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { members: { where: { active: true } } } },
        sessions: { select: { date: true }, orderBy: { date: 'desc' }, take: 1 },
      },
    });
  }

  findGroup(id: string): Promise<RollCallGroupRow | null> {
    return this.prisma.rollCallGroup.findUnique({
      where: { id },
      include: {
        _count: { select: { members: { where: { active: true } } } },
        sessions: { select: { date: true }, orderBy: { date: 'desc' }, take: 1 },
      },
    });
  }

  createGroup(data: { name: string; description: string }): Promise<RollCallGroup> {
    return this.prisma.rollCallGroup.create({ data });
  }

  updateGroup(id: string, data: { name: string; description: string }): Promise<RollCallGroup> {
    return this.prisma.rollCallGroup.update({ where: { id }, data });
  }

  deleteGroup(id: string): Promise<RollCallGroup> {
    return this.prisma.rollCallGroup.delete({ where: { id } });
  }

  listMembers(groupId: string): Promise<RollCallMember[]> {
    return this.prisma.rollCallMember.findMany({
      where: { groupId },
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async addMembers(
    groupId: string,
    people: readonly RollCallMemberData[],
  ): Promise<RollCallMember[]> {
    return this.prisma.$transaction(
      people.map((p) =>
        this.prisma.rollCallMember.create({
          data: {
            groupId,
            name: p.name,
            sex: p.sex ?? '',
            birthYear: p.birthYear ?? null,
            phoneLast4: p.phoneLast4 ?? '',
            department: p.department ?? '',
          },
        }),
      ),
    );
  }

  /** Active members whose phone ends in these four digits. */
  findByPhone(groupId: string, digits: string): Promise<RollCallMember[]> {
    return this.prisma.rollCallMember.findMany({
      where: { groupId, phoneLast4: digits, active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findMember(id: string): Promise<RollCallMember | null> {
    return this.prisma.rollCallMember.findUnique({ where: { id } });
  }

  updateMember(
    id: string,
    data: {
      name?: string;
      note?: string;
      active?: boolean;
      sex?: string;
      birthYear?: number | null;
      followedUpAt?: Date;
      followUpNote?: string;
      phoneLast4?: string;
      department?: string;
    },
  ): Promise<RollCallMember> {
    return this.prisma.rollCallMember.update({ where: { id }, data });
  }

  /** Moves `mergeId`'s attendance onto `keepId`, then deletes `mergeId`. */
  async mergeMembers(keepId: string, mergeId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const marks = await tx.rollCallMark.findMany({ where: { memberId: mergeId } });
      if (marks.length > 0) {
        await tx.rollCallMark.createMany({
          data: marks.map((m) => ({
            sessionId: m.sessionId,
            memberId: keepId,
            markedAt: m.markedAt,
            method: m.method,
          })),
          skipDuplicates: true,
        });
      }
      await tx.rollCallCareNote.updateMany({
        where: { memberId: mergeId },
        data: { memberId: keepId },
      });
      await tx.rollCallMember.delete({ where: { id: mergeId } });
    });
  }

  listSessions(groupId: string): Promise<RollCallSessionRow[]> {
    return this.prisma.rollCallSession.findMany({
      where: { groupId },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      include: { marks: { select: { memberId: true } } },
    });
  }

  findSession(id: string): Promise<RollCallSessionRow | null> {
    return this.prisma.rollCallSession.findUnique({
      where: { id },
      include: { marks: { select: { memberId: true } } },
    });
  }

  createSession(groupId: string, date: string, label: string): Promise<RollCallSessionRow> {
    return this.prisma.rollCallSession.create({
      data: { groupId, date: toDbDate(date), label },
      include: { marks: { select: { memberId: true } } },
    });
  }

  /**
   * Replaces the session's details and, when `presentIds` is given, its full
   * set of present members.
   */
  async saveSession(
    id: string,
    data: { date: string; label: string; guestCount: number; presentIds?: readonly string[] },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.rollCallSession.update({
        where: { id },
        data: { date: toDbDate(data.date), label: data.label, guestCount: data.guestCount },
      });
      if (!data.presentIds) return;
      await tx.rollCallMark.deleteMany({
        where: { sessionId: id, memberId: { notIn: [...data.presentIds] } },
      });
      await tx.rollCallMark.createMany({
        data: data.presentIds.map((memberId) => ({ sessionId: id, memberId })),
        skipDuplicates: true,
      });
    });
  }

  /**
   * Marks one member present (true) or not. Returns false when nothing
   * changed — e.g. they had already checked in.
   */
  async setMark(
    sessionId: string,
    memberId: string,
    present: boolean,
    method: 'roll' | 'kiosk' = 'roll',
  ): Promise<boolean> {
    if (!present) {
      const { count } = await this.prisma.rollCallMark.deleteMany({
        where: { sessionId, memberId },
      });
      return count > 0;
    }
    const { count } = await this.prisma.rollCallMark.createMany({
      data: [{ sessionId, memberId, method }],
      skipDuplicates: true,
    });
    return count > 0;
  }

  /** The session's marks with names, newest first. */
  listCheckIns(sessionId: string, take: number): Promise<RollCallCheckInRow[]> {
    return this.prisma.rollCallMark.findMany({
      where: { sessionId },
      orderBy: { markedAt: 'desc' },
      take,
      select: { memberId: true, markedAt: true, method: true, member: { select: { name: true } } },
    });
  }

  /** Adds a care-log entry and records it as the member's latest follow-up. */
  async addCareNote(data: {
    memberId: string;
    authorId: string;
    kind: string;
    note: string;
  }): Promise<RollCallMember> {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.rollCallCareNote.create({ data });
      return tx.rollCallMember.update({
        where: { id: data.memberId },
        data: { followedUpAt: entry.createdAt, followUpNote: data.note },
      });
    });
  }

  listCareNotes(memberId: string): Promise<RollCallCareNoteRow[]> {
    return this.prisma.rollCallCareNote.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true } } },
    });
  }

  deleteSession(id: string): Promise<RollCallSession> {
    return this.prisma.rollCallSession.delete({ where: { id } });
  }

  findSimpleList(userId: string): Promise<{ data: unknown; updatedAt: Date } | null> {
    return this.prisma.rollCallSimpleList.findUnique({ where: { userId } });
  }

  saveSimpleList(userId: string, data: Prisma.InputJsonValue): Promise<{ updatedAt: Date }> {
    return this.prisma.rollCallSimpleList.upsert({
      where: { userId },
      create: { userId, data },
      update: { data },
    });
  }
}
