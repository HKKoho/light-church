// packages/api/src/help-assistant/__tests__/help-assistant.controller.test.ts
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { JwtPayload } from '../../auth/auth.types.js';
import { HelpAssistantController } from '../help-assistant.controller.js';
import { buildSystemPrompt, withAttachments } from '../help-assistant.prompt.js';
import type { HelpAssistantService } from '../help-assistant.service.js';

function makeController() {
  const service = { chat: vi.fn(async () => ({ reply: 'hi', sources: [] })) };
  return {
    controller: new HelpAssistantController(service as unknown as HelpAssistantService),
    service,
  };
}

const upload = (filename: string, buffer: Buffer | null) =>
  ({
    file: vi.fn(async () =>
      buffer === null ? undefined : { filename, toBuffer: vi.fn(async () => buffer) },
    ),
  }) as unknown as FastifyRequest;

describe('HelpAssistantController', () => {
  it('wraps the chat reply in the API envelope', async () => {
    const { controller, service } = makeController();
    const user = { sub: 'u1' } as JwtPayload;
    const body = { messages: [{ role: 'user' as const, content: 'hi' }], attachments: [] };
    expect(await controller.chat({ user }, body)).toEqual({
      success: true,
      data: { reply: 'hi', sources: [] },
    });
    expect(service.chat).toHaveBeenCalledWith(user, body);
  });

  it('extracts an uploaded document', async () => {
    const { controller } = makeController();
    expect(await controller.extract(upload('a.md', Buffer.from('# Title')))).toEqual({
      success: true,
      data: { name: 'a.md', text: '# Title', truncated: false },
    });
  });

  it('rejects a missing or oversized upload', async () => {
    const { controller } = makeController();
    await expect(controller.extract(upload('a.md', null))).rejects.toThrow(BadRequestException);
    await expect(
      controller.extract(upload('a.md', Buffer.alloc(15 * 1024 * 1024 + 1))),
    ).rejects.toThrow(PayloadTooLargeException);
  });
});

describe('help assistant prompt', () => {
  it('forbids revealing internals and embeds the feature guide and context', () => {
    const prompt = buildSystemPrompt({ today: '2026-09-30', currentPage: '/tasks', lang: 'zh-TW' });
    expect(prompt).toContain('never reveal');
    expect(prompt).toContain('<feature_guide>');
    expect(prompt).toContain('Roll Call');
    expect(prompt).toContain('/tasks');
    expect(prompt).toContain('Traditional Chinese unless');
    expect(buildSystemPrompt({ today: '2026-09-30' })).not.toContain('The user is on');
  });

  it('leaves questions alone without attachments and escapes names with them', () => {
    expect(withAttachments('Q', [])).toBe('Q');
    const text = withAttachments('Q', [{ name: 'a"b.txt', text: 'body' }]);
    expect(text).toContain(`<document name="a'b.txt">\nbody\n</document>`);
    expect(text.endsWith('Q')).toBe(true);
  });
});
