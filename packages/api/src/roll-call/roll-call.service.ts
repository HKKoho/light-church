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
import { computeInsights } from './roll-call-insights.js';
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
});

const toSummary = (g: RollCallGroupRow): RollCallGroupSummary => ({
  id: g.id,
  name: g.name,
  description: g.description,
  memberCount: g._count.members,
  lastSessionDate: g.sessions[0] ? fromDbDate(g.sessions[0].date) : null,
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

  async listGroups(): Promise<RollCallGroupSummary[]> {
    return (await this.repo.listGroups()).map(toSummary);
  }

  async loadGroup(id: string): Promise<RollCallGroupRow> {
    const group = await this.repo.findGroup(id);
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async getGroup(id: string, actor: Actor): Promise<RollCallGroupDetail> {
    const group = await this.loadGroup(id);
    const members = await this.repo.listMembers(id);
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
   * Adds names to a group, skipping any already on the list (same spelling).
   * Anyone taking the roll may add a newcomer; returns the matching members
   * (new or existing) in input order.
   */
  async addMembers(groupId: string, names: readonly string[]): Promise<RollCallMemberInfo[]> {
    await this.loadGroup(groupId);
    const existing = await this.repo.listMembers(groupId);
    const byKey = new Map(existing.map((m) => [normalizeName(m.name), m]));
    const fresh: string[] = [];
    for (const name of names) {
      const key = normalizeName(name);
      if (key && !byKey.has(key) && !fresh.some((f) => normalizeName(f) === key)) fresh.push(name);
    }
    const created = fresh.length > 0 ? await this.repo.addMembers(groupId, fresh) : [];
    for (const m of created) byKey.set(normalizeName(m.name), m);
    // A returning inactive member is re-activated when their name is added again.
    const result: RollCallMember[] = [];
    for (const name of names) {
      const m = byKey.get(normalizeName(name));
      if (!m || result.includes(m)) continue;
      result.push(m.active ? m : await this.repo.updateMember(m.id, { active: true }));
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
    return toMemberInfo(await this.repo.updateMember(memberId, input));
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
    const [members, sessions] = await Promise.all([
      this.repo.listMembers(groupId),
      this.repo.listSessions(groupId),
    ]);
    return computeInsights(
      members,
      sessions.map((s) => ({
        date: fromDbDate(s.date),
        guestCount: s.guestCount,
        presentIds: new Set(s.marks.map((m) => m.memberId)),
      })),
    );
  }
}
