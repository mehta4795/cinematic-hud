from __future__ import annotations
import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from .model_utils import ensure_model

_MIN_FACE_AREA = 0.005   # reject any detection covering < 0.5% of frame
_STREAK_MAX    = 3
_STREAK_SHOW   = 2       # require 2 consecutive valid frames before reporting
_STREAK_DROP   = 2       # decrement per missing frame (asymmetric — fast drop-out)


class FaceDetector:
    def __init__(self) -> None:
        model_path = str(ensure_model("blaze_face_short_range.tflite"))
        base_options = mp_python.BaseOptions(model_asset_path=model_path)
        options = mp_vision.FaceDetectorOptions(
            base_options=base_options,
            min_detection_confidence=0.7,
        )
        self._detector = mp_vision.FaceDetector.create_from_options(options)
        self._streak = 0

    def detect(self, frame) -> list[dict]:
        """
        Returns normalized bounding boxes for detected faces.
        x,y = top-left corner, w,h = size, all in 0-1 range.

        Filters: score >= 0.7, area >= 0.5% of frame, plus a multi-frame streak
        gate (must be present for 2 consecutive frames) to suppress single-frame
        false positives in empty rooms.
        """
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self._detector.detect(mp_image)

        raw: list[dict] = []
        for det in (result.detections or [])[:2]:
            score = det.categories[0].score if det.categories else 0.0
            if score < 0.7:
                continue
            bb = det.bounding_box
            nw = float(bb.width)  / w
            nh = float(bb.height) / h
            if nw * nh < _MIN_FACE_AREA:
                continue
            raw.append({
                "x": float(bb.origin_x) / w,
                "y": float(bb.origin_y) / h,
                "w": nw,
                "h": nh,
            })

        if raw:
            self._streak = min(self._streak + 1, _STREAK_MAX)
        else:
            self._streak = max(self._streak - _STREAK_DROP, 0)

        return raw if self._streak >= _STREAK_SHOW else []
