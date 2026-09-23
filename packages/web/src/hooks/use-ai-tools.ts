import { useCallback, useEffect, useState } from 'react';
import type { AiToolSummary } from '@clawix/shared';
import type { Lang } from '@/lib/i18n';
import { authFetch } from '@/lib/auth';

// Fired after an upload/delete so every mounted list (sidebar + page) refreshes.
export const AI_TOOLS_CHANGED_EVENT = 'ai-tools-changed';

interface AiToolsResponse {
  readonly success: boolean;
  readonly data: AiToolSummary[];
}

/** Lists the church-wide Phase 1 AI tools (`<data>/AITools/<name>/`). */
export function useAiTools() {
  const [tools, setTools] = useState<readonly AiToolSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await authFetch<AiToolsResponse>('/api/v1/ai-tools');
      setTools(res.data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const onChanged = () => void reload();
    window.addEventListener(AI_TOOLS_CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener(AI_TOOLS_CHANGED_EVENT, onChanged);
    };
  }, [reload]);

  return { tools, error, isLoading, reload };
}

/** The tool's name in the current language, falling back to English, then its folder id. */
export function aiToolLabel(tool: Pick<AiToolSummary, 'name' | 'displayName'>, lang: Lang): string {
  return tool.displayName?.[lang] ?? tool.displayName?.en ?? tool.name;
}

/** The tool's description in the current language, falling back to its plain description. */
export function aiToolDescription(
  tool: Pick<AiToolSummary, 'description' | 'descriptions'>,
  lang: Lang,
): string | null {
  return tool.descriptions?.[lang] ?? tool.description;
}
