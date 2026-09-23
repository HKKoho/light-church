// Lets an officer download the bulletin they're editing as a JSON file on
// their own PC, and re-upload it later to resume work — a durable backup
// that survives a lost browser/profile without needing any server storage,
// since this app is a static serverless frontend.

import { ChurchService } from '../types/bulletin';

function isChurchService(value: unknown): value is ChurchService {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.date === 'string' &&
    Array.isArray(v.items) &&
    Array.isArray(v.serviceRoster)
  );
}

export function downloadBulletinBackup(service: ChurchService) {
  const blob = new Blob([JSON.stringify(service, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = service.title.replace(/[\\/:*?"<>|\s　]+/g, '_');
  link.href = url;
  link.download = `bulletin-${safeTitle}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function readBulletinBackup(file: File): Promise<ChurchService> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('這不是有效的 JSON 備份檔案。');
  }
  if (!isChurchService(parsed)) {
    throw new Error('檔案內容不是有效的週報備份格式。');
  }
  return parsed;
}
