from __future__ import annotations

import math

import cv2
import numpy as np


class HorizonDetector:
    def detect(self, frame) -> float:
        """
        Estimate camera tilt in degrees via Canny + Hough line transform.
        Negative = tilted left, positive = tilted right. 0 = level.
        Clamped to ±15°.
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)

        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi / 180,
            threshold=80,
            minLineLength=50,
            maxLineGap=10,
        )

        if lines is None:
            return 0.0

        angles: list[float] = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if x2 == x1:
                continue
            angle = math.degrees(math.atan2(y2 - y1, x2 - x1))
            # Keep only near-horizontal lines (within ±30°)
            if abs(angle) < 30:
                angles.append(angle)

        if not angles:
            return 0.0

        median = float(np.median(angles))
        return max(-15.0, min(15.0, round(median, 1)))
