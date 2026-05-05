from __future__ import annotations


def analyze(faces: list[dict], scene_type: str) -> dict:
    """
    Evaluates face scale and eye-line position for portrait/close-up scenes.
    Returns neutral score for non-portrait scenes.

    Returns:
        {
            "score": int,
            "issues": list[str],
            "strengths": list[str],
        }
    """
    if scene_type not in ("portrait", "close_up", "group"):
        return {"score": 70, "issues": [], "strengths": []}

    if not faces:
        return {"score": 40, "issues": ["no_face_detected"], "strengths": []}

    face = faces[0]
    score = 55
    issues: list[str] = []
    strengths: list[str] = []

    face_area = face["w"] * face["h"]
    face_cy = face["y"] + face["h"] / 2

    # ── Face size ──────────────────────────────────────────────────────────
    if face_area < 0.03:
        issues.append("subject_too_far")
        score -= 18
    elif face_area < 0.07:
        issues.append("move_closer")
        score -= 6
    elif 0.08 <= face_area <= 0.28:
        strengths.append("ideal_face_size")
        score += 22
    elif face_area > 0.38:
        issues.append("too_close")
        score -= 12

    # ── Eye-line (ideal: face centered at 28-44% down) ─────────────────────
    if 0.28 <= face_cy <= 0.44:
        strengths.append("good_eye_line")
        score += 16
    elif face_cy > 0.62:
        issues.append("face_too_low")
        score -= 10
    elif face_cy < 0.18:
        issues.append("face_too_high")
        score -= 10

    return {
        "score": max(0, min(100, score)),
        "issues": issues,
        "strengths": strengths,
    }
