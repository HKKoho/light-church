# Cartoonize sidecar — selfie → cartoon/anime portrait conversion
#
# Build (CPU):
#   docker build -t cartoonize-service:latest \
#     -f infra/docker/cartoonize/Dockerfile .
#
# Build (GPU / CUDA 11.8):
#   docker build -t cartoonize-service:latest \
#     --build-arg BASE=nvidia/cuda:11.8.0-cudnn8-devel-ubuntu22.04 \
#     --build-arg TORCH_INSTALL="torch==2.0.1+cu118 torchvision==0.15.2+cu118 --index-url https://download.pytorch.org/whl/cu118" \
#     -f infra/docker/cartoonize/Dockerfile .
#
# Run:
#   docker run -p 7861:7861 \
#     -e CARTOONIZE_DEVICE=cpu \
#     cartoonize-service:latest
#
# Set CARTOONIZE_URL=http://localhost:7861 in the API .env.

ARG BASE=python:3.10-slim
FROM ${BASE}

# ── system deps ──────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python deps ───────────────────────────────────────────────────────────────
# Install PyTorch first (CPU default; override with TORCH_INSTALL build arg).
ARG TORCH_INSTALL="torch==2.0.1 torchvision==0.15.2 --index-url https://download.pytorch.org/whl/cpu"
RUN pip install --no-cache-dir ${TORCH_INSTALL}
RUN pip install --no-cache-dir fastapi "uvicorn[standard]" python-multipart pillow

COPY infra/docker/cartoonize/server.py /app/server.py

# ── model weights ─────────────────────────────────────────────────────────────
# torch.hub clones bryandlee/animegan2-pytorch and downloads every style's
# checkpoint (small — tens of MB total, unlike SadTalker's ~4 GB) into
# /root/.cache/torch/hub, baked into this layer so /generate never needs
# network access at runtime.
#
# To skip the download (CI / test builds):
#   --build-arg SKIP_MODELS=1
ARG SKIP_MODELS=0
RUN if [ "${SKIP_MODELS}" = "0" ]; then \
      python -c "from server import warm_cache; warm_cache()"; \
    fi

# ── runtime ───────────────────────────────────────────────────────────────────
# CARTOONIZE_DEVICE: "cpu" (default) or "cuda"
ENV CARTOONIZE_DEVICE=cpu
ENV PYTHONUNBUFFERED=1

EXPOSE 7861

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7861"]
