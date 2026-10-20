/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_GEMINI_ENABLED?: string
  readonly VITE_GOOGLE_CLOUD_TTS_ENABLED?: string
  readonly VITE_OPENAI_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
