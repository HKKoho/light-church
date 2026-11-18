import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { authFetch } from '@/lib/auth';

/**
 * Super-admin controlled nav visibility (SystemSettings.hiddenNavKeys).
 *
 * Key scheme:
 *  - `topbar:<menuKey>`            — a whole top-bar menu (e.g. `topbar:bibleMinistries`)
 *  - `topbar:<menuKey>:<itemKey>`  — one item in a top-bar menu
 *  - `sidebar:<groupKey>`         — a whole sidebar group (e.g. `sidebar:phase2`)
 *  - `sidebar:<groupKey>:<itemKey>` — one item in a sidebar group
 *  - `ai-tool:builtin:<key>`       — a built-in AI tool (e.g. `ai-tool:builtin:rollCall`)
 *  - `ai-tool:<name>`              — an uploaded AI tool (its folder name; names never contain ':')
 *
 * Hiding only removes the link; pages remain reachable by URL and keep their
 * own role checks.
 */
export const topbarMenuNavKey = (menuKey: string) => `topbar:${menuKey}`;
export const topbarItemNavKey = (menuKey: string, itemKey: string) =>
  `topbar:${menuKey}:${itemKey}`;
export const sidebarGroupNavKey = (groupKey: string) => `sidebar:${groupKey}`;
export const sidebarItemNavKey = (groupKey: string, itemKey: string) =>
  `sidebar:${groupKey}:${itemKey}`;
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

/** True when `key` or any parent (`sidebar:phase2` for `sidebar:phase2:tasks`) is hidden. */
export function isNavKeyHidden(key: string, hiddenKeys: ReadonlySet<string>): boolean {
  const parts = key.split(':');
  for (let i = 2; i <= parts.length; i += 1) {
    if (hiddenKeys.has(parts.slice(0, i).join(':'))) return true;
  }
  return false;
}

const getSnapshot = () => hidden;
const getServerSnapshot = () => EMPTY;

export function useNavVisibility() {
  const hiddenKeys = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!loaded) void reloadNavVisibility();
  }, []);

  const isHidden = useCallback((key: string) => isNavKeyHidden(key, hiddenKeys), [hiddenKeys]);

  return { hiddenKeys, isHidden };
}
