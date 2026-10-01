// packages/api/src/help-assistant/__tests__/help-assistant.service.test.ts
import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage, LLMResponse, ToolCallRequest } from '@clawix/shared';

import type { JwtPayload } from '../../auth/auth.types.js';
import type { OneShotLlmService } from '../../engine/one-shot/one-shot-llm.service.js';
import type { SearchProviderRegistry } from '../../engine/tools/web/search-provider.js';
import type { WorkspaceService } from '../../workspace/workspace.service.js';
import { HelpAssistantService, MAX_TOOL_ROUNDS } from '../help-assistant.service.js';

const user = { sub: 'u1', role: 'staff', department: 'all' } as unknown as JwtPayload;

function reply(content: string | null, toolCalls: ToolCallRequest[] = []): LLMResponse {
  return {
    content,
    toolCalls,
    finishReason: toolCalls.length > 0 ? 'tool_use' : 'stop',
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    thinkingBlocks: null,
  };
}

const searchCall: ToolCallRequest = {
  id: 'c1',
  name: 'web_search',
  arguments: { query: 'easter' },
};

function makeService(responses: LLMResponse[]) {
  const chat = vi.fn(async () => responses.shift() ?? reply('done'));
  const search = {
    search: vi.fn(async () => [{ title: 'Easter', url: 'https://e.org', snippet: 's' }]),
  };
  const service = new HelpAssistantService(
    { chat } as unknown as OneShotLlmService,
    search as unknown as SearchProviderRegistry,
    {} as WorkspaceService,
  );
  return { service, chat, search };
}

const input = (content = 'How do I take attendance?') => ({
  messages: [{ role: 'user' as const, content }],
  attachments: [],
});

describe('HelpAssistantService', () => {
  it('answers directly when no tool is needed', async () => {
    const { service, chat } = makeService([reply('  Open Roll Call.  ')]);
    const result = await service.chat(user, { ...input(), currentPage: '/roll-call', lang: 'en' });
    expect(result).toEqual({ reply: 'Open Roll Call.', sources: [] });
    const call = chat.mock.calls[0]?.[0] as unknown as {
      messages: ChatMessage[];
      tools: unknown[];
      usageTag: string;
    };
    expect(call.usageTag).toBe('help-assistant');
    expect(call.tools.length).toBe(3);
    expect(call.messages[0]?.content).toContain('/roll-call');
  });

  it('runs tool calls, feeds results back and returns deduplicated sources', async () => {
    const { service, chat, search } = makeService([
      reply(null, [searchCall, { ...searchCall, id: 'c2' }]),
      reply('Easter is on…'),
    ]);
    const result = await service.chat(user, input('When is Easter?'));
    expect(search.search).toHaveBeenCalledTimes(2);
    expect(result.reply).toBe('Easter is on…');
    expect(result.sources).toEqual([{ title: 'Easter', url: 'https://e.org', kind: 'web' }]);
    const second = chat.mock.calls[1]?.[0] as unknown as { messages: ChatMessage[] };
    expect(second.messages.at(-2)).toMatchObject({ role: 'tool', toolCallId: 'c1' });
  });

  it('forces a plain answer without tools after the round limit', async () => {
    const looping = Array.from({ length: MAX_TOOL_ROUNDS }, () => reply('Looking', [searchCall]));
    const { service, chat } = makeService([...looping, reply('Final answer')]);
    const result = await service.chat(user, input());
    expect(result.reply).toBe('Final answer');
    expect(chat).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS + 1);
    const last = chat.mock.calls.at(-1)?.[0] as unknown as {
      messages: ChatMessage[];
      tools?: unknown;
    };
    expect(last.tools).toBeUndefined();
    expect(last.messages.some((m) => m.role === 'tool' || m.toolCalls)).toBe(false);
    expect(last.messages.some((m) => m.content.includes('[Looked up: web_search'))).toBe(true);
    expect(last.messages.some((m) => m.content.startsWith('Tool result:'))).toBe(true);
  });

  it('falls back to a friendly message on an empty reply', async () => {
    const { service } = makeService([reply('   ')]);
    expect((await service.chat(user, input())).reply).toMatch(/try asking again/);
  });

  it('falls back when the forced final reply is empty', async () => {
    const looping = Array.from({ length: MAX_TOOL_ROUNDS }, () => reply(null, [searchCall]));
    const { service } = makeService([...looping, reply(null)]);
    expect((await service.chat(user, input())).reply).toMatch(/try asking again/);
  });

  it('attaches documents to the latest user message only', async () => {
    const { service, chat } = makeService([reply('Summary')]);
    await service.chat(user, {
      messages: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'ok' },
        { role: 'user', content: 'Summarize it' },
      ],
      attachments: [{ name: 'notes.txt', text: 'Board meeting notes' }],
    });
    const call = chat.mock.calls[0]?.[0] as unknown as { messages: ChatMessage[] };
    expect(call.messages[1]?.content).toBe('first');
    expect(call.messages[3]?.content).toContain('<document name="notes.txt">');
    expect(call.messages[3]?.content).toContain('Summarize it');
  });
});
