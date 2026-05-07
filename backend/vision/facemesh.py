from __future__ import annotations
import math
import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from .model_utils import ensure_model

_NO_FACE = {"roll": 0.0, "yaw": 0.0}


class FaceMeshDetector:
    def __init__(self) -> None:
        try:
            model_path = str(ensure_model("face_landmarker.task"))
        except Exception as exc:
            print(f"[facemesh] could not load model — head orientation disabled ({exc})")
            self._detector = None
            return
        base_options = mp_python.BaseOptions(model_asset_path=model_path)
        options = mp_vision.FaceLandmarkerOptions(
            base_options=base_options,
            num_faces=1,
            min_face_detection_confidence=0.4,
            min_face_presence_confidence=0.4,
        )
        self._detector = mp_vision.FaceLandmarker.create_from_options(options)

    def detect(self, frame, has_face: bool) -> dict:
        """
        Returns head orientation angles in degrees.
        {"roll": float, "yaw": float}
        roll: head tilt left/right (0 = level, + = tilted right)
        yaw:  head turn left/right (0 = facing camera, + = turned right)
        Skips inference when has_face=False.
        """
        if self._detector is None or not has_face:
            return _NO_FACE

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self._detector.detect(mp_image)

        if not result.face_landmarks:
            return _NO_FACE

        lms = result.face_landmarks[0]

        # Roll: angle of line between outer eye corners (33=right, 263=left)
        r_eye = lms[33]
        l_eye = lms[263]
        roll = math.degrees(math.atan2(l_eye.y - r_eye.y, l_eye.x - r_eye.x))

        # Yaw: nose tip (1) offset relative to face centre (midpoint of cheekbones 234, 454)
        nose   = lms[1]
        l_chk  = lms[234]
        r_chk  = lms[454]
        face_w = abs(r_chk.x - l_chk.x)
        mid_x  = (l_chk.x + r_chk.x) / 2
        yaw    = ((nose.x - mid_x) / max(face_w, 0.01)) * 90.0  # scale to ≈ degrees

        return {
            "roll": round(roll, 1),
            "yaw":  round(yaw, 1),
        }
