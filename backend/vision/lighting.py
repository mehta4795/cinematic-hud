from __future__ import annotations

import cv2
import numpy as np


class LightingAnalyzer:
    def analyze(self, frame, faces: list[dict]) -> dict:
        """
        Analyses lighting from a BGR frame and optional face bounding boxes.

        Returns:
            exposure        "underexposed" | "good" | "overexposed"
            face_brightness 0.0–1.0 (mean brightness of face region, 0.5 if no face)
            dynamic_range   "low" | "normal" | "high"
            backlit         True when background is significantly brighter than face
            harsh_shadow    True when face region has high internal contrast
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        total_pixels = h * w

        # ── Histogram ────────────────────────────────────────────────────────
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
        mean_brightness = float(np.sum(hist * np.arange(256)) / total_pixels)
        clipped_dark  = float(np.sum(hist[:10])  / total_pixels)
        clipped_light = float(np.sum(hist[245:]) / total_pixels)

        if mean_brightness < 80 or clipped_dark > 0.30:
            exposure = "underexposed"
        elif mean_brightness > 175 or clipped_light > 0.15:
            exposure = "overexposed"
        else:
            exposure = "good"

        # ── Dynamic range (5th–95th percentile spread) ───────────────────────
        cumsum = np.cumsum(hist) / total_pixels
        p5  = int(np.searchsorted(cumsum, 0.05))
        p95 = int(np.searchsorted(cumsum, 0.95))
        spread = p95 - p5

        if spread > 180:
            dynamic_range = "high"
        elif spread > 80:
            dynamic_range = "normal"
        else:
            dynamic_range = "low"

        # ── Face-region analysis ─────────────────────────────────────────────
        face_brightness = 0.5
        backlit = False
        harsh_shadow = False

        if faces:
            face = faces[0]
            fx = max(0, int(face["x"] * w))
            fy = max(0, int(face["y"] * h))
            fw = min(int(face["w"] * w), w - fx)
            fh = min(int(face["h"] * h), h - fy)
            face_roi = gray[fy:fy + fh, fx:fx + fw]

            if face_roi.size > 0:
                face_mean = float(np.mean(face_roi))
                face_brightness = round(face_mean / 255.0, 2)

                bg_mean = float(np.mean(gray))
                backlit = bg_mean > 0 and (bg_mean / max(face_mean, 1.0)) > 1.8

                harsh_shadow = float(np.std(face_roi)) > 55

        return {
            "exposure":        exposure,
            "face_brightness": face_brightness,
            "dynamic_range":   dynamic_range,
            "backlit":         backlit,
            "harsh_shadow":    harsh_shadow,
        }
