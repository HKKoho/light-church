import { mergeConfig, type UserConfig } from 'vite';
import base from './vite.config';

// Single-file build for a Light Church AI Tool: one JS chunk and one CSS file,
// so scripts/build-ai-tool-bundle.mjs can inline everything into index.html.
export default async () => {
  const resolved = (
    typeof base === 'function'
      ? await (base as (env: unknown) => unknown)({ command: 'build', mode: 'production' })
      : base
  ) as UserConfig;
  return mergeConfig(resolved, {
    build: {
      cssCodeSplit: false,
      assetsInlineLimit: 100_000_000,
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  });
};
