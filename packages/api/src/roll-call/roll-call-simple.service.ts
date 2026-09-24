// packages/api/src/roll-call/roll-call-simple.service.ts
//
// Simple mode (茶果嶺浸信會點名應用程式): each user's one quick list, kept on
// the server so it survives a closed tab or a different device.
import { Injectable } from '@nestjs/common';
import { simpleRollCallSchema, type SimpleRollCall } from '@clawix/shared';

import type { Prisma } from '../generated/prisma/client.js';
import { RollCallRepository } from '../db/roll-call.repository.js';

@Injectable()
export class RollCallSimpleService {
  constructor(private readonly repo: RollCallRepository) {}

  async get(userId: string): Promise<SimpleRollCall> {
    const row = await this.repo.findSimpleList(userId);
    const parsed = simpleRollCallSchema.safeParse(row?.data ?? {});
    return parsed.success ? parsed.data : simpleRollCallSchema.parse({});
  }

  async save(userId: string, list: SimpleRollCall): Promise<SimpleRollCall> {
    // Ticks may only refer to names on the list.
    const ids = new Set(list.members.map((m) => m.id));
    const present = Object.fromEntries(Object.entries(list.present).filter(([id]) => ids.has(id)));
    const clean = { ...list, present };
    await this.repo.saveSimpleList(userId, clean as unknown as Prisma.InputJsonValue);
    return clean;
  }
}
