# syntax=docker/dockerfile:1

# On-demand job container: run one extraction and exit (`docker compose run
# --rm rpa-worker --bank BNU --from ... --to ...`), not a long-running service.
#
# layer1-rpa never launches its own browser — session-attach.ts connects over
# CDP to a browser that's already running and already authenticated (see
# CDP_URL). So no Playwright browser binaries are needed in this image, only
# the client library; PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD keeps the image small
# and the build fast.

FROM node:20-bookworm-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY layer1-rpa/package.json layer1-rpa/package.json
COPY layer2-ai/package.json layer2-ai/package.json
COPY layer3-client/package.json layer3-client/package.json
COPY layer4-ai-assistant/package.json layer4-ai-assistant/package.json
COPY layer5-warehouse/package.json layer5-warehouse/package.json
RUN npm ci

COPY shared shared
COPY layer1-rpa layer1-rpa
COPY tsconfig*.json ./

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app /app

ENTRYPOINT ["npx", "tsx", "layer1-rpa/src/index.ts"]
