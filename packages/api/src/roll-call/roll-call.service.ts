// packages/api/src/roll-call/roll-call.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROLL_CALL_MANAGER_ROLES, createLogger } from '@clawix/shared';
import type {
  CreateRollCallSessionInput,
  RollCallAnalysis,
  RollCallMemberInput,
  RollCallSex,
  RollCallGroupDetail,
  RollCallGroupSummary,
  RollCallInsights,
  RollCallMemberInfo,
  RollCallSessionDetail,
  RollCallSessionSummary,
  SaveRollCallGroupInput,
  SaveRollCallSessionInput,
  UpdateRollCallMemberInput,
} from '@clawix/shared';

import type { RollCallMember } from '../generated/prisma/client.js';
import {
  RollCallRepository,
  fromDbDate,
  type RollCallGroupRow,
  type RollCallSessionRow,
} from '../db/roll-call.repository.js';
import { analyse } from './roll-call-analysis.js';
import { computeInsights, needsFollowUp, type InsightSession } from './roll-call-insights.js';
import { normalizeName } from './roll-call-names.js';

const logger = createLogger('roll-call');
const MANAGERS: ReadonlySet<string> = new Set(ROLL_CALL_MANAGER_ROLES);

export interface Actor {
  readonly id: string;
  readonly role: string;
}

export const canManage = (actor: Actor) => MANAGERS.has(actor.role);

export function assertManager(actor: Actor): void {
  if (!canManage(actor)) {
    throw new ForbiddenException('Only ministry leaders and staff can manage roll-call groups');
  }
}

export const toMemberInfo = (m: RollCallMember): RollCallMemberInfo => ({
  id: m.id,
  name: m.name,
  note: m.note,
  active: m.active,
  sex: (m.sex === 'male' || m.sex === 'female' ? m.sex : '') as RollCallSex,
  birthYear: m.birthYear,
  followedUpAt: m.followedUpAt ? m.followedUpAt.toISOString() : null,
  followUpNote: m.followUpNote,
});

const toInsightSession = (s: RollCallSessionRow): InsightSession => ({
  date: fromDbDate(s.date),
  guestCount: s.guestCount,
  presentIds: new Set(s.marks.map((m) => m.memberId)),
});

const toInsightMember = (m: RollCallMember) => ({
  ...toMemberInfo(m),
  followedUpAt: m.followedUpAt ? fromDbDate(m.followedUpAt) : null,
});

const toSummary = (g: RollCallGroupRow, followUpCount = 0): RollCallGroupSummary => ({
  id: g.id,
  name: g.name,
  description: g.description,
  memberCount: g._count.members,
  lastSessionDate: g.sessions[0] ? fromDbDate(g.sessions[0].date) : null,
  followUpCount,
});

const toSession = (s: RollCallSessionRow): RollCallSessionDetail => ({
  id: s.id,
  date: fromDbDate(s.date),
  label: s.label,
  guestCount: s.guestCount,
  presentCount: s.marks.length,
  presentIds: s.marks.map((m) => m.memberId),
});

@Injectable()
export class RollCallService {
  constructor(private readonly repo: RollCallRepository) {}

  async listGroups(actor: Actor): Promise<RollCallGroupSummary[]> {
    const groups = await this.repo.listGroups();
    if (!canManage(actor)) return groups.map((g) => toSummary(g));
    return Promise.all(
      groups.map(async (g) => {
        const { alerts } = await this.computeFor(g.id);
        return toSummary(g, alerts.filter(needsFollowUp).length);
      }),
    );
  }

  private async computeFor(groupId: string) {
    const [members, sessions] = await Promise.all([
      this.repo.listMembers(groupId),
      this.repo.listSessions(groupId),
    ]);
    return computeInsights(members.map(toInsightMember), sessions.map(toInsightSession));
  }

