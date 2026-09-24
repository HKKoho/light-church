// packages/api/src/roll-call/roll-call-ai.service.ts
//
// Roll Call's local-AI feature: suggesting Chinese/English duplicates. Only
// Chinese names go to the local model (LocalLlmService refuses non-local
// URLs), only while a super_admin has the switch on, and every use is written
// to the audit log (counts, never names).
import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { RollCallAiStatus, RollCallDuplicate } from '@clawix/shared';

import { AuditLogRepository } from '../db/audit-log.repository.js';
import { RollCallRepository } from '../db/roll-call.repository.js';
import { SystemSettingsRepository } from '../db/system-settings.repository.js';
import { LocalLlmService } from '../engine/local-llm/local-llm.service.js';
import { assertManager, toMemberInfo, type Actor, RollCallService } from './roll-call.service.js';
import { findCrossScriptDuplicates, findDuplicates } from './roll-call-names.js';

/** Key in SystemSettings.settings; written only through setEnabled(). */
const SETTING_KEY = 'rollCallLocalAi';
/** Names per model call when looking for cross-script duplicates. */
const MAX_AI_NAMES = 300;

const formsPrompt = (names: readonly string[]) => `For each numbered Chinese name below, give:
- "cantonese": its Hong Kong Cantonese romanisation as on an HKID card (陳大文 → Chan Tai Man)
- "mandarin": its Mandarin pinyin without tones (陳大文 → Chen Da Wen)
- "traditional": the name in traditional Chinese characters
${names.map((n, i) => `${i}. ${n}`).join('\n')}
Reply with JSON only: {"names": [{"i": 0, "cantonese": "", "mandarin": "", "traditional": ""}]}`;

const isChinese = (name: string) => /\p{Script=Han}/u.test(name) && !/[A-Za-z]/.test(name);
const isLatin = (name: string) => /[A-Za-z]/.test(name) && !/\p{Script=Han}/u.test(name);
const str = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 100) : '');

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
    // Only Chinese names go to the model, which just romanises them; the
    // matching itself happens here, so it cannot invent pairs.
    const active = members.filter((m) => m.active);
    const chinese = active.filter((m) => isChinese(m.name)).slice(0, MAX_AI_NAMES);
    if (chinese.length === 0) return result;
    const reply = await this.llm.json(formsPrompt(chinese.map((m) => m.name)));
    const rows = Array.isArray(reply['names']) ? (reply['names'] as unknown[]) : [];
    const withForms = rows.flatMap((raw) => {
      const r = raw as Record<string, unknown>;
      const item = typeof r['i'] === 'number' ? chinese[r['i']] : undefined;
      if (!item) return [];
      const romanised = [str(r['cantonese']), str(r['mandarin'])].filter(Boolean);
      return [{ item, forms: { traditional: str(r['traditional']), romanised } }];
    });
    const seen = new Set(result.map((p) => [p.a.id, p.b.id].sort().join('|')));
    const found = findCrossScriptDuplicates(
      withForms,
      active.filter((m) => isLatin(m.name)),
    );
    for (const p of found) {
      const key = [p.a.id, p.b.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ ...p, source: 'ai' });
    }
    await this.audit.create({
      userId: actor.id,
      action: 'rollcall.ai.duplicates',
      resource: 'RollCallGroup',
      resourceId: groupId,
      details: { model: this.llm.model, names: chinese.length, suggestions: found.length },
    });
    return result;
  }
}
