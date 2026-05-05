from __future__ import annotations


def analyze(subjects: list[dict], faces: list[dict]) -> dict:
    """
    Evaluates rule-of-thirds, headroom, and visual balance.

    Returns:
        {
            "score": int,           # 0-100
            "issues": list[str],    # machine keys, e.g. "no_headroom"
            "strengths": list[str], # machine keys, e.g. "rule_of_thirds"
        }
    """
    primary = faces[0] if faces else subjects[0] if subjects else None
    if primary is None:
        return {"score": 30, "issues": ["no_subject"], "strengths": []}

    cx = primary["x"] + primary["w"] / 2
    cy = primary["y"] + primary["h"] / 2
    top = primary["y"]

    score = 50
    issues: list[str] = []
    strengths: list[str] = []

    # ── Rule of thirds ─────────────────────────────────────────────────────
    thirds_x = min(abs(cx - 1 / 3), abs(cx - 2 / 3))
    thirds_y = abs(cy - 1 / 3)
    thirds_pts = max(0, 25 - int(thirds_x * 80) - int(thirds_y * 70))
    score += thirds_pts
    if thirds_pts >= 18:
        strengths.append("rule_of_thirds")

    # ── Horizontal balance ─────────────────────────────────────────────────
    if 0.28 <= cx <= 0.72:
        score += 6
        if 0.35 <= cx <= 0.65:
            strengths.append("balanced_framing")
    elif cx < 0.18 or cx > 0.82:
        score -= 12
        issues.append("subject_off_frame")
    else:
        score -= 5
        issues.append("subject_off_center")

    # ── Headroom ───────────────────────────────────────────────────────────
    if top < 0.04:
        issues.append("no_headroom")
        score -= 14
    elif top < 0.08:
        issues.append("tight_headroom")
        score -= 7
    elif 0.08 <= top <= 0.28:
        strengths.append("good_headroom")
        score += 6
    elif top > 0.50:
        issues.append("excessive_headroom")
        score -= 10

    return {
        "score": max(0, min(100, score)),
        "issues": issues,
        "strengths": strengths,
    }
