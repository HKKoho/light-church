# SadTalker sidecar — photo-realistic talking-face video generation
#
# Build (CPU):
#   docker build -t sadtalker-service:latest \
#     -f infra/docker/sadtalker/Dockerfile .
#
# Build (GPU / CUDA 11.8):
#   docker build -t sadtalker-service:latest \
#     --build-arg BASE=nvidia/cuda:11.8.0-cudnn8-devel-ubuntu22.04 \
#     --build-arg TORCH_INSTALL="torch==2.0.1+cu118 torchvision==0.15.2+cu118 --index-url https://download.pytorch.org/whl/cu118" \
#     -f infra/docker/sadtalker/Dockerfile .
#
# Run:
#   docker run -p 7860:7860 \
#     -v sadtalker-models:/app/checkpoints \
#     -e SADTALKER_DEVICE=cpu \
#     sadtalker-service:latest
#
# Set SADTALKER_URL=http://localhost:7860 in the API .env.

ARG BASE=python:3.10-slim
FROM ${BASE}

# ── system deps ────────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        wget \
        ffmpeg \
        libsm6 \
        libxext6 \
        libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── clone SadTalker ─────────────────────────────────────────────────────────
RUN git clone --depth 1 https://github.com/OpenTalker/SadTalker.git .

# ── Python deps ─────────────────────────────────────────────────────────────
# Install PyTorch first (CPU default; override with TORCH_INSTALL build arg).
ARG TORCH_INSTALL="torch==2.0.1 torchvision==0.15.2 --index-url https://download.pytorch.org/whl/cpu"
RUN pip install --no-cache-dir ${TORCH_INSTALL}

# Install SadTalker requirements, then our HTTP wrapper dependencies.
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir fastapi uvicorn[standard] python-multipart

# ── model weights ─────────────────────────────────────────────────────────────
# Models are large (~4 GB total) — download them at build time so every
# container start is fast. If you prefer to mount a pre-populated volume,
# comment out the RUN below and bind-mount your checkpoints dir at runtime:
#   -v /path/to/checkpoints:/app/checkpoints
#
# To skip the download (CI / test builds):
#   --build-arg SKIP_MODELS=1
ARG SKIP_MODELS=0
RUN if [ "${SKIP_MODELS}" = "0" ]; then \
      bash scripts/download_models.sh; \
    fi

# ── HTTP wrapper ──────────────────────────────────────────────────────────────
COPY infra/docker/sadtalker/server.py /app/server.py

# ── runtime ───────────────────────────────────────────────────────────────────
# SADTALKER_DEVICE: "cpu" (default) or "cuda"
ENV SADTALKER_DEVICE=cpu
ENV PYTHONUNBUFFERED=1

EXPOSE 7860

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]
