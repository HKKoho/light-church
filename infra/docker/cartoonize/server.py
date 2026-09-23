"""
Cartoonize HTTP sidecar — minimal FastAPI wrapper around AnimeGANv2
(bryandlee/animegan2-pytorch, a PyTorch port of TachibanaYoshino/AnimeGANv2).

Contract (matches CartoonizeService in
packages/api/src/talkingface/cartoonize.service.ts):
  POST /generate
    multipart/form-data:
      image — source photo (JPEG / PNG / WebP)
      style — one of: face_paint_v2, face_paint_v1, celeba_distill, paprika
    Response: 200 image/jpeg  — cartoonized portrait
              4xx/5xx application/json { "detail": "..." } on failure

Health check:
  GET /health → 200 { "status": "ok", "device": "cpu|cuda" }

Model weights are baked into the image at build time (see Dockerfile's
`warm_cache` step) via torch.hub, so /generate never touches the network.
"""

import io
import os

import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image

app = FastAPI(title="Cartoonize Sidecar", version="1.0.0")

DEVICE = os.environ.get("CARTOONIZE_DEVICE", "cpu")
HUB_REPO = "bryandlee/animegan2-pytorch:main"

# The styles the underlying repo ships pretrained checkpoints for. These are
# AnimeGANv2 model variants, not the Hayao/Shinkai/Paprika named styles from
# the original TensorFlow AnimeGANv2 repo (see docs/self2talkface.md for the
# implementation note on this deviation from the initial design).
STYLES = ("face_paint_v2", "face_paint_v1", "celeba_distill", "paprika")
DEFAULT_STYLE = "face_paint_v2"

_model_cache: dict[str, torch.nn.Module] = {}
_face2paint = None


def _get_model(style: str) -> torch.nn.Module:
    if style not in _model_cache:
        _model_cache[style] = torch.hub.load(
            HUB_REPO, "generator", pretrained=style, device=DEVICE
        )
    return _model_cache[style]


def _get_face2paint():
    global _face2paint
    if _face2paint is None:
        _face2paint = torch.hub.load(HUB_REPO, "face2paint", size=512, device=DEVICE)
    return _face2paint


def warm_cache() -> None:
    """Downloads the repo + every style's weights. Called at Docker build time."""
    for style in STYLES:
        _get_model(style)
    _get_face2paint()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "device": DEVICE}


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------


@app.post("/generate")
async def generate(
    image: UploadFile = File(..., description="Source photo (JPEG/PNG/WebP)"),
    style: str = Form(DEFAULT_STYLE, description="One of: " + ", ".join(STYLES)),
) -> Response:
    if style not in STYLES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported style '{style}'. Use one of: {', '.join(STYLES)}",
        )

    try:
        raw = await image.read()
        source = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}") from exc

    try:
        model = _get_model(style)
        face2paint = _get_face2paint()
        with torch.no_grad():
            result = face2paint(model, source)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Cartoonize inference failed: {exc}") from exc

    out = io.BytesIO()
    result.save(out, format="JPEG", quality=92)
    return Response(content=out.getvalue(), media_type="image/jpeg")
