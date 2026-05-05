from __future__ import annotations


class CompositionAnalyzer:
    def analyze(
        self,
        subjects: list[dict],
        faces: list[dict],
        horizon_angle: float,
    ) -> tuple[int, list[str]]:
        """
        Pure heuristics — no ML required.
        Returns (score 0-100, guidance list).
        """
        score = 50
        guidance: list[str] = []

        if not subjects and not faces:
            return score, ["Point camera at subject"]

        # Prefer face position over body box for framing analysis
        primary = faces[0] if faces else subjects[0] if subjects else None

        if primary:
            cx = primary["x"] + primary["w"] / 2
            cy = primary["y"] + primary["h"] / 2

            # Rule-of-thirds proximity bonus (ideal: x≈1/3 or 2/3, y≈1/3)
            thirds_x = min(abs(cx - 1 / 3), abs(cx - 2 / 3))
            thirds_y = abs(cy - 1 / 3)
            score += max(0, int(25 - thirds_x * 100 - thirds_y * 80))

            # Subject centering bonus
            center_dist = ((cx - 0.5) ** 2 + (cy - 0.5) ** 2) ** 0.5
            if center_dist < 0.1:
                score += 8

            # Headroom check
            top = primary["y"]
            if top < 0.05:
                guidance.append("Add headroom")
                score -= 10
            elif top > 0.45:
                guidance.append("Move camera up")
                score -= 8

            # Horizontal framing
            if cx < 0.28:
                guidance.append("Move right")
                score -= 5
            elif cx > 0.72:
                guidance.append("Move left")
                score -= 5

            # Vertical framing
            if cy > 0.78:
                guidance.append("Tilt camera down")
                score -= 5
            elif cy < 0.18:
                guidance.append("Tilt camera up")
                score -= 5

        # Horizon
        if abs(horizon_angle) > 5:
            guidance.append(f"Level camera ({horizon_angle:+.0f}°)")
            score -= int(abs(horizon_angle) * 2)
        elif abs(horizon_angle) <= 1.5:
            score += 10

        # Confidence bonus
        if subjects:
            score += int(subjects[0].get("confidence", 0) * 15)

        score = max(0, min(100, score))
        guidance = guidance[:2]

        if not guidance and score >= 75:
            guidance = ["Good framing"]

        return score, guidance
