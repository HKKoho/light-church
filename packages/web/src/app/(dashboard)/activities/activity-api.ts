import { useEffect, useState } from 'react';
import type { ActivityAssetInfo } from '@clawix/shared';
import { getAccessToken } from '@/lib/auth';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export const ACTIVITIES_API = '/api/v1/activities';

export const assetPath = (activityId: string, assetId: string) =>
  `${ACTIVITIES_API}/${activityId}/assets/${assetId}`;

/** Uploads one file (image, document or audio) to an activity. */
export async function uploadActivityAsset(
  activityId: string,
  file: File,
): Promise<ActivityAssetInfo> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const form = new FormData();
  form.append('file', file, file.name);
  const res = await fetch(`${API_BASE}${ACTIVITIES_API}/${activityId}/assets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = (await res.json().catch(() => ({ message: res.statusText }))) as {
    data?: ActivityAssetInfo;
    message?: string;
  };
  if (!res.ok || !body.data) throw new Error(body.message ?? res.statusText);
  return body.data;
}

/** Fetches a protected file with the bearer token and returns an object URL. */
export async function fetchAssetBlob(activityId: string, assetId: string): Promise<Blob> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}${assetPath(activityId, assetId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.blob();
}

/** Object URL for an activity file (images, audio); revoked on unmount. */
export function useAssetUrl(activityId: string, assetId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!assetId) {
      setUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    fetchAssetBlob(activityId, assetId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        setUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activityId, assetId]);
  return url;
}

/** Downloads a file via the authenticated API. */
export async function downloadAsset(activityId: string, asset: ActivityAssetInfo): Promise<void> {
  const blob = await fetchAssetBlob(activityId, asset.id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = asset.fileName;
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10_000);
}

/** Accepts a YouTube video id or any youtube.com / youtu.be URL. */
export function youtubeIdFrom(input: string): string {
  const value = input.trim();
  if (value === '' || /^[A-Za-z0-9_-]{6,20}$/.test(value)) return value;
  const match = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{6,20})/.exec(value);
  return match?.[1] ?? value;
}

export const formatBytes = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

export function dateRange(start: string, end: string): string {
  if (!start) return end;
  return end && end !== start ? `${start} – ${end}` : start;
}
