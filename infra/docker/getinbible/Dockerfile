# Get in Bible — self-hosted (replaces https://getinbible.vercel.app)
#
# Builds the Vite SPA in reference/GetinBible and serves it, together with the
# app's api/*.ts AI proxies, from one small Node server (server.ts).
#
# Build: docker compose -f docker-compose.prod.yml build getinbible
#
# The Supabase URL + anon key are compiled into the browser bundle (they are
# public by design — Row Level Security protects the data). AI keys are NOT:
# they are runtime env vars read only by the server-side proxies.

FROM node:22-slim AS builder

WORKDIR /app/reference/GetinBible

COPY reference/GetinBible/package.json reference/GetinBible/package-lock.json ./
RUN npm ci

COPY reference/GetinBible/ ./

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_OPENAI_ENABLED
ARG VITE_GEMINI_ENABLED
ARG VITE_GOOGLE_CLOUD_TTS_ENABLED
ARG VITE_OLLAMA_BASE_URL
ARG VITE_OLLAMA_MODEL
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY} \
    VITE_OPENAI_ENABLED=${VITE_OPENAI_ENABLED} \
    VITE_GEMINI_ENABLED=${VITE_GEMINI_ENABLED} \
    VITE_GOOGLE_CLOUD_TTS_ENABLED=${VITE_GOOGLE_CLOUD_TTS_ENABLED} \
    VITE_OLLAMA_BASE_URL=${VITE_OLLAMA_BASE_URL} \
    VITE_OLLAMA_MODEL=${VITE_OLLAMA_MODEL}

RUN npm run build

# Bundle the runtime server + the api/*.ts handlers into one dependency-free file
# (esbuild ships with vite).
COPY infra/docker/getinbible/server.ts /app/infra/docker/getinbible/server.ts
RUN npx esbuild /app/infra/docker/getinbible/server.ts \
      --bundle --platform=node --target=node22 --format=esm \
      --outfile=/app/out/server.mjs

FROM node:22-slim AS runner

WORKDIR /app
ENV NODE_ENV=production PORT=3005 DIST_DIR=/app/dist

COPY --from=builder /app/out/server.mjs ./server.mjs
COPY --from=builder /app/reference/GetinBible/dist ./dist

USER node
EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3005/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.mjs"]
