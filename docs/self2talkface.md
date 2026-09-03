# Self-Photo → Cartoon → Talking Face: Pipeline Plan

Extends the existing photo-realistic talking-face pipeline (`packages/api/src/talkingface/`,
backed by the SadTalker sidecar in `infra/docker/sadtalker/`) with an optional
cartoonization stage, so a user can upload a selfie, convert it to a cartoon/anime
portrait, and drive it with the same lip-sync pipeline already in production.

## Current pipeline (baseline)

```
Admin uploads photo  ─▶  TalkingFaceAvatarController (REST)
                          stores original JPEG/PNG/WebP on disk
                          data/talkingface-avatars/<photoId>.<ext>

WS /ws/talkingface  ─▶  TalkingFaceGateway.handleSpeak()
                          reads photo buffer once per session (by photoId)
                          per sentence: PiperTtsService → WAV
                                        SadTalkerService.generateVideo(photo, wav)
                                        → base64 MP4 chunk sent to client

Frontend            ─▶  AvatarStageVideo.tsx plays the MP4 chunks sequentially
                         (AvatarStage3D.tsx is the non-photo 3D-avatar fallback)
```

Key facts that shape this plan:
- `SadTalkerService.generateVideo` takes any portrait image buffer — it has no
  dependency on the image being photorealistic. A cartoonized image is a valid
  input with zero changes to the gateway's per-sentence loop.
- Photo identity is just `photoId` (UUID) → file on disk + a `.meta.json`
  sidecar. Adding a cartoon variant fits naturally as **another avatar entry**
  with metadata linking it back to its source photo — no changes to
  `talkingface.protocol.ts` or `TalkingFaceGateway` are needed.
- Photo-realistic mode is already admin-gated (`ADMIN_ROLES`) in the gateway;
  cartoon mode inherits that gate for free.

## New stage: cartoonize

Insert a cartoonization step between "upload" and "speak", implemented the
same way SadTalker was: a small Python HTTP sidecar + a thin NestJS client.

### Model choice

| Option | Notes |
|---|---|
| **AnimeGANv2** ([TachibanaYoshino/AnimeGANv2](https://github.com/TachibanaYoshino/AnimeGANv2)) | Recommended default. Single forward pass, CPU-feasible (~1-3s/image), several pretrained style checkpoints (Hayao, Shinkai, Paprika). |
| White-box-Cartoonization ([SystemErrorWang/White-box-Cartoonization](https://github.com/SystemErrorWang/White-box-Cartoonization)) | Alternative style, similarly lightweight; keep as a second selectable style rather than a replacement. |

Both ship pretrained weights, run on CPU or GPU, and take a single image in /
single image out — no video, no audio, no training required.

### Sidecar service — `infra/docker/cartoonize/`

Mirrors `infra/docker/sadtalker/` exactly:

```
infra/docker/cartoonize/
  Dockerfile        # torch + onnxruntime (CPU) or CUDA base, per SadTalker pattern
  server.py         # Flask/FastAPI, one POST /generate endpoint
  README.md         # build/run instructions, GPU variant, compose snippet
```

API contract:

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/health` | — | `{ "status": "ok", "device": "cpu\|cuda" }` |
| `POST` | `/generate` | multipart: `image` (JPEG/PNG/WebP) + `style` (form field: `hayao`\|`shinkai`\|`paprika`\|`whitebox`) | `image/jpeg` cartoonized output |

### API package changes (`packages/api/src/talkingface/`)

1. **`cartoonize.service.ts`** (new) — HTTP client to the sidecar, modeled
   directly on `sadtalker.service.ts`: temp files, `AbortController` timeout,
   `ExternalServiceError('cartoonize', …)` on failure, `CARTOONIZE_URL` env var
   resolved via `ConfigService.getOrThrow`.

2. **`talkingface-avatar.controller.ts`** — add one endpoint:
   - `POST /api/v1/talkingface/avatar/:photoId/cartoonize` (admin-only, same
     `@Roles` guard already on the controller)
     - body: `{ style: 'hayao' | 'shinkai' | 'paprika' | 'whitebox' }`
     - reads the source photo via the existing `resolvePhotoPath`/`readPhotoBuffer`
     - calls `CartoonizeService.generate(buffer, style)`
     - stores the result as a **new** `photoId` (own UUID) with
       `.meta.json` extended with `{ sourcePhotoId, style }`
     - returns `AvatarUploadResult` (same shape the upload endpoint returns),
       so the frontend can treat it identically to an uploaded photo
   - `AvatarListItem` gains optional `sourcePhotoId?: string` and `style?: string`
     so the list view can group a cartoon under its source photo.

3. **`talkingface.module.ts`** — register `CartoonizeService` as a provider.

4. No changes to `talkingface.gateway.ts` or `talkingface.protocol.ts` —
   a cartoon avatar is passed as `avatarPhotoId` exactly like today.

### Frontend changes (`packages/web/src/app/(dashboard)/talkingface/`)

- Avatar management UI (wherever photos are currently listed/picked — likely
  inside `page.tsx` or a settings tab): add a **"Cartoonize"** action per
  uploaded photo with a style dropdown (Hayao / Shinkai / Paprika / White-box).
  On success, the new cartoon variant appears in the avatar picker list,
  visually grouped under its source photo (using `sourcePhotoId`).
- No changes needed to `AvatarStageVideo.tsx`, `AvatarStage3D.tsx`, or
  `useTalkingFaceSocket.ts` — they already just play whatever `video` comes
  back over the WS for the selected `avatarPhotoId`.

### Config / deployment

- New env var: `CARTOONIZE_URL` (e.g. `http://localhost:7861`), documented in
  `.env.example` next to `SADTALKER_URL`.
- `docker-compose.yml`: add a `cartoonize` service alongside `sadtalker`,
  same pattern (named volume for model weights, optional GPU profile).
- `infra/docker/cartoonize/README.md`: CPU quick-start + CUDA build args,
  copied from the SadTalker README structure.

### Tests

- `cartoonize.service.test.ts` — mirrors `sadtalker.service.test.ts` (mock
  `fetch`, assert multipart body, timeout/abort behavior, error wrapping).
- Extend `talkingface-avatar.controller.test.ts` with cases for the new
  `POST /:photoId/cartoonize` route: happy path, unknown `photoId` → 404,
  invalid `style` → 400, sidecar failure → surfaced error.
- No gateway test changes required (cartoon photoId flows through the
  existing `avatarPhotoId` path untouched).

### Rollout order

1. Sidecar (`infra/docker/cartoonize/`) — buildable and health-checked standalone.
2. `CartoonizeService` + module wiring + unit tests.
3. Avatar controller endpoint + tests.
4. Frontend "Cartoonize" action + style picker.
5. Docs: `.env.example`, `docker-compose.yml`, README.

Each step is independently testable and the feature is additive — the
existing photo-realistic (non-cartoon) flow is unaffected at every stage.
