from __future__ import annotations


class AutoCapture:
    """
    Fires a capture event when the shot has been genuinely earned:
    - overall score > threshold
    - at least one subject visible
    - horizon within ±5°
    - all conditions stable for `stable_frames` consecutive frames (~1 second)

    Enforces a cooldown after each capture so the HUD doesn't immediately fire again.
    """

    def __init__(
        self,
        score_threshold: int = 90,
        stable_frames: int = 4,
        cooldown_frames: int = 16,  # 4 s at 4 FPS
    ) -> None:
        self._threshold = score_threshold
        self._stable_frames = stable_frames
        self._cooldown_total = cooldown_frames
        self._good_streak = 0
        self._cooldown = 0
        self._best_score = 0

    def update(
        self,
        scores: dict,
        subjects: list[dict],
        horizon_angle: float,
    ) -> dict:
        """
        Returns:
            {
                "should_capture":    bool,   # True exactly once per capture event
                "capture_ready":     bool,   # True when countdown > 50%
                "capture_countdown": float,  # 0.0 → 1.0
                "best_score":        int,
            }
        """
        overall = scores["overall"]
        self._best_score = max(self._best_score, overall)

        if self._cooldown > 0:
            self._cooldown -= 1
            self._good_streak = 0
            return self._result(False, False, 0.0)

        conditions_met = (
            len(subjects) > 0
            and abs(horizon_angle) < 5.0
            and overall >= self._threshold
        )

        if conditions_met:
            self._good_streak = min(self._good_streak + 1, self._stable_frames)
        else:
            self._good_streak = max(0, self._good_streak - 1)

        countdown = self._good_streak / self._stable_frames

        if self._good_streak >= self._stable_frames:
            self._good_streak = 0
            self._cooldown = self._cooldown_total
            return self._result(True, True, 1.0)

        return self._result(False, countdown >= 0.5, countdown)

    def _result(self, capture: bool, ready: bool, countdown: float) -> dict:
        return {
            "should_capture":    capture,
            "capture_ready":     ready,
            "capture_countdown": round(countdown, 2),
            "best_score":        self._best_score,
        }
