from __future__ import annotations
import pathlib
import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

_MODEL_PATH = str(pathlib.Path(__file__).parent.parent / "models" / "blaze_face_short_range.tflite")


class FaceDetector:
    def __init__(self) -> None:
        base_options = mp_python.BaseOptions(model_asset_path=_MODEL_PATH)
        options = mp_vision.FaceDetectorOptions(
            base_options=base_options,
            min_detection_confidence=0.4,
        )
        self._detector = mp_vision.FaceDetector.create_from_options(options)

    def detect(self, frame) -> list[dict]:
        """
        Returns normalized bounding boxes for detected faces.
        x,y = top-left corner, w,h = size, all in 0-1 range.
        """
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self._detector.detect(mp_image)

        if not result.detections:
            return []

        out: list[dict] = []
        for det in result.detections[:2]:
            bb = det.bounding_box
            out.append({
                "x": float(bb.origin_x) / w,
                "y": float(bb.origin_y) / h,
                "w": float(bb.width)    / w,
                "h": float(bb.height)   / h,
            })
        return out
