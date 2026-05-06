from __future__ import annotations

import cv2


class FaceDetector:
    def __init__(self) -> None:
        # Haar cascade is bundled with opencv-python — no extra downloads
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.cascade = cv2.CascadeClassifier(cascade_path)

    def detect(self, frame) -> list[dict]:
        """
        Returns normalized bounding boxes for detected faces.
        x,y = top-left corner, w,h = size, all in 0-1 range.
        """
        h, w = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        faces = self.cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=6,
            minSize=(30, 30),
        )

        result: list[dict] = []
        if len(faces) > 0:
            # Sort largest area first — biggest face is the primary subject
            for fx, fy, fw, fh in sorted(faces, key=lambda f: f[2] * f[3], reverse=True):
                result.append(
                    {
                        "x": float(fx) / w,
                        "y": float(fy) / h,
                        "w": float(fw) / w,
                        "h": float(fh) / h,
                    }
                )

        return result[:1]
