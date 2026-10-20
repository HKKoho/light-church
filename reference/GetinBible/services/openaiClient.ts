import OpenAI from 'openai';

/**
 * Browser-side OpenAI client that talks to our own /api/openai proxy
 * (api/openai.ts). The real API key stays on the server as OPENAI_API_KEY;
 * nothing secret is bundled into the frontend.
 *
 * Set VITE_OPENAI_ENABLED=false to turn OpenAI features off (e.g. when only
 * the Ollama fallback is configured).
 */
export const isOpenAIEnabled = import.meta.env.VITE_OPENAI_ENABLED !== 'false';

export function createOpenAIClient(): OpenAI | null {
  if (!isOpenAIEnabled) return null;
  return new OpenAI({
    apiKey: 'proxied', // placeholder; the proxy ignores it and adds the real key
    baseURL: `${window.location.origin}/api/openai`,
    dangerouslyAllowBrowser: true,
  });
}