  async loadGroup(id: string): Promise<RollCallGroupRow> {
    const group = await this.repo.findGroup(id);
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async getGroup(id: string, actor: Actor): Promise<RollCallGroupDetail> {
    const group = await this.loadGroup(id);
    const members = await this.mergeSameNames(id);
    return { ...toSummary(group), members: members.map(toMemberInfo), canManage: canManage(actor) };
  }

  async createGroup(input: SaveRollCallGroupInput, actor: Actor): Promise<RollCallGroupDetail> {
    assertManager(actor);
    const group = await this.repo.createGroup(input);
    logger.info({ id: group.id, userId: actor.id }, 'Created roll-call group');
    return this.getGroup(group.id, actor);
  }

  async updateGroup(
    id: string,
    input: SaveRollCallGroupInput,
    actor: Actor,
  ): Promise<RollCallGroupDetail> {
    assertManager(actor);
    await this.loadGroup(id);
    await this.repo.updateGroup(id, input);
    return this.getGroup(id, actor);
  }

  async deleteGroup(id: string, actor: Actor): Promise<void> {
    assertManager(actor);
    await this.loadGroup(id);
    await this.repo.deleteGroup(id);
    logger.info({ id, userId: actor.id }, 'Deleted roll-call group');
  }

  /**
   * Members with the same name (same spelling after ignoring case, spacing,
   * punctuation and English word order) are one person: they are merged
   * automatically so nobody is counted twice. The earliest entry is kept and
   * takes over the others' attendance and any details it lacks.
   */
  async mergeSameNames(groupId: string): Promise<RollCallMember[]> {
    const members = await this.repo.listMembers(groupId);
    const byKey = new Map<string, RollCallMember[]>();
    for (const m of members) {
      const key = normalizeName(m.name);
      byKey.set(key, [...(byKey.get(key) ?? []), m]);
    }
    const groups = [...byKey.values()].filter((list) => list.length > 1);
    if (groups.length === 0) return members;
    for (const list of groups) {
      const [keep, ...rest] = [...list].sort(
        (a, b) =>
          Number(b.active) - Number(a.active) || a.createdAt.getTime() - b.createdAt.getTime(),
      );
      if (!keep) continue;
      const fill = {
        sex: keep.sex || rest.find((r) => r.sex)?.sex || '',
        birthYear: keep.birthYear ?? rest.find((r) => r.birthYear !== null)?.birthYear ?? null,
        note: keep.note || rest.find((r) => r.note)?.note || '',
      };
      await this.repo.updateMember(keep.id, fill);
      for (const r of rest) await this.repo.mergeMembers(keep.id, r.id);
      logger.info({ groupId, keepId: keep.id, merged: rest.length }, 'Merged same-name members');
    }
    return this.repo.listMembers(groupId);
  }

  /**
   * Adds people to a group. A name already on the list (same spelling) is not
   * added again — its blank details are filled in instead, and a removed
   * member is restored. Anyone taking the roll may add a newcomer. Returns
   * the matching members, new or existing, in input order.
   */
  async addMembers(
    groupId: string,
    input: readonly RollCallMemberInput[],
  ): Promise<RollCallMemberInfo[]> {
    await this.loadGroup(groupId);
    const byKey = new Map(
      (await this.mergeSameNames(groupId)).map((m) => [normalizeName(m.name), m]),
    );
    const fresh: RollCallMemberInput[] = [];
    for (const person of input) {
      const key = normalizeName(person.name);
      if (key && !byKey.has(key) && !fresh.some((f) => normalizeName(f.name) === key))
        fresh.push(person);
    }
    const created = fresh.length > 0 ? await this.repo.addMembers(groupId, fresh) : [];
    for (const m of created) byKey.set(normalizeName(m.name), m);
    const result: RollCallMember[] = [];
    for (const person of input) {
      const m = byKey.get(normalizeName(person.name));
      if (!m || result.some((r) => r.id === m.id)) continue;
      const patch = {
        ...(m.active ? {} : { active: true }),
        ...(!m.sex && person.sex ? { sex: person.sex } : {}),
        ...(m.birthYear === null && person.birthYear ? { birthYear: person.birthYear } : {}),
      };
      result.push(Object.keys(patch).length > 0 ? await this.repo.updateMember(m.id, patch) : m);
    }
    return result.map(toMemberInfo);
  }

  private async loadMember(groupId: string, memberId: string): Promise<RollCallMember> {
    const member = await this.repo.findMember(memberId);
    if (!member || member.groupId !== groupId) throw new NotFoundException('Member not found');
    return member;
  }

  async updateMember(
    groupId: string,
    memberId: string,
    input: UpdateRollCallMemberInput,
    actor: Actor,
  ): Promise<RollCallMemberInfo> {
    assertManager(actor);
    await this.loadMember(groupId, memberId);
    const updated = await this.repo.updateMember(memberId, input);
    if (input.name === undefined) return toMemberInfo(updated);
    // Renaming someone to a name already on the list merges the two.
    const key = normalizeName(updated.name);
    const members = await this.mergeSameNames(groupId);
    const survivor = members.find((m) => normalizeName(m.name) === key) ?? updated;
    return toMemberInfo(survivor);
  }

  /** Records that someone reached out; clears the member's absence reminder. */
  async followUp(
    groupId: string,
    memberId: string,
    note: string,
    actor: Actor,
  ): Promise<RollCallMemberInfo> {
    assertManager(actor);
    await this.loadMember(groupId, memberId);
    const member = await this.repo.updateMember(memberId, {
      followedUpAt: new Date(),
      followUpNote: note,
    });
    logger.info({ groupId, memberId, userId: actor.id }, 'Recorded pastoral follow-up');
    return toMemberInfo(member);
  }

  async mergeMembers(
    groupId: string,
    keepId: string,
    mergeId: string,
    actor: Actor,
  ): Promise<void> {
    assertManager(actor);
    if (keepId === mergeId) throw new BadRequestException('Pick two different members');
    await this.loadMember(groupId, keepId);
    await this.loadMember(groupId, mergeId);
    await this.repo.mergeMembers(keepId, mergeId);
    logger.info({ groupId, keepId, mergeId, userId: actor.id }, 'Merged roll-call members');
  }

  async listSessions(groupId: string): Promise<RollCallSessionSummary[]> {
    await this.loadGroup(groupId);
    const sessions = await this.repo.listSessions(groupId);
    return sessions
      .map(toSession)
      .map(({ presentIds: _ids, ...s }) => s)
      .reverse();
  }

  async createSession(
    groupId: string,
    input: CreateRollCallSessionInput,
  ): Promise<RollCallSessionDetail> {
    await this.loadGroup(groupId);
    return toSession(await this.repo.createSession(groupId, input.date, input.label));
  }

  private async loadSession(groupId: string, sessionId: string): Promise<RollCallSessionRow> {
    const session = await this.repo.findSession(sessionId);
    if (!session || session.groupId !== groupId) throw new NotFoundException('Roll call not found');
    return session;
  }

  async getSession(groupId: string, sessionId: string): Promise<RollCallSessionDetail> {
    return toSession(await this.loadSession(groupId, sessionId));
  }

  async saveSession(
    groupId: string,
    sessionId: string,
    input: SaveRollCallSessionInput,
  ): Promise<RollCallSessionDetail> {
    await this.loadSession(groupId, sessionId);
    const ids = new Set((await this.repo.listMembers(groupId)).map((m) => m.id));
    const presentIds = [...new Set(input.presentIds)].filter((id) => ids.has(id));
    await this.repo.saveSession(sessionId, { ...input, presentIds });
    return this.getSession(groupId, sessionId);
  }

  async deleteSession(groupId: string, sessionId: string, actor: Actor): Promise<void> {
    assertManager(actor);
    await this.loadSession(groupId, sessionId);
    await this.repo.deleteSession(sessionId);
  }

  async insights(groupId: string, actor: Actor): Promise<RollCallInsights> {
    assertManager(actor);
    await this.loadGroup(groupId);
    return this.computeFor(groupId);
  }

  async analysis(groupId: string, actor: Actor): Promise<RollCallAnalysis> {
    assertManager(actor);
    await this.loadGroup(groupId);
    const [members, sessions] = await Promise.all([
      this.repo.listMembers(groupId),
      this.repo.listSessions(groupId),
    ]);
    return analyse(members.map(toMemberInfo), sessions.map(toInsightSession));
  }
}
