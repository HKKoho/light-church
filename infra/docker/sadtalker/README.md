# SadTalker Sidecar

HTTP microservice that wraps [SadTalker](https://github.com/OpenTalker/SadTalker)
for the photo-realistic talking-face pipeline. Called by `SadTalkerService` in
`packages/api/src/talkingface/sadtalker.service.ts`.

## API

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/health` | — | `{ "status": "ok", "device": "cpu\|cuda" }` |
| `POST` | `/generate` | multipart: `image` (JPEG/PNG/WebP) + `audio` (WAV) | `video/mp4` |

## Quick start (CPU — no GPU required)

```bash
# Build (downloads ~4 GB of model weights)
docker build -t sadtalker-service:latest \
  -f infra/docker/sadtalker/Dockerfile .

# Run
docker run -p 7860:7860 \
  -v sadtalker-models:/app/checkpoints \
  sadtalker-service:latest
```

Add to your `.env`:
```
SADTALKER_URL=http://localhost:7860
```

## GPU build (CUDA 11.8)

```bash
docker build -t sadtalker-service:gpu \
  --build-arg BASE=nvidia/cuda:11.8.0-cudnn8-devel-ubuntu22.04 \
  --build-arg TORCH_INSTALL="torch==2.0.1+cu118 torchvision==0.15.2+cu118 --index-url https://download.pytorch.org/whl/cu118" \
  -f infra/docker/sadtalker/Dockerfile .

docker run --gpus all -p 7860:7860 \
  -v sadtalker-models:/app/checkpoints \
  -e SADTALKER_DEVICE=cuda \
  sadtalker-service:gpu
```

## docker-compose snippet

Add to your `docker-compose.yml` alongside the API:

```yaml
services:
  sadtalker:
    image: sadtalker-service:latest
    ports:
      - "127.0.0.1:7860:7860"
    volumes:
      - sadtalker-models:/app/checkpoints
    environment:
      SADTALKER_DEVICE: cpu   # or cuda
    restart: unless-stopped
    # GPU (uncomment if using GPU image):
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]

volumes:
  sadtalker-models:
```

## Skipping model download (CI / local dev without weights)

```bash
docker build -t sadtalker-service:no-models \
  --build-arg SKIP_MODELS=1 \
  -f infra/docker/sadtalker/Dockerfile .
```

The container will start but `/generate` calls will fail until you mount a
pre-populated `checkpoints/` volume.

## Hardware requirements

| Mode | RAM | VRAM | Speed (per sentence) |
|---|---|---|---|
| CPU | 8 GB | — | ~30–60 s |
| GPU (T4) | 8 GB | 4 GB | ~2–5 s |
| GPU (A10) | 8 GB | 4 GB | ~1–2 s |

For real-time conversation, a GPU is strongly recommended. On CPU the latency
is noticeable but the pipeline never blocks — SadTalkerService falls back to
the 3D avatar automatically if the request times out.

## Licence note

SadTalker code is MIT. The model weights are released for **research use only**
— see [SadTalker's licence](https://github.com/OpenTalker/SadTalker#license)
before any commercial deployment.
