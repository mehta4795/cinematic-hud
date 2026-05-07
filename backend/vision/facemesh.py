from __future__ import annotations
import math
import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from .model_utils import ensure_model

_NO_EXPRESSION = {"smile": 0.0, "mouth": 0.0, "eyes": 0.0, "brow": 0.0, "pout": 0.0}
_NO_FACE = {"roll": 0.0, "yaw": 0.0, "expression": _NO_EXPRESSION}


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
            output_face_blendshapes=True,
        )
        self._detector = mp_vision.FaceLandmarker.create_from_options(options)

    def detect(self, frame, has_face: bool) -> dict:
        """
        Returns head orientation angles (degrees) plus four atomic expression
        meters derived from blendshape coefficients.

            {
              "roll": float,        # head tilt left/right (0 = level)
              "yaw":  float,        # head turn left/right (0 = facing camera)
              "expression": {
                "smile": 0..1,      # avg of mouthSmileLeft/Right
                "mouth": 0..1,      # jawOpen
                "eyes":  0..1,      # 1 - avg of eyeBlinkLeft/Right (1 = wide open)
                "brow":  0..1,      # avg of browInnerUp + browOuterUpLeft/Right
              }
            }

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

        # ── Blendshape-derived expression meters ──────────────────────────
        expression = _NO_EXPRESSION
        if result.face_blendshapes:
            shapes = {c.category_name: c.score for c in result.face_blendshapes[0]}

            def avg(*keys: str) -> float:
                vals = [shapes.get(k, 0.0) for k in keys]
                return sum(vals) / len(vals) if vals else 0.0

            def clamp01(x: float) -> float:
                return max(0.0, min(1.0, x))

            smile = clamp01(avg("mouthSmileLeft", "mouthSmileRight"))
            mouth = clamp01(shapes.get("jawOpen", 0.0))
            eyes  = clamp01(1.0 - avg("eyeBlinkLeft", "eyeBlinkRight"))
            brow  = clamp01(avg("browInnerUp", "browOuterUpLeft", "browOuterUpRight"))
            # Pout: lips pursed forward — the mouthPucker blendshape, with
            # a small assist from mouthFunnel for "kiss face" expressions.
            pout  = clamp01(0.7 * shapes.get("mouthPucker", 0.0)
                            + 0.3 * shapes.get("mouthFunnel", 0.0))

            expression = {
                "smile": round(smile, 3),
                "mouth": round(mouth, 3),
                "eyes":  round(eyes,  3),
                "brow":  round(brow,  3),
                "pout":  round(pout,  3),
            }

        return {
            "roll":       round(roll, 1),
            "yaw":        round(yaw, 1),
            "expression": expression,
        }
