from __future__ import annotations

import numpy as np
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import numpy.typing as npt

from ultralytics import YOLO


class PersonDetector:
    def __init__(self) -> None:
        self.model = YOLO("yolov8n.pt")
        # Warm up so first real frame isn't slow
        self.model.predict(np.zeros((512, 512, 3), dtype=np.uint8), verbose=False)

    def detect(self, frame: "npt.NDArray") -> list[dict]:
        """
        Returns normalized bounding boxes for detected people.
        frame: BGR image, expected 512x512.
        Coordinates: x,y = top-left corner, w,h = size, all in 0-1 range.
        """
        h, w = frame.shape[:2]
        results = self.model.predict(frame, verbose=False, classes=[0], conf=0.4)

        detections: list[dict] = []
        for result in results:
            for i, box in enumerate(result.boxes):
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                detections.append(
                    {
                        "id": i + 1,
                        "label": "person",
                        "x": x1 / w,
                        "y": y1 / h,
                        "w": (x2 - x1) / w,
                        "h": (y2 - y1) / h,
                        "confidence": round(float(box.conf[0]), 2),
                    }
                )

        detections.sort(key=lambda d: d["confidence"], reverse=True)
        return detections[:3]
