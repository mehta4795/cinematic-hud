from __future__ import annotations

# ── Issue → actionable coaching ────────────────────────────────────────────
_ISSUE_COACHING: dict[str, str] = {
    "no_headroom":        "Lower camera slightly",
    "tight_headroom":     "Lower camera slightly",
    "excessive_headroom": "Move camera up",
    "subject_off_center": "Shift subject toward thirds",
    "subject_off_frame":  "Re-center your subject",
    "subject_too_far":    "Move closer to subject",
    "move_closer":        "Step slightly closer",
    "too_close":          "Step back slightly",
    "face_too_low":       "Tilt camera down",
    "face_too_high":      "Tilt camera up",
    "no_face_detected":   "Center subject in frame",
    "no_subject":         "Point camera at subject",
}

# ── High-score cinematic affirmations (by scene type) ─────────────────────
_CINEMATIC: dict[str, dict[str, str]] = {
    "portrait":  {"high": "Beautiful portrait framing",  "good": "Strong portrait composition"},
    "group":     {"high": "Excellent group framing",     "good": "Good group composition"},
    "close_up":  {"high": "Stunning close-up framing",   "good": "Clean close-up shot"},
    "landscape": {"high": "Cinematic landscape framing", "good": "Balanced landscape shot"},
    "general":   {"high": "Excellent cinematic framing", "good": "Strong composition"},
}

_STRENGTH_PRAISE: dict[str, str] = {
    "rule_of_thirds":  "Rule of thirds — beautiful",
    "balanced_framing": "Balanced composition",
    "good_headroom":   "Good headroom",
    "ideal_face_size": "Perfect subject scale",
    "good_eye_line":   "Strong eye-line placement",
}


class GuidanceEngine:
    """
    Converts issues/scores into stable coaching text.
    Only changes the displayed guidance once the same candidate
    has been recommended for `stability_frames` consecutive frames.
    This prevents the HUD from flickering between suggestions.
    """

    def __init__(self, stability_frames: int = 4) -> None:
        self._stability = stability_frames
        self._displayed = ""
        self._candidate = ""
        self._candidate_streak = 0

    def generate(
        self,
        issues: list[str],
        strengths: list[str],
        scores: dict,
        scene_type: str,
    ) -> str:
        overall = scores["overall"]
        scene = scene_type if scene_type in _CINEMATIC else "general"

        # ── Pick candidate ────────────────────────────────────────────────
        if overall >= 88:
            candidate = _CINEMATIC[scene]["high"]
        elif overall >= 72:
            if strengths:
                candidate = _STRENGTH_PRAISE.get(
                    strengths[0], _CINEMATIC[scene]["good"]
                )
            else:
                candidate = _CINEMATIC[scene]["good"]
        elif issues:
            candidate = _ISSUE_COACHING.get(issues[0], "Adjust framing")
        else:
            candidate = ""

        # ── Stability gate ────────────────────────────────────────────────
        if candidate == self._candidate:
            self._candidate_streak += 1
        else:
            self._candidate = candidate
            self._candidate_streak = 1

        if self._candidate_streak >= self._stability:
            self._displayed = self._candidate

        return self._displayed
