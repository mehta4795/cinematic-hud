from __future__ import annotations

_VIS_THRESHOLD = 0.5


def _lm(landmarks: list[dict], idx: int) -> dict | None:
    for lm in landmarks:
        if lm["idx"] == idx:
            return lm if lm["vis"] >= _VIS_THRESHOLD else None
    return None


def _visible(landmarks: list[dict], *indices: int) -> bool:
    return all(_lm(landmarks, i) is not None for i in indices)


def analyze(landmarks: list[dict], head: dict) -> dict:
    """
    Classify pose type and evaluate quality.
    Returns {"score": int, "pose_type": str, "issues": list[str], "strengths": list[str]}
    """
    if not landmarks:
        return {"score": 50, "pose_type": "general", "issues": [], "strengths": []}

    issues:    list[str] = []
    strengths: list[str] = []

    # ── Pose type classification ──────────────────────────────────────────────
    l_hip   = _lm(landmarks, 23)
    r_hip   = _lm(landmarks, 24)
    l_knee  = _lm(landmarks, 25)
    r_knee  = _lm(landmarks, 26)
    l_ankle = _lm(landmarks, 27)
    r_ankle = _lm(landmarks, 28)

    if l_hip and r_hip and l_ankle and r_ankle:
        hip_y   = (l_hip["y"]   + r_hip["y"])   / 2
        ankle_y = (l_ankle["y"] + r_ankle["y"]) / 2
        # Jumping: hips high in frame (small y), ankles not reliable
        if hip_y < 0.4 and not _visible(landmarks, 27, 28):
            pose_type = "jumping"
        # Walking: significant height difference between ankles
        elif abs(l_ankle["y"] - r_ankle["y"]) > 0.08:
            pose_type = "walking"
        elif l_knee and r_knee:
            knee_y = (l_knee["y"] + r_knee["y"]) / 2
            # Sitting: hips at or below knee level
            if hip_y >= knee_y - 0.03:
                pose_type = "sitting"
            else:
                pose_type = "standing"
        else:
            pose_type = "standing"
    else:
        pose_type = "general"

    # ── Quality checks ────────────────────────────────────────────────────────
    l_shoulder = _lm(landmarks, 11)
    r_shoulder = _lm(landmarks, 12)

    # Uneven shoulders
    if l_shoulder and r_shoulder:
        if abs(l_shoulder["y"] - r_shoulder["y"]) > 0.04:
            issues.append("uneven_shoulders")

        # Leaning (spine alignment — shoulders vs hips)
        if l_hip and r_hip:
            mid_shoulder_x = (l_shoulder["x"] + r_shoulder["x"]) / 2
            mid_hip_x      = (l_hip["x"]      + r_hip["x"])      / 2
            if abs(mid_shoulder_x - mid_hip_x) > 0.06:
                issues.append("leaning")

    # Key body parts out of frame
    if not _visible(landmarks, 11, 12):
        issues.append("out_of_frame")

    # Head orientation from FaceMesh
    if abs(head.get("roll", 0.0)) > 10:
        issues.append("head_tilted")
    if abs(head.get("yaw", 0.0)) > 20:
        issues.append("not_facing_camera")

    # Strength: good posture
    if not issues and _visible(landmarks, 11, 12, 23, 24):
        strengths.append("good_posture")

    # ── Score ─────────────────────────────────────────────────────────────────
    deductions = {
        "uneven_shoulders":  20,
        "leaning":           25,
        "out_of_frame":      30,
        "head_tilted":       10,
        "not_facing_camera": 15,
    }
    score = 100 - sum(deductions.get(i, 0) for i in issues)
    score = max(0, min(100, score))

    return {
        "score":      score,
        "pose_type":  pose_type,
        "issues":     issues,
        "strengths":  strengths,
    }
