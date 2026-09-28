// Lets an officer download the bulletin they're editing as a PDF file on
// their own PC (bulletin JSON embedded inside), and re-upload it later to resume work — a durable backup
// that survives a lost browser/profile without needing any server storage,
// since this app is a static serverless frontend.

import { ChurchService } from '../types/bulletin';
import { buildBulletinPdf, readPdfBackupJson } from './bulletinPdfBackup';

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

export async function downloadBulletinBackup(service: ChurchService) {
  const blob = await buildBulletinPdf(service);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = service.title.replace(/[\\/:*?"<>|\s　]+/g, '_');
  link.href = url;
  link.download = `bulletin-${safeTitle}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function readBulletinBackup(file: File): Promise<ChurchService> {
  // Older backups were plain JSON files; still accept those.
  const isJson = file.name.toLowerCase().endsWith('.json') || file.type === 'application/json';
  const text = isJson ? await file.text() : await readPdfBackupJson(file);
  if (text === null) {
    throw new Error('這個 PDF 不是由「下載本週週報備份」產生，無法還原。');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('這不是有效的週報備份檔案。');
  }
  if (!isChurchService(parsed)) {
    throw new Error('檔案內容不是有效的週報備份格式。');
  }
  return parsed;
}
