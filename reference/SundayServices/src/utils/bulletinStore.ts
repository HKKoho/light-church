// The church's shared bulletins, kept in Light Church's Postgres. Inside
// Light Church these relative fetches are forwarded by the dashboard to the
// API (see packages/web/src/lib/ai-tool-server-routes.ts); run standalone
// they fail, and the editor falls back to the in-memory sample data.
// Archived bulletins are never listed again but stay in the database.

import { ChurchService, RosterScheduleEntry } from '../types/bulletin';
import { parseChineseDate } from './chineseDate';
import { toIsoDate } from './dateNormalize';

export interface SharedBulletins {
  bulletins: ChurchService[];
  /** Uploaded past-bulletin PDFs still being read by AI. */
  pendingImports: number;
  /** Uploaded PDFs AI could not read; uploading one again retries it. */
  failedImports?: FailedImport[];
}

export interface FailedImport {
  fileName: string;
  reason: string;
}

const SAVE_BATCH = 20;

async function send(url: string, method: string, body?: unknown): Promise<Response> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }
  return response;
}

/** The shared bulletins, or null when there is no Light Church server (standalone). */
export async function loadSharedBulletins(): Promise<SharedBulletins | null> {
  try {
    const data = await (await send('/api/bulletins', 'GET')).json();
    return Array.isArray(data?.bulletins) ? data : null;
  } catch {
    return null;
  }
}

export async function saveSharedBulletins(bulletins: ChurchService[]): Promise<void> {
  for (let i = 0; i < bulletins.length; i += SAVE_BATCH) {
    await send('/api/bulletins', 'PUT', { bulletins: bulletins.slice(i, i + SAVE_BATCH) });
  }
}

/**
 * Archives every shared bulletin (they stay in Postgres) so the church starts
 * over. Returns how many, or null when there is no Light Church server.
 */
export async function resetSharedBulletins(): Promise<number | null> {
  let response: Response;
  try {
    response = await fetch('/api/bulletins/reset', { method: 'POST' });
  } catch {
    return null;
  }
  // Standalone there is no such route (404) or no tool server (503).
  if (response.status === 404 || response.status === 503) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
  return typeof data.archived === 'number' ? data.archived : 0;
}

export async function archiveSharedBulletin(id: string): Promise<void> {
  await send('/api/bulletins/archive', 'POST', { id });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Has AI read a printed duty roster (司職表) PDF into roster schedule entries,
 * named after `service`'s own roster rows, whose names show the AI how the
 * church maps roster columns onto the bulletin. Takes about half a minute.
 */
export async function importRosterPdf(
  file: File,
  service: ChurchService
): Promise<{ entries: RosterScheduleEntry[]; notes: string[] }> {
  const serviceDate = parseChineseDate(service.date);
  const examples = service.serviceRoster.map((row) => ({
    section: row.section,
    role: row.role,
    example: row.thisWeek && row.thisWeek !== '--' ? row.thisWeek : '',
  }));
  const data = await (
    await send('/api/import-roster', 'POST', {
      fileName: file.name,
      base64: await fileToBase64(file),
      examples,
      ...(serviceDate ? { examplesDate: toIsoDate(serviceDate) } : {}),
    })
  ).json();
  const stamp = Date.now().toString(36);
  const entries: RosterScheduleEntry[] = (data.entries ?? []).map(
    (e: Omit<RosterScheduleEntry, 'id'>, i: number) => ({ ...e, id: `rs-pdf-${stamp}-${i}` })
  );
  return { entries, notes: data.notes ?? [] };
}

/** Archives past-bulletin PDFs and has AI read each into a bulletin (in the background). */
export async function importBulletinPdfs(
  churchName: string,
  files: File[]
): Promise<{ archived: number; duplicates: number; importing: number }> {
  const encoded = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      mimeType: 'application/pdf',
      base64: await fileToBase64(file),
    }))
  );
  return (await send('/api/import-bulletins', 'POST', { churchName, files: encoded })).json();
}
