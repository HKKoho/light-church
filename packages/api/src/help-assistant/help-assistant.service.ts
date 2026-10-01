// packages/api/src/help-assistant/help-assistant.service.ts
//
// The dashboard Help Assistant: a short, bounded tool loop on the church's
// default provider (via OneShotLlmService, so usage is accounted for). It is
// not an agent run — no container, no session, nothing stored; the browser
// sends the conversation each turn.
import { Injectable } from '@nestjs/common';
import type {
  ChatMessage,
  HelpAssistantChatResponse,
  HelpAssistantSource,
  LLMResponse,
} from '@clawix/shared';
import { helpAssistantChatSchema } from '@clawix/shared';
import type { z } from 'zod';

import type { JwtPayload } from '../auth/auth.types.js';
import { OneShotLlmService } from '../engine/one-shot/one-shot-llm.service.js';
import { SearchProviderRegistry } from '../engine/tools/web/search-provider.js';
import { WorkspaceService } from '../workspace/workspace.service.js';
import { buildSystemPrompt, withAttachments } from './help-assistant.prompt.js';
import { HELP_ASSISTANT_TOOLS, runTool, type ToolDeps } from './help-assistant.tools.js';
import { WorkspaceSearch } from './workspace-search.js';

type ChatInput = z.output<typeof helpAssistantChatSchema>;

/** Tool rounds before the model must answer with what it has. */
export const MAX_TOOL_ROUNDS = 4;
const USAGE_TAG = 'help-assistant';
const FALLBACK_REPLY = "Sorry, I couldn't put an answer together. Please try asking again.";

/** For the final round: tool calls and results become plain text so any provider accepts it without tools. */
function flattenToolHistory(messages: readonly ChatMessage[]): ChatMessage[] {
  return messages.map((m): ChatMessage => {
    if (m.role === 'tool') return { role: 'user', content: `Tool result:\n${m.content}` };
    if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
      const calls = m.toolCalls.map((c) => `${c.name}(${JSON.stringify(c.arguments)})`).join(', ');
      return { role: 'assistant', content: `${m.content}\n[Looked up: ${calls}]`.trim() };
    }
    return m;
  });
}

function dedupeSources(sources: readonly HelpAssistantSource[]): HelpAssistantSource[] {
  const seen = new Set<string>();
  return sources.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
}

@Injectable()
export class HelpAssistantService {
  private readonly workspaceSearch: WorkspaceSearch;

  constructor(
    private readonly llm: OneShotLlmService,
    private readonly searchRegistry: SearchProviderRegistry,
    workspace: WorkspaceService,
  ) {
    this.workspaceSearch = new WorkspaceSearch(workspace);
  }

  async chat(user: JwtPayload, input: ChatInput): Promise<HelpAssistantChatResponse> {
    const system = buildSystemPrompt({
      ...(input.currentPage !== undefined ? { currentPage: input.currentPage } : {}),
      ...(input.lang !== undefined ? { lang: input.lang } : {}),
      today: new Date().toISOString().slice(0, 10),
    });
    const last = input.messages.length - 1;
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      ...input.messages.map(
        (m, i): ChatMessage => ({
          role: m.role,
          content: i === last ? withAttachments(m.content, input.attachments) : m.content,
        }),
      ),
    ];
    const deps: ToolDeps = {
      search: this.searchRegistry,
      workspace: this.workspaceSearch,
      user: { userId: user.sub, role: user.role, department: user.department },
    };
    const sources: HelpAssistantSource[] = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response = await this.call(user.sub, messages, true);
      if (response.toolCalls.length === 0) {
        return {
          reply: response.content?.trim() || FALLBACK_REPLY,
          sources: dedupeSources(sources),
        };
      }
      messages.push({
        role: 'assistant',
        content: response.content ?? '',
        toolCalls: response.toolCalls,
      });
      for (const call of response.toolCalls) {
        const result = await runTool(call, deps);
        sources.push(...result.sources);
        messages.push({ role: 'tool', toolCallId: call.id, content: result.content });
      }
    }

    const final = await this.call(user.sub, flattenToolHistory(messages), false);
    return { reply: final.content?.trim() || FALLBACK_REPLY, sources: dedupeSources(sources) };
  }

  private call(userId: string, messages: ChatMessage[], withTools: boolean): Promise<LLMResponse> {
    return this.llm.chat({
      messages,
      userId,
      usageTag: USAGE_TAG,
      ...(withTools ? { tools: HELP_ASSISTANT_TOOLS } : {}),
    });
  }
}
