# syntax=docker/dockerfile:1

# ── Stage 1: build ───────────────────────────────────────────────────────────
# Compiles the better-sqlite3 native addon (needs a toolchain). This stage's
# tools never ship in the final image.
FROM node:20-bookworm-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy just the manifests first so `npm ci` is cached across source changes.
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY layer1-rpa/package.json layer1-rpa/package.json
COPY layer2-ai/package.json layer2-ai/package.json
COPY layer3-client/package.json layer3-client/package.json
COPY layer4-ai-assistant/package.json layer4-ai-assistant/package.json
COPY layer5-warehouse/package.json layer5-warehouse/package.json
RUN npm ci

COPY shared shared
COPY layer4-ai-assistant layer4-ai-assistant
COPY tsconfig*.json ./

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
# No compiler toolchain here — just the compiled deps and this layer's source.
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app /app

EXPOSE 4001
CMD ["npx", "tsx", "layer4-ai-assistant/src/server.ts"]
