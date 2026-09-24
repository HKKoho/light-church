// packages/api/src/roll-call/roll-call-ai.service.ts
//
// Roll Call's local-AI features. Member names only ever go to the local model
// (LocalLlmService refuses non-local URLs), only while a super_admin has the
// switch on, and every use is written to the audit log (counts, never names).
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { RollCallAiStatus, RollCallDuplicate, RollCallSheetName } from '@clawix/shared';

import { AuditLogRepository } from '../db/audit-log.repository.js';
import { RollCallRepository } from '../db/roll-call.repository.js';
import { SystemSettingsRepository } from '../db/system-settings.repository.js';
import { LocalLlmService } from '../engine/local-llm/local-llm.service.js';
import { assertManager, toMemberInfo, type Actor, RollCallService } from './roll-call.service.js';
import { bestMatch, findDuplicates } from './roll-call-names.js';

/** Key in SystemSettings.settings; written only through setEnabled(). */
const SETTING_KEY = 'rollCallLocalAi';
const SHEET_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SHEET_BYTES = 15 * 1024 * 1024;
/** Names per model call when looking for cross-script duplicates. */
const MAX_AI_NAMES = 300;

const SHEET_PROMPT = `This photo shows a church attendance sign-in sheet (handwritten or printed).
List every person's name written on it, exactly as written, in Chinese or English.
Ignore headings, dates, phone numbers, signatures you cannot read, and other text.
Reply with JSON only: {"names": ["name 1", "name 2"]}`;

const duplicatesPrompt = (
  names: readonly string[],
) => `Here is a numbered list of people in one church group.
Find pairs that are probably the SAME person written differently: Chinese vs English
(Cantonese or Mandarin romanisation, e.g. 陳大文 / Chan Tai Man), traditional vs
simplified characters, an English name added or dropped (e.g. Peter Chan / 陳大文 Peter),
nicknames, or typos. Do not pair people who merely share a surname.
${names.map((n, i) => `${i}. ${n}`).join('\n')}
Reply with JSON only: {"pairs": [{"a": 0, "b": 5, "reason": "short reason"}]}`;

@Injectable()
export class RollCallAiService {
  constructor(
    private readonly llm: LocalLlmService,
    private readonly settings: SystemSettingsRepository,
    private readonly repo: RollCallRepository,
    private readonly rollCall: RollCallService,
    private readonly audit: AuditLogRepository,
  ) {}

  private async enabled(): Promise<boolean> {
    const row = await this.settings.get();
    return (row.settings as Record<string, unknown> | null)?.[SETTING_KEY] === true;
  }

  async status(): Promise<RollCallAiStatus> {
    const enabled = await this.enabled();
    const llm = await this.llm.status();
    return { enabled, available: llm.available, model: llm.model, reason: llm.reason };
  }

  async setEnabled(enabled: boolean, actor: Actor): Promise<RollCallAiStatus> {
    if (actor.role !== 'super_admin') {
      throw new ForbiddenException('Only a super admin can switch Roll Call AI on or off');
    }
    await this.settings.update({ [SETTING_KEY]: enabled });
    await this.audit.create({
      userId: actor.id,
      action: enabled ? 'rollcall.ai.enable' : 'rollcall.ai.disable',
      resource: 'SystemSettings',
      resourceId: 'default',
      details: { model: this.llm.model },
    });
    return this.status();
  }

  private async assertEnabled(): Promise<void> {
    if (!(await this.enabled())) {
      throw new ServiceUnavailableException('Roll Call AI is switched off');
    }
  }

  /**
   * Likely duplicate members. Spelling matches are found on the server; with
   * `useAi`, the local model also looks for cross-script matches.
   */
  async duplicates(groupId: string, useAi: boolean, actor: Actor): Promise<RollCallDuplicate[]> {
    assertManager(actor);
    await this.rollCall.loadGroup(groupId);
    const members = (await this.repo.listMembers(groupId)).map(toMemberInfo);
    const result: RollCallDuplicate[] = findDuplicates(members).map((p) => ({
      ...p,
      source: 'local',
      reason: p.score === 1 ? 'Same spelling' : 'Similar spelling',
    }));
    if (!useAi) return result;

    await this.assertEnabled();
    const seen = new Set(result.map((p) => [p.a.id, p.b.id].sort().join('|')));
    const batch = members.filter((m) => m.active).slice(0, MAX_AI_NAMES);
    const reply = await this.llm.json(duplicatesPrompt(batch.map((m) => m.name)));
    const pairs = Array.isArray(reply['pairs']) ? (reply['pairs'] as unknown[]) : [];
    for (const raw of pairs) {
      const p = raw as { a?: unknown; b?: unknown; reason?: unknown };
      const a = typeof p.a === 'number' ? batch[p.a] : undefined;
      const b = typeof p.b === 'number' ? batch[p.b] : undefined;
      if (!a || !b || a.id === b.id) continue;
      const key = [a.id, b.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const reason =
        typeof p.reason === 'string' ? p.reason.slice(0, 200) : 'Suggested by the local AI';
      result.push({ a, b, score: 0.6, source: 'ai', reason });
    }
    await this.audit.create({
      userId: actor.id,
      action: 'rollcall.ai.duplicates',
      resource: 'RollCallGroup',
      resourceId: groupId,
      details: { model: this.llm.model, names: batch.length, suggestions: pairs.length },
    });
    return result;
  }

  /** Reads names from a sign-in sheet photo and matches them to members. */
  async readSheet(
    groupId: string,
    image: { mimeType: string; data: Buffer },
    actor: Actor,
  ): Promise<RollCallSheetName[]> {
    await this.assertEnabled();
    await this.rollCall.loadGroup(groupId);
    if (!SHEET_TYPES.has(image.mimeType)) {
      throw new BadRequestException('Upload a JPG, PNG or WebP photo');
    }
    if (image.data.length === 0 || image.data.length > MAX_SHEET_BYTES) {
      throw new BadRequestException('The photo is empty or larger than 15 MB');
    }
    const reply = await this.llm.json(SHEET_PROMPT, image);
    const texts = (Array.isArray(reply['names']) ? (reply['names'] as unknown[]) : [])
      .filter((n): n is string => typeof n === 'string')
      .map((n) => n.trim().slice(0, 100))
      .filter(Boolean);
    const members = (await this.repo.listMembers(groupId)).map(toMemberInfo);
    const names = [...new Set(texts)].map((text) => {
      const match = bestMatch(text, members);
      return { text, memberId: match?.item.id ?? null, score: match?.score ?? 0 };
    });
    await this.audit.create({
      userId: actor.id,
      action: 'rollcall.ai.read_sheet',
      resource: 'RollCallGroup',
      resourceId: groupId,
      details: {
        model: this.llm.model,
        names: names.length,
        matched: names.filter((n) => n.memberId).length,
      },
    });
    return names;
  }
}
