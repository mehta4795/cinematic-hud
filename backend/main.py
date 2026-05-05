"""
AI Vision Backend — streams detection metadata over WebSocket at ~4 FPS.
Frontend renders all visuals; this sends coordinates/scores/guidance only.

Usage:
    python main.py [--camera 0]
    CAMERA_INDEX=1 python main.py

Run with --list-cameras to print available camera indices.
"""
from __future__ import annotations

import asyncio
import json
import os
import pathlib
import sys
import time
from contextlib import asynccontextmanager
from typing import Set

CAPTURE_DIR = pathlib.Path.home() / "Downloads" / "capture"
CAPTURE_DIR.mkdir(parents=True, exist_ok=True)

import cv2
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from vision.detector import PersonDetector
from vision.face import FaceDetector
from vision.horizon import HorizonDetector

from intelligence.scene_classifier import classify
from intelligence.composition_engine import analyze as analyze_composition
from intelligence.portrait_rules import analyze as analyze_portrait
from intelligence.scoring_engine import compute as compute_scores
from intelligence.guidance_engine import GuidanceEngine
from intelligence.auto_capture import AutoCapture

# ── Config ────────────────────────────────────────────────────────────────
CAMERA_INDEX = int(os.environ.get("CAMERA_INDEX", 0))
TARGET_FPS = 4
WS_PORT = 8765
INFERENCE_SIZE = 512

# ── State ─────────────────────────────────────────────────────────────────
clients: Set[WebSocket] = set()


async def broadcast(data: dict) -> None:
    if not clients:
        return
    message = json.dumps(data)
    dead: Set[WebSocket] = set()
    for ws in clients.copy():
        try:
            await ws.send_text(message)
        except Exception:
            dead.add(ws)
    clients.difference_update(dead)


# ── Vision loop ───────────────────────────────────────────────────────────
async def vision_loop(camera_index: int) -> None:
    print("[vision] Initialising detectors…")
    person_det = PersonDetector()
    face_det   = FaceDetector()
    horizon_det = HorizonDetector()
    guidance_engine = GuidanceEngine(stability_frames=4)
    auto_capture    = AutoCapture(score_threshold=90, stable_frames=4)

    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        print(f"[vision] ✗ Cannot open camera {camera_index}.")
        print("         Try: CAMERA_INDEX=1 python main.py")
        print("         Or:  python main.py --list-cameras")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    print(f"[vision] ✓ Camera {camera_index} opened. Running at {TARGET_FPS} FPS.")

    frame_count = 0
    interval = 1.0 / TARGET_FPS

    while True:
        t0 = time.monotonic()

        ret, frame = await asyncio.to_thread(cap.read)
        if not ret:
            await asyncio.sleep(0.1)
            continue

        # Center-crop landscape to 9:16 portrait — frontend shows the same crop
        fh, fw = frame.shape[:2]
        crop_w = int(fh * 9 / 16)
        x0 = (fw - crop_w) // 2
        portrait_frame = frame[:, x0:x0 + crop_w]

        small = cv2.resize(portrait_frame, (INFERENCE_SIZE, INFERENCE_SIZE))

        subjects, faces, horizon = await asyncio.gather(
            asyncio.to_thread(person_det.detect, small),
            asyncio.to_thread(face_det.detect, small),
            asyncio.to_thread(horizon_det.detect, small),
        )

        # ── Intelligence layer ────────────────────────────────────────────
        scene_type   = classify(subjects, faces)
        composition  = analyze_composition(subjects, faces)
        portrait     = analyze_portrait(faces, scene_type)

        confidence   = subjects[0]["confidence"] if subjects else 0.0
        scores       = compute_scores(composition, portrait, horizon, confidence)

        all_issues    = composition["issues"] + portrait["issues"]
        all_strengths = composition["strengths"] + portrait["strengths"]

        guidance = guidance_engine.generate(all_issues, all_strengths, scores, scene_type)
        capture  = auto_capture.update(scores, subjects, horizon)

        if capture["should_capture"]:
            filename = CAPTURE_DIR / f"capture_{int(time.time()*1000)}.jpg"
            await asyncio.to_thread(cv2.imwrite, str(filename), portrait_frame)
            print(f"[capture] saved {filename}")

        await broadcast({
            "frame":             frame_count,
            "subjects":          subjects,
            "faces":             faces,
            "horizon":           horizon,
            "scene_type":        scene_type,
            "scores":            scores,
            "issues":            all_issues,
            "strengths":         all_strengths,
            "guidance":          [guidance] if guidance else [],
            "capture_ready":     capture["capture_ready"],
            "should_capture":    capture["should_capture"],
            "capture_countdown": capture["capture_countdown"],
            "best_score":        capture["best_score"],
        })

        frame_count += 1
        elapsed = time.monotonic() - t0
        await asyncio.sleep(max(0.0, interval - elapsed))

    cap.release()


# ── FastAPI app ───────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(vision_loop(CAMERA_INDEX))
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(lifespan=lifespan)


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    clients.add(websocket)
    print(f"[ws] client connected  (total: {len(clients)})")
    try:
        async for _ in websocket.iter_text():
            pass
    except WebSocketDisconnect:
        pass
    finally:
        clients.discard(websocket)
        print(f"[ws] client disconnected (total: {len(clients)})")


# ── Entry point ───────────────────────────────────────────────────────────
def list_cameras(max_test: int = 8) -> None:
    print("Available cameras:")
    for i in range(max_test):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            w = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
            h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
            print(f"  [{i}] {int(w)}x{int(h)}")
            cap.release()


if __name__ == "__main__":
    if "--list-cameras" in sys.argv:
        list_cameras()
        sys.exit(0)

    if "--camera" in sys.argv:
        idx = sys.argv.index("--camera")
        CAMERA_INDEX = int(sys.argv[idx + 1])

    uvicorn.run(app, host="0.0.0.0", port=WS_PORT, log_level="warning")
