#!/usr/bin/env bash
# Rebuild ai-tools/sunday-service-bulletin/index.html from reference/SundayServices.
# Builds in a temp copy (npm there never touches this pnpm repo's node_modules).
set -euo pipefail
repo="$(cd "$(dirname "$0")/../../.." && pwd)"
here="$repo/scripts/ai-tool-builds/sunday-service-bulletin"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

rsync -a --exclude node_modules --exclude pastbulletins "$repo/reference/SundayServices/" "$work/"
cp "$here/idb-fallback.ts" "$here/ai-tool-entry.ts" "$here/vite.single.config.ts" "$work/"
sed -i.bak 's#src="/src/main.tsx"#src="/ai-tool-entry.ts"#' "$work/index.html"
(cd "$work" && npm install --no-audit --no-fund && npm install --no-save --no-audit --no-fund fake-indexeddb@6 \
  && npx vite build --config vite.single.config.ts)
node "$repo/scripts/build-ai-tool-bundle.mjs" "$work/dist" "$repo/ai-tools/sunday-service-bulletin"
