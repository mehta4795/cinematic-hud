from __future__ import annotations
import pathlib
import urllib.request

_MODELS_DIR = pathlib.Path(__file__).parent.parent / "models"

_MODEL_URLS: dict[str, str] = {
    "blaze_face_short_range.tflite": (
        "https://storage.googleapis.com/mediapipe-models/"
        "face_detector/blaze_face_short_range/float16/latest/"
        "blaze_face_short_range.tflite"
    ),
    "face_landmarker.task": (
        "https://storage.googleapis.com/mediapipe-models/"
        "face_landmarker/face_landmarker/float16/latest/"
        "face_landmarker.task"
    ),
    "pose_landmarker_lite.task": (
        "https://storage.googleapis.com/mediapipe-models/"
        "pose_landmarker/pose_landmarker_lite/float16/latest/"
        "pose_landmarker_lite.task"
    ),
}


def ensure_model(filename: str) -> pathlib.Path:
    """Return the local path to a model file, downloading it if missing."""
    _MODELS_DIR.mkdir(parents=True, exist_ok=True)
    path = _MODELS_DIR / filename

    if path.exists():
        return path

    url = _MODEL_URLS.get(filename)
    if not url:
        raise ValueError(f"No download URL registered for model: {filename}")

    print(f"[models] downloading {filename} …")
    tmp = path.with_suffix(".tmp")
    try:
        urllib.request.urlretrieve(url, tmp)
        tmp.rename(path)
        print(f"[models] ✓ {filename} saved to {path}")
    except Exception as exc:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"Failed to download {filename}: {exc}") from exc

    return path
