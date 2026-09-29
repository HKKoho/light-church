// packages/api/src/roll-call/roll-call-kiosk.service.ts
//
// Self check-in, after City Gospel Church's kiosk: a person types (or says)
// the last four digits of their phone, confirms their name, and is marked
// present in the open roll call. The kiosk runs on a signed-in device, so a
// lookup only ever reveals the names that share those four digits.
import { BadRequestException, Injectable } from '@nestjs/common';
import { createLogger } from '@clawix/shared';
import type { RollCallCheckIn, RollCallKioskMatch, RollCallKioskResult } from '@clawix/shared';

import { RollCallRepository } from '../db/roll-call.repository.js';
import { RollCallService } from './roll-call.service.js';

const logger = createLogger('roll-call:kiosk');
/** Entries in the kiosk's live log. */
const FEED_SIZE = 30;

@Injectable()
export class RollCallKioskService {
  constructor(
    private readonly repo: RollCallRepository,
    private readonly rollCall: RollCallService,
  ) {}

  async lookup(groupId: string, sessionId: string, digits: string): Promise<RollCallKioskMatch[]> {
    const session = await this.rollCall.loadSession(groupId, sessionId);
    const present = new Set(session.marks.map((m) => m.memberId));
    const matches = await this.repo.findByPhone(groupId, digits);
    return matches.map((m) => ({
      id: m.id,
      name: m.name,
      department: m.department,
      checkedIn: present.has(m.id),
    }));
  }

  async checkIn(
    groupId: string,
    sessionId: string,
    digits: string,
    memberId: string,
  ): Promise<RollCallKioskResult> {
    await this.rollCall.loadSession(groupId, sessionId);
    const member = await this.rollCall.loadMember(groupId, memberId);
    // The digits must still match: a kiosk can't be used to mark anyone else.
    if (!member.active || member.phoneLast4 !== digits) {
      throw new BadRequestException('These digits do not match that member');
    }
    const added = await this.repo.setMark(sessionId, memberId, true, 'kiosk');
    if (added) logger.info({ groupId, sessionId, memberId }, 'Kiosk check-in');
    return { status: added ? 'checked_in' : 'already', name: member.name };
  }

  async feed(groupId: string, sessionId: string): Promise<RollCallCheckIn[]> {
    await this.rollCall.loadSession(groupId, sessionId);
    const rows = await this.repo.listCheckIns(sessionId, FEED_SIZE);
    return rows.map((r) => ({
      memberId: r.memberId,
      name: r.member.name,
      markedAt: r.markedAt.toISOString(),
      method: r.method === 'kiosk' ? 'kiosk' : 'roll',
    }));
  }
}
