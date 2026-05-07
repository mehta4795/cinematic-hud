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
    elif face_area > 0.32:
        issues.append("too_close")
        score -= 12

    # ── Eye-line / camera angle ────────────────────────────────────────────
    if 0.25 <= face_cy <= 0.48:
        strengths.append("good_eye_line")
        score += 16
    elif face_cy < 0.20:
        # Camera below eye level — shoots upward, causes double chin / stout look
        issues.append("camera_too_low")
        score -= 18
    elif face_cy > 0.60:
        issues.append("face_too_low")
        score -= 10

    return {
        "score": max(0, min(100, score)),
        "issues": issues,
        "strengths": strengths,
    }
