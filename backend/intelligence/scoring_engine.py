from __future__ import annotations


def _lighting_score(lighting: dict) -> int:
    score = 100
    if lighting.get("exposure") != "good":  score -= 30
    if lighting.get("backlit"):             score -= 25
    if lighting.get("harsh_shadow"):        score -= 20
    return max(0, score)


def compute(
    composition: dict,
    portrait: dict,
    horizon_angle: float,
    subject_confidence: float,
    lighting: dict | None = None,
    pose: dict | None = None,
) -> dict:
    """
    Weighted multi-category score:
        composition  30%
        framing      15%
        portrait     15%
        horizon      10%
        lighting     15%
        pose         15%
    """
    horizon_score  = max(0, 100 - int(abs(horizon_angle) * 8))
    comp_score     = composition["score"]
    framing_score  = comp_score
    portrait_score = portrait["score"]
    light_score    = _lighting_score(lighting) if lighting else 100
    pose_score     = pose["score"] if pose else 100

    raw = (
        comp_score     * 0.30
        + framing_score  * 0.15
        + portrait_score * 0.15
        + horizon_score  * 0.10
        + light_score    * 0.15
        + pose_score     * 0.15
    )

    # Confident detections earn a small bonus (max +8)
    overall = min(100, int(raw) + int(subject_confidence * 8))

    return {
        "overall":     max(0, overall),
        "composition": comp_score,
        "framing":     framing_score,
        "portrait":    portrait_score,
        "horizon":     horizon_score,
        "lighting":    light_score,
        "pose":        pose_score,
    }
