// packages/api/src/roll-call/roll-call-care.service.ts
//
// Pastoral care: a log of each time someone reached out to a member (call,
// visit, message, prayer), and a care queue gathering open follow-ups and
// first-timers to welcome from every group.
import { Injectable } from '@nestjs/common';
import { createLogger } from '@clawix/shared';
import type {
  RollCallCareKind,
  RollCallCareNoteInfo,
  RollCallCareQueue,
  RollCallMemberInfo,
} from '@clawix/shared';
import { ROLL_CALL_CARE_KINDS } from '@clawix/shared';

import { RollCallRepository } from '../db/roll-call.repository.js';
import { needsFollowUp } from './roll-call-insights.js';
import { assertManager, toMemberInfo, type Actor, RollCallService } from './roll-call.service.js';

const logger = createLogger('roll-call:care');
const KINDS: ReadonlySet<string> = new Set(ROLL_CALL_CARE_KINDS);

@Injectable()
export class RollCallCareService {
  constructor(
    private readonly repo: RollCallRepository,
    private readonly rollCall: RollCallService,
  ) {}

  /** Records that someone reached out; clears the member's absence reminder. */
  async followUp(
    groupId: string,
    memberId: string,
    input: { kind: RollCallCareKind; note: string },
    actor: Actor,
  ): Promise<RollCallMemberInfo> {
    assertManager(actor);
    await this.rollCall.loadMember(groupId, memberId);
    const member = await this.repo.addCareNote({
      memberId,
      authorId: actor.id,
      kind: input.kind,
      note: input.note,
    });
    logger.info(
      { groupId, memberId, kind: input.kind, userId: actor.id },
      'Recorded pastoral follow-up',
    );
    return toMemberInfo(member);
  }

  async careLog(groupId: string, memberId: string, actor: Actor): Promise<RollCallCareNoteInfo[]> {
    assertManager(actor);
    await this.rollCall.loadMember(groupId, memberId);
    const rows = await this.repo.listCareNotes(memberId);
    return rows.map((r) => ({
      id: r.id,
      kind: (KINDS.has(r.kind) ? r.kind : 'other') as RollCallCareKind,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      author: r.author?.name ?? null,
    }));
  }

  /** Open follow-ups and first-timers not yet welcomed, across all groups. */
  async queue(actor: Actor): Promise<RollCallCareQueue> {
    const all = await this.rollCall.insightsForAll(actor);
    const alerts = all.flatMap(({ group, insights }) =>
      insights.alerts
        .filter(needsFollowUp)
        .map((a) => ({ ...a, groupId: group.id, groupName: group.name })),
    );
    const firstTimers = all.flatMap(({ group, insights }) =>
      insights.firstTimers
        .filter((f) => !f.followedUp)
        .map((f) => ({ ...f, groupId: group.id, groupName: group.name })),
    );
    // Longest absences first; newest first-timers first.
    alerts.sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name));
    firstTimers.sort((a, b) => b.firstDate.localeCompare(a.firstDate));
    return { alerts, firstTimers };
  }
}
