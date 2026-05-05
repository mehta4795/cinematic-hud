from __future__ import annotations


def compute(
    composition: dict,
    portrait: dict,
    horizon_angle: float,
    subject_confidence: float,
) -> dict:
    """
    Weighted multi-category score:
        composition  40%
        framing      25%
        portrait     20%
        horizon      15%

    Returns:
        {
            "overall":     int,  # 0-100
            "composition": int,
            "framing":     int,
            "portrait":    int,
            "horizon":     int,
        }
    """
    horizon_score = max(0, 100 - int(abs(horizon_angle) * 8))
    comp_score = composition["score"]
    framing_score = comp_score          # framing = composition quality
    portrait_score = portrait["score"]

    raw = (
        comp_score     * 0.40
        + framing_score  * 0.25
        + portrait_score * 0.20
        + horizon_score  * 0.15
    )

    # Confident detections earn a small bonus (max +8)
    overall = min(100, int(raw) + int(subject_confidence * 8))

    return {
        "overall":     max(0, overall),
        "composition": comp_score,
        "framing":     framing_score,
        "portrait":    portrait_score,
        "horizon":     horizon_score,
    }
