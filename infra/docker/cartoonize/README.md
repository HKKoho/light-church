# Cartoonize Sidecar

HTTP microservice that converts a selfie into a cartoon/anime portrait, using
[AnimeGANv2](https://github.com/bryandlee/animegan2-pytorch) (a PyTorch port
of TachibanaYoshino/AnimeGANv2). Called by `CartoonizeService` in
`packages/api/src/talkingface/cartoonize.service.ts`, and feeds its output
straight into the existing SadTalker lip-sync pipeline — a cartoon avatar is
just another `photoId` to `SadTalkerService.generateVideo`.

## API

| Method | Path        | Body                                                                | Response    |
| ------ | ----------- | -------------------------------------------------------------------- | ----------- |
| `GET`  | `/health`   | —                                                                     | `{ "status": "ok", "device": "cpu\|cuda" }` |
| `POST` | `/generate` | multipart: `image` (JPEG/PNG/WebP) + `style` (form field, optional) | `image/jpeg` |

`style` is one of `face_paint_v2` (default), `face_paint_v1`,
`celeba_distill`, `paprika` — the checkpoints AnimeGANv2 ships pretrained
weights for. (These are model-variant names, not the Hayao/Shinkai style
labels from the original TensorFlow AnimeGANv2 repo — see
`docs/self2talkface.md` for the implementation note.)

## Quick start (CPU — no GPU required)

```bash
# Build (downloads model weights — tens of MB, much lighter than SadTalker)
docker build -t cartoonize-service:latest \
  -f infra/docker/cartoonize/Dockerfile .

# Run
docker run -p 7861:7861 cartoonize-service:latest
```

Add to your `.env`:

```
CARTOONIZE_URL=http://localhost:7861
```

## GPU build (CUDA 11.8)

```bash
docker build -t cartoonize-service:gpu \
  --build-arg BASE=nvidia/cuda:11.8.0-cudnn8-devel-ubuntu22.04 \
  --build-arg TORCH_INSTALL="torch==2.0.1+cu118 torchvision==0.15.2+cu118 --index-url https://download.pytorch.org/whl/cu118" \
  -f infra/docker/cartoonize/Dockerfile .

docker run --gpus all -p 7861:7861 \
  -e CARTOONIZE_DEVICE=cuda \
  cartoonize-service:gpu
```

## docker-compose

Already wired into `docker-compose.prod.yml` as the `cartoonize` service,
alongside `sadtalker` (see its own README for that sidecar's status).

## Skipping model download (CI / local dev without weights)

```bash
docker build -t cartoonize-service:no-models \
  --build-arg SKIP_MODELS=1 \
  -f infra/docker/cartoonize/Dockerfile .
```

The container will start but `/generate` calls will fail until the model
cache is populated (mount a pre-warmed `/root/.cache/torch/hub` volume, or
rebuild without `SKIP_MODELS`).

## Hardware requirements

Much lighter than SadTalker — a single small conv-net forward pass per image,
no video/audio processing.

| Mode | RAM  | Speed (per image) |
| ---- | ---- | ------------------ |
| CPU  | 2 GB | ~1–3 s              |
| GPU  | 2 GB | <0.5 s              |

## Licence note

AnimeGANv2 / animegan2-pytorch code and weights are for **non-commercial,
research/educational use** — see the
[upstream licence](https://github.com/bryandlee/animegan2-pytorch#license)
before any commercial deployment.
