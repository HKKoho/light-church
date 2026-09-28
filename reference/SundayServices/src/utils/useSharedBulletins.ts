// Keeps the editor's bulletins in sync with the church's shared copy in Light
// Church (see bulletinStore.ts): loads them on open, saves edits shortly after
// they happen, picks up bulletins AI has read from uploaded PDFs, and archives.
// Standalone (no Light Church server) it runs on the in-memory sample data.
// Inside Light Church the sample (and drafts derived from it) only fills the
// editor until real bulletins exist — it is never saved as the church's own.

import { useEffect, useRef, useState } from 'react';
import { ChurchService } from '../types/bulletin';
import { parseChineseDate } from './chineseDate';
import { isUntouchedDraft } from './rebuildDrafts';
import {
  FailedImport,
  archiveSharedBulletin,
  importBulletinPdfs,
  loadSharedBulletins,
  saveSharedBulletins,
} from './bulletinStore';

type Mode = 'loading' | 'shared' | 'local';

const POLL_MS = 5000;
const SAVE_DEBOUNCE_MS = 1500;

function byDate(list: ChurchService[]): ChurchService[] {
  const time = (s: ChurchService) => parseChineseDate(s.date)?.getTime() ?? 0;
  return [...list].sort((a, b) => time(a) - time(b));
}

/**
 * `withUpcoming` adds any missing coming/next-Sunday drafts, derived from the
 * latest bulletin in the list it is given. `onImported` hears about bulletins
 * AI has just read from uploaded PDFs.
 */
export function useSharedBulletins(
  sample: ChurchService[],
  withUpcoming: (list: ChurchService[]) => ChurchService[],
  onImported: (imported: ChurchService[], current: ChurchService[]) => void
) {
  const [services, setServices] = useState<ChurchService[]>([]);
  const [mode, setMode] = useState<Mode>('loading');
  const [pendingImports, setPendingImports] = useState(0);
  const [failedImports, setFailedImports] = useState<FailedImport[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Latest values for the async callbacks below.
  const latest = useRef({ services, withUpcoming, onImported });
  latest.current = { services, withUpcoming, onImported };
  const saved = useRef(new Map<string, string>());
  // Ids of the sample bulletins and the drafts derived from them.
  const sampleBased = useRef(new Set<string>());

  const build = (list: ChurchService[]) => byDate(latest.current.withUpcoming(list));
  const buildFromSample = () => {
    const list = build(sample);
    list.forEach((s) => sampleBased.current.add(s.id));
    return list;
  };
  // A sample-derived draft becomes the church's own once an officer edits it;
  // the sample itself and untouched drafts never do.
  const isSampleOnly = (s: ChurchService) =>
    sampleBased.current.has(s.id) && (sample.some((x) => x.id === s.id) || isUntouchedDraft(s));

  useEffect(() => {
    let cancelled = false;
    loadSharedBulletins().then((shared) => {
      if (cancelled) return;
      if (!shared) {
        setServices(build(sample));
        setMode('local');
        return;
      }
      shared.bulletins.forEach((b) => saved.current.set(b.id, JSON.stringify(b)));
      setPendingImports(shared.pendingImports);
      setFailedImports(shared.failedImports ?? []);
      // First use with PDFs still being read: wait for all of them, so the
      // coming Sunday is derived from the latest one rather than the sample.
      if (shared.bulletins.length > 0) {
        setServices(build(shared.bulletins));
      } else if (shared.pendingImports === 0) {
        setServices(buildFromSample());
      }
      setMode('shared');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pick up bulletins AI finishes reading from uploaded PDFs.
  useEffect(() => {
    if (mode !== 'shared' || pendingImports === 0) return;
    const timer = setInterval(async () => {
      const shared = await loadSharedBulletins();
      if (!shared) return;
      const current = latest.current.services;
      const known = new Set(current.map((s) => s.id));
      const fresh = shared.bulletins.filter((b) => !known.has(b.id));
      const waiting = current.length === 0;
      setPendingImports(shared.pendingImports);
      setFailedImports(shared.failedImports ?? []);
      if (waiting && shared.pendingImports > 0) return;
      fresh.forEach((b) => saved.current.set(b.id, JSON.stringify(b)));
      if (waiting) {
        setServices(fresh.length > 0 ? build(fresh) : buildFromSample());
      } else if (fresh.length > 0) {
        // Real bulletins replace the sample stand-ins.
        const own = current.filter((s) => !isSampleOnly(s));
        setServices(build([...own, ...fresh]));
        latest.current.onImported(fresh, own);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [mode, pendingImports]);

  // Save changed bulletins shortly after each edit.
  useEffect(() => {
    if (mode !== 'shared' || services.length === 0) return;
    const timer = setTimeout(() => {
      const changed = services.filter(
        (s) => !isSampleOnly(s) && saved.current.get(s.id) !== JSON.stringify(s)
      );
      if (changed.length === 0) return;
      saveSharedBulletins(changed)
        .then(() => {
          changed.forEach((s) => saved.current.set(s.id, JSON.stringify(s)));
          setSaveError(null);
        })
        .catch((err) => setSaveError(err instanceof Error ? err.message : String(err)));
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [services, mode]);

  /**
   * Hides a bulletin from the editor for good (it stays in Postgres), then
   * re-derives the coming/next Sunday from what is left if it was one of them.
   */
  const archive = async (id: string): Promise<ChurchService[]> => {
    if (mode === 'shared' && saved.current.has(id)) await archiveSharedBulletin(id);
    saved.current.delete(id);
    const next = build(latest.current.services.filter((s) => s.id !== id));
    setServices(next);
    return next;
  };

  /**
   * Sends past-bulletin PDFs for AI to read; the bulletins it makes are picked
   * up by the polling above and added to the list.
   */
  const importPdfs = async (churchName: string, files: File[]) => {
    if (mode !== 'shared') throw new Error('此功能需在 Light Church 內使用。');
    const result = await importBulletinPdfs(churchName, files);
    setPendingImports((n) => n + result.importing);
    return result;
  };

  return { services, setServices, mode, pendingImports, failedImports, saveError, archive, importPdfs };
}
