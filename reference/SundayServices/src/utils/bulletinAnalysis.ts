import type { BulletinAnalysis } from '../../server/geminiAnalyzeBulletins';

export type { BulletinAnalysis };

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

// Calls the server-side Gemini endpoint (server.ts in production, the Vite
// dev-plugin in vite.config.ts locally) — the API key never reaches the
// browser.
export async function requestBulletinAnalysis(
  churchName: string,
  files: File[]
): Promise<BulletinAnalysis> {
  const encodedFiles = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      mimeType: file.type || 'application/pdf',
      base64: await fileToBase64(file),
    }))
  );

  const response = await fetch('/api/analyze-bulletins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ churchName, files: encodedFiles }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `分析請求失敗（HTTP ${response.status}）`);
  }

  return response.json();
}

const STORAGE_KEY = 'bulletinFormatAnalysis';

export function storePendingBulletinAnalysis(churchName: string, analysis: BulletinAnalysis) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ churchName, ...analysis, analyzedAt: new Date().toISOString() })
    );
  } catch {
    // localStorage may be unavailable (e.g. private browsing); the analysis
    // banner is a nice-to-have, so just skip persisting it.
  }
}

export function consumePendingBulletinAnalysis():
  | (BulletinAnalysis & { churchName: string; analyzedAt: string })
  | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
