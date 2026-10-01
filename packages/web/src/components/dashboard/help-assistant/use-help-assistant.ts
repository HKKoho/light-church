'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HELP_ASSISTANT_MAX_ATTACHMENTS,
  HELP_ASSISTANT_MAX_MESSAGES,
  type HelpAssistantAttachment,
  type HelpAssistantChatResponse,
  type HelpAssistantExtractResponse,
  type HelpAssistantMessage,
  type HelpAssistantSource,
} from '@clawix/shared';

import { authFetch, ensureAccessToken } from '@/lib/auth';
import type { Lang } from '@/lib/i18n';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

/** Kept for the browser tab only — closing the tab forgets the conversation. */
export const HELP_ASSISTANT_STORAGE_KEY = 'help-assistant:v1';

export interface HelpAssistantEntry extends HelpAssistantMessage {
  readonly id: string;
  readonly sources?: readonly HelpAssistantSource[];
  /** Names of documents that were attached to this user message. */
  readonly attachmentNames?: readonly string[];
}

interface StoredState {
  readonly entries: readonly HelpAssistantEntry[];
  readonly attachments: readonly HelpAssistantAttachment[];
}

function load(): StoredState {
  try {
    const raw = sessionStorage.getItem(HELP_ASSISTANT_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredState;
  } catch {
    /* private mode or corrupt value — start empty */
  }
  return { entries: [], attachments: [] };
}

function save(state: StoredState): void {
  try {
    sessionStorage.setItem(HELP_ASSISTANT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode — the chat still works, it just won't survive a reload */
  }
}

let counter = 0;
const nextId = () => `${Date.now()}-${(counter += 1)}`;

export function useHelpAssistant(opts: { readonly lang: Lang; readonly currentPage: string }) {
  const [entries, setEntries] = useState<readonly HelpAssistantEntry[]>([]);
  const [attachments, setAttachments] = useState<readonly HelpAssistantAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const loaded = useRef(false);

  useEffect(() => {
    const stored = load();
    setEntries(stored.entries);
    setAttachments(stored.attachments);
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (loaded.current) save({ entries, attachments });
  }, [entries, attachments]);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const content = text.trim();
      if (!content || sending) return false;
      const userEntry: HelpAssistantEntry = {
        id: nextId(),
        role: 'user',
        content,
        ...(attachments.length > 0 ? { attachmentNames: attachments.map((a) => a.name) } : {}),
      };
      const history = [...entries, userEntry];
      setEntries(history);
      setSending(true);
      setError('');
      try {
        const res = await authFetch<{ data: HelpAssistantChatResponse }>(
          '/api/v1/help-assistant/chat',
          {
            method: 'POST',
            body: JSON.stringify({
              messages: history
                .slice(-HELP_ASSISTANT_MAX_MESSAGES)
                .map(({ role, content: c }) => ({ role, content: c })),
              attachments,
              currentPage: opts.currentPage,
              lang: opts.lang,
            }),
          },
        );
        setEntries((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            content: res.data.reply,
            sources: res.data.sources,
          },
        ]);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        // Take the unanswered question back out so it can be edited and resent.
        setEntries((prev) => prev.filter((e) => e.id !== userEntry.id));
        return false;
      } finally {
        setSending(false);
      }
    },
    [attachments, entries, opts.currentPage, opts.lang, sending],
  );

  const attach = useCallback(
    async (file: File): Promise<HelpAssistantExtractResponse | null> => {
      if (attachments.length >= HELP_ASSISTANT_MAX_ATTACHMENTS) {
        setError(`Up to ${HELP_ASSISTANT_MAX_ATTACHMENTS} documents at a time`);
        return null;
      }
      setUploading(true);
      setError('');
      try {
        const token = await ensureAccessToken();
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${API_BASE}/api/v1/help-assistant/extract`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        const body = (await res.json().catch(() => ({}))) as {
          data?: HelpAssistantExtractResponse;
          message?: string;
        };
        if (!res.ok || !body.data) throw new Error(body.message ?? res.statusText);
        const doc = body.data;
        setAttachments((prev) => [...prev, { name: doc.name, text: doc.text }]);
        return doc;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not read that file');
        return null;
      } finally {
        setUploading(false);
      }
    },
    [attachments.length],
  );

  const removeAttachment = useCallback((name: string) => {
    setAttachments((prev) => prev.filter((a) => a.name !== name));
  }, []);

  const reset = useCallback(() => {
    setEntries([]);
    setAttachments([]);
    setError('');
  }, []);

  return {
    entries,
    attachments,
    sending,
    uploading,
    error,
    send,
    attach,
    removeAttachment,
    reset,
  };
}
