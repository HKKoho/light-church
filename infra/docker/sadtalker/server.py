"""
SadTalker HTTP sidecar — minimal FastAPI wrapper.

Contract (matches SadTalkerService in packages/api/src/talkingface/sadtalker.service.ts):
  POST /generate
    multipart/form-data:
      image  — portrait photo  (JPEG / PNG / WebP)
      audio  — speech audio    (WAV, produced by Piper TTS)
    Response: 200 video/mp4   — lip-synced video clip
              5xx application/json { "detail": "..." } on failure

Health check:
  GET /health → 200 { "status": "ok" }
"""

import os
import shutil
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="SadTalker Sidecar", version="1.0.0")

DEVICE = os.environ.get("SADTALKER_DEVICE", "cpu")
CHECKPOINTS_DIR = Path(__file__).parent / "checkpoints"
GFPGAN_DIR = Path(__file__).parent / "gfpgan" / "weights"

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
    image: UploadFile = File(..., description="Portrait photo (JPEG/PNG/WebP)"),
    audio: UploadFile = File(..., description="Speech audio (WAV)"),
) -> FileResponse:
    """
    Run SadTalker inference for a single audio chunk.

    Writes the uploaded files to a temp directory, calls `inference.py` in a
    subprocess (so each request gets a clean Python interpreter state), reads
    the resulting MP4, and streams it back.
    """
    work_dir = Path(tempfile.mkdtemp(prefix="sadtalker-"))
    try:
        # Save uploads
        image_path = work_dir / f"source.{_ext(image.filename or 'image.jpg')}"
        audio_path = work_dir / "driven.wav"
        result_dir = work_dir / "result"
        result_dir.mkdir()

        with open(image_path, "wb") as f:
            f.write(await image.read())
        with open(audio_path, "wb") as f:
            f.write(await audio.read())

        # Run inference
        cmd = [
            sys.executable, "inference.py",
            "--driven_audio", str(audio_path),
            "--source_image", str(image_path),
            "--result_dir", str(result_dir),
            "--checkpoint_dir", str(CHECKPOINTS_DIR),
            "--gfpgan_dir", str(GFPGAN_DIR),
            "--still",           # minimal head movement — better for single-sentence clips
            "--preprocess", "crop",
            "--device", DEVICE,
        ]

        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,          # 2 min hard cap per sentence
            cwd=str(Path(__file__).parent),
        )

        if proc.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"SadTalker inference failed:\n{proc.stderr[-2000:]}",
            )

        # Find the generated MP4 (SadTalker writes <uuid>.mp4 into result_dir)
        mp4_files = list(result_dir.rglob("*.mp4"))
        if not mp4_files:
            raise HTTPException(status_code=500, detail="SadTalker produced no output file")

        mp4_path = mp4_files[0]

        # Copy to a stable temp path so FastAPI can serve it after work_dir cleanup
        out_path = Path(tempfile.gettempdir()) / f"sadtalker-out-{uuid.uuid4()}.mp4"
        shutil.copy2(mp4_path, out_path)

        return FileResponse(
            path=str(out_path),
            media_type="video/mp4",
            filename="output.mp4",
            background=_cleanup_task(work_dir, out_path),
        )

    except HTTPException:
        shutil.rmtree(work_dir, ignore_errors=True)
        raise
    except subprocess.TimeoutExpired:
        shutil.rmtree(work_dir, ignore_errors=True)
        raise HTTPException(status_code=504, detail="SadTalker timed out after 120 s")
    except Exception as exc:  # noqa: BLE001
        shutil.rmtree(work_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ext(filename: str) -> str:
    """Return the lowercase extension without the dot, defaulting to 'jpg'."""
    parts = filename.rsplit(".", 1)
    return parts[1].lower() if len(parts) == 2 else "jpg"


class _cleanup_task:
    """BackgroundTask that removes both the work directory and the output file."""

    def __init__(self, work_dir: Path, out_path: Path) -> None:
        self._work_dir = work_dir
        self._out_path = out_path

    def __call__(self) -> None:
        shutil.rmtree(self._work_dir, ignore_errors=True)
        self._out_path.unlink(missing_ok=True)
