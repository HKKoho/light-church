import { useEffect, useState } from 'react';
import { ensureAccessToken } from '@/lib/auth';

/**
 * Loads an image from an auth-protected API endpoint (JWT read only from the
 * Authorization header — see jwt.strategy.ts's fromAuthHeaderAsBearerToken)
 * and exposes it as an object URL a plain <img src> can use. A bare <img>
 * pointed at such an endpoint can never authenticate — the browser attaches
 * no custom headers to image requests.
 */
export function useAuthedImageUrl(src: string | null | undefined): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setObjectUrl(null);
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    void (async () => {
      const token = await ensureAccessToken();
      const res = await fetch(src, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok || cancelled) return;
      const blob = await res.blob();
      createdUrl = URL.createObjectURL(blob);
      if (!cancelled) setObjectUrl(createdUrl);
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src]);

  return objectUrl;
}
