"""
AI Vision Backend — streams detection metadata over WebSocket at ~4 FPS.
Frontend renders all visuals; this sends coordinates/scores only.

Usage:
    python main.py [--camera 0]

Camera index: set CAMERA_INDEX env var or pass --camera flag.
iPhone Continuity Camera is usually index 1 if a built-in FaceTime cam exists.
Run with --list-cameras to print available cameras.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from contextlib import asynccontextmanager
from typing import Set

import cv2
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from vision.detector import PersonDetector
from vision.face import FaceDetector
from vision.horizon import HorizonDetector
from vision.composition import CompositionAnalyzer

# ── Config ──────────────────────────────────────────────────────────────────
CAMERA_INDEX = int(os.environ.get("CAMERA_INDEX", 0))
TARGET_FPS = 4
WS_PORT = 8765
INFERENCE_SIZE = 512

# ── State ────────────────────────────────────────────────────────────────────
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


# ── Vision loop ───────────────────────────────────────────────────────────────
async def vision_loop(camera_index: int) -> None:
    print(f"[vision] Initialising detectors…")
    person_det = PersonDetector()
    face_det = FaceDetector()
    horizon_det = HorizonDetector()
    composition = CompositionAnalyzer()

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

        small = cv2.resize(frame, (INFERENCE_SIZE, INFERENCE_SIZE))

        subjects, faces, horizon = await asyncio.gather(
            asyncio.to_thread(person_det.detect, small),
            asyncio.to_thread(face_det.detect, small),
            asyncio.to_thread(horizon_det.detect, small),
        )

        score, guidance = composition.analyze(subjects, faces, horizon)

        await broadcast(
            {
                "frame": frame_count,
                "subjects": subjects,
                "faces": faces,
                "horizon": horizon,
                "composition_score": score,
                "guidance": guidance,
            }
        )

        frame_count += 1
        elapsed = time.monotonic() - t0
        await asyncio.sleep(max(0.0, interval - elapsed))


# ── FastAPI app ───────────────────────────────────────────────────────────────
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
        # Keep alive — client messages are ignored
        async for _ in websocket.iter_text():
            pass
    except WebSocketDisconnect:
        pass
    finally:
        clients.discard(websocket)
        print(f"[ws] client disconnected (total: {len(clients)})")


# ── Entry point ───────────────────────────────────────────────────────────────
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
