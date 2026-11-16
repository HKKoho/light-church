import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { authFetch } from '@/lib/auth';

/**
 * Super-admin controlled nav visibility (SystemSettings.hiddenNavKeys).
 *
 * Key scheme:
 *  - `topbar:<menuKey>`            — a whole top-bar menu (e.g. `topbar:bibleMinistries`)
 *  - `topbar:<menuKey>:<itemKey>`  — one item in a top-bar menu
 *  - `ai-tool:builtin:<key>`       — a built-in AI tool (e.g. `ai-tool:builtin:rollCall`)
 *  - `ai-tool:<name>`              — an uploaded AI tool (its folder name; names never contain ':')
 *
 * Hiding only removes the link; pages remain reachable by URL and keep their
 * own role checks.
 */
export const topbarMenuNavKey = (menuKey: string) => `topbar:${menuKey}`;
export const topbarItemNavKey = (menuKey: string, itemKey: string) =>
  `topbar:${menuKey}:${itemKey}`;
export const builtInAiToolNavKey = (key: string) => `ai-tool:builtin:${key}`;
export const uploadedAiToolNavKey = (name: string) => `ai-tool:${name}`;

interface NavVisibilityResponse {
  readonly success: boolean;
  readonly data: { readonly hiddenNavKeys: readonly string[] };
}

// Module-level store so the top bar, sidebar and settings page share one fetch
// and update together when the super admin saves.
const EMPTY: ReadonlySet<string> = new Set();
let hidden: ReadonlySet<string> = EMPTY;
let loaded = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

export function setHiddenNavKeys(keys: readonly string[]): void {
  hidden = new Set(keys);
  loaded = true;
  emit();
}

export function reloadNavVisibility(): Promise<void> {
  inflight ??= authFetch<NavVisibilityResponse>('/api/v1/system-settings/nav-visibility')
    .then((res) => {
      setHiddenNavKeys(res.data.hiddenNavKeys);
    })
    .catch(() => {
      // Show everything on failure (e.g. logged out) rather than hiding nav.
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => hidden;
const getServerSnapshot = () => EMPTY;

export function useNavVisibility() {
  const hiddenKeys = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!loaded) void reloadNavVisibility();
  }, []);

  const isHidden = useCallback((key: string) => hiddenKeys.has(key), [hiddenKeys]);

  return { hiddenKeys, isHidden };
}
