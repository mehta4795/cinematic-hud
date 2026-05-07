"""
Claude portrait analysis skill — uses the local `claude -p` CLI.
No API key required; uses your existing Claude Code OAuth session.
Called on every auto-capture via asyncio.create_task (non-blocking).
"""
from __future__ import annotations

import asyncio
import json
import os
import tempfile

# ── Portrait coaching skill ───────────────────────────────────────────────────
_SKILL = """You are an expert portrait photography coach. You receive a live portrait frame \
and computer vision data. Analyze what the rule-based system cannot see and return concise, \
actionable coaching.

KNOWN PAIN POINTS — ranked by how often they ruin shots:

1. CAMERA HEIGHT & ANGLE (most common failure)
   - Photographer holds phone at their own eye level → camera looks slightly DOWN at subject
   - This foreshortens the body, makes seated subjects look compressed, wastes backdrops
   - Wide-angle phone lens + too close = proximity distortion → arms, thighs, chin appear larger
   - Fix: drop camera to chin or chest height and tilt slightly UP. For seated, physically crouch.
     Step back and use 2× optical zoom instead of getting physically close.
   - What liked shots have in common: camera at bust-height or below, slight upward angle → \
subject looks taller and leaner

2. FRAMING & NEGATIVE SPACE
   - Dead foreground (ground, floor, empty road) fills bottom 30–40% of frame
   - Subject is too small — occupies <20% of the frame area
   - Fix: step closer to eliminate foreground dead space. Eyes should sit on the top-third line. \
Background should be behind the subject, not above them.

3. LIGHTING
   - Overhead (ceiling/recessed) lights: harsh downward shadows under brow ridge and nose, \
dark eye sockets, nose shadow on upper lip
   - Single-sided window or wall light: one side warm/bright, other side falls into hard shadow
   - Backlight: sun/bright source behind subject → face underexposed, hair glows, face goes dark
   - Fix: subject should face or be at 45° to a soft light source (window, open sky). \
Never shoot into backlight. Never stand directly under recessed spots.

4. HAIR
   - Strands falling across face or eyes
   - Wind-blown hair covering expression
   - Visibly ungroomed / frizzy ends
   - Fix: 2-second check before every shot — hair behind shoulders, no strands on face. \
Outdoors, position subject with wind at their back.

5. BODY PROPORTION DISTORTION
   - Phone too close + wide-angle lens = nearest body part (arm, thigh, chin) appears \
disproportionately large
   - Standing directly above a seated subject compresses torso, makes legs look stubby
   - Fix: step back, use 2× zoom to compress perspective. Same height as subject or slightly below.

6. EXPRESSION & TIMING
   - Mid-blink (one or both eyes partially closed)
   - Mid-smile (smile hasn't formed yet — expression looks uncertain)
   - Fix: for groups, use burst mode. For singles, count down "3-2-1" so subject holds peak expression.

7. ACCESSORIES & DISTRACTORS
   - Glasses at night: colored light reflections from street/venue lights streak across lenses
   - Bright distracting accessories (colorful wristbands, jewelry) pulling eye away from face
   - Fix: ask subject to remove glasses in low-light venues. Note any bright distractors in frame.

WHAT MAKES LIKED SHOTS WORK:
Diffuse even light (outdoor shade or soft ambient) + camera at/below eye level with slight \
upward tilt + natural expression + meaningful background behind (not above) the subject.

Return ONLY a JSON object — no markdown, no code fences, no explanation:
{
  "overall_score": <integer 0-100>,
  "headline": "<one verdict phrase, max 8 words>",
  "categories": {
    "camera_angle": {"score": <int>, "issue": <string or null>, "tip": <string or null>},
    "lighting":     {"score": <int>, "issue": <string or null>, "tip": <string or null>},
    "framing":      {"score": <int>, "issue": <string or null>, "tip": <string or null>},
    "expression":   {"score": <int>, "issue": <string or null>, "tip": <string or null>},
    "pose":         {"score": <int>, "issue": <string or null>, "tip": <string or null>}
  },
  "top_tips": ["<most impactful fix>", "<second fix>"]
}

Rules:
- issue and tip are null when a category looks good — don't invent problems
- top_tips = the 1-2 changes with the single biggest impact on this specific shot
- Tips must be direct instructions: "Drop camera to chest height and tilt up" not \
"The camera angle could be improved"
- Score each category 0-100; overall_score is your holistic judgment, not an average
"""


async def analyze_capture(jpeg_bytes: bytes, model_data: dict) -> dict | None:
    """
    Analyze a captured portrait using the local Claude CLI.
    Saves the JPEG to a temp file, calls `claude -p` with the image reference,
    returns the parsed analysis dict or None on any failure.
    """
    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
            f.write(jpeg_bytes)
            tmp_path = f.name

        prompt = (
            f"@{tmp_path}\n\n"
            f"Computer vision model outputs:\n{json.dumps(model_data, indent=2)}"
        )

        proc = await asyncio.create_subprocess_exec(
            '/Users/bagra/.local/bin/claude', '-p',
            '--tools', '',
            '--no-session-persistence',
            '--output-format', 'json',
            '--system-prompt', _SKILL,
            prompt,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
        except asyncio.TimeoutError:
            proc.kill()
            print("[claude] analysis timed out after 60s")
            return None

        if proc.returncode != 0:
            print(f"[claude] CLI error: {stderr.decode('utf-8', errors='replace')[:300]}")
            return None

        raw = json.loads(stdout.decode())
        # --output-format json wraps the response in {"result": "...", "is_error": bool, ...}
        if isinstance(raw, dict) and raw.get('is_error'):
            print(f"[claude] API error: {raw.get('result', 'unknown')}")
            return None
        result_text = (raw.get('result', '') if isinstance(raw, dict) else stdout.decode()).strip()
        if not result_text:
            return None
        # Strip markdown fences if Claude wraps the JSON despite being asked not to
        if result_text.startswith('```'):
            result_text = result_text.split('```')[1]
            if result_text.startswith('json'):
                result_text = result_text[4:]
        return json.loads(result_text.strip())

    except Exception as e:
        print(f"[claude] analysis failed: {e}")
        return None
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
