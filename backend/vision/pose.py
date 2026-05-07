from __future__ import annotations
import math
import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from .model_utils import ensure_model

# Indices of the 12 structural landmarks we send over the wire
_STRUCTURAL = {0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28}


class PoseDetector:
    def __init__(self) -> None:
        try:
            model_path = str(ensure_model("pose_landmarker_lite.task"))
        except Exception as exc:
            print(f"[pose] could not load model — pose disabled ({exc})")
            self._detector = None
            return
        base_options = mp_python.BaseOptions(model_asset_path=model_path)
        options = mp_vision.PoseLandmarkerOptions(
            base_options=base_options,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self._detector = mp_vision.PoseLandmarker.create_from_options(options)

    def detect(self, frame) -> list[dict]:
        """
        Returns normalized landmarks for 12 structural keypoints.
        [{"idx": int, "x": float, "y": float, "vis": float}, ...]
        x, y in 0-1 range relative to frame dimensions.
        """
        if self._detector is None:
            return []
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self._detector.detect(mp_image)

        if not result.pose_landmarks:
            return []

        out: list[dict] = []
        for idx, lm in enumerate(result.pose_landmarks[0]):
            if idx in _STRUCTURAL:
                out.append({
                    "idx": idx,
                    "x":   round(float(lm.x), 4),
                    "y":   round(float(lm.y), 4),
                    "vis": round(float(lm.visibility), 3),
                })

        return out
