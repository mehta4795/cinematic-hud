"""
AI Vision Backend — streams JPEG frames + detection metadata over WebSocket at ~4 FPS.
Backend owns the camera exclusively; frontend displays frames received via WebSocket.

Usage:
    python main.py [--camera 1]
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
from collections import deque
from contextlib import asynccontextmanager
from typing import Set

CAPTURE_DIR = pathlib.Path.home() / "Downloads" / "capture"
CAPTURE_DIR.mkdir(parents=True, exist_ok=True)

import cv2
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from vision.detector import PersonDetector
from vision.face import FaceDetector
from vision.horizon import HorizonDetector
from vision.lighting import LightingAnalyzer
from vision.pose import PoseDetector
from vision.facemesh import FaceMeshDetector

from intelligence.scene_classifier import classify
from intelligence.composition_engine import analyze as analyze_composition
from intelligence.portrait_rules import analyze as analyze_portrait
from intelligence.scoring_engine import compute as compute_scores
from intelligence.guidance_engine import GuidanceEngine
from intelligence.auto_capture import AutoCapture
from intelligence.pose_engine import analyze as analyze_pose
from intelligence.claude_analyzer import analyze_capture


def crop_9_16(frame):
    h, w = frame.shape[:2]
    target_w = int(h * 9 / 16)
    if target_w < w:
        x = (w - target_w) // 2
        return frame[:, x:x + target_w]
    target_h = int(w * 16 / 9)
    if target_h < h:
        y = (h - target_h) // 2
        return frame[y:y + target_h, :]
    return frame

# ── Config ────────────────────────────────────────────────────────────────
CAMERA_INDEX = int(os.environ.get("CAMERA_INDEX", 1))
TARGET_FPS = 4
WS_PORT = 8765
INFERENCE_W, INFERENCE_H = 288, 512  # 9:16 — preserves portrait body proportions

# ── State ─────────────────────────────────────────────────────────────────
clients: Set[WebSocket] = set()
_available_cameras: list[dict] = []
_pending_camera: int | None = None


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


async def broadcast_binary(data: bytes) -> None:
    if not clients:
        return
    dead: Set[WebSocket] = set()
    for ws in clients.copy():
        try:
            await ws.send_bytes(data)
        except Exception:
            dead.add(ws)
    clients.difference_update(dead)


async def _run_claude_analysis(jpeg_bytes: bytes, model_data: dict) -> None:
    analysis = await analyze_capture(jpeg_bytes, model_data)
    if analysis:
        print(f"[claude] {analysis.get('headline', '')}")
        await broadcast({"type": "claude_analysis", "analysis": analysis})


def _scan_cameras(max_index: int = 6) -> list[dict]:
    result = []
    for i in range(max_index):
        cap = cv2.VideoCapture(i, cv2.CAP_AVFOUNDATION)
        if cap.isOpened():
            result.append({"index": i})
            cap.release()
    return result


# ── Vision loop ───────────────────────────────────────────────────────────
async def vision_loop(start_index: int) -> None:
    global _pending_camera

    print("[vision] Initialising detectors…")
    person_det        = PersonDetector()
    face_det          = FaceDetector()
    horizon_det       = HorizonDetector()
    lighting_analyzer = LightingAnalyzer()
    pose_det          = PoseDetector()
    facemesh_det      = FaceMeshDetector()
    guidance_engine   = GuidanceEngine(stability_frames=4)
    auto_capture      = AutoCapture(score_threshold=95, stable_frames=4)

    camera_index = start_index
    cap = cv2.VideoCapture(camera_index, cv2.CAP_AVFOUNDATION)
    if not cap.isOpened():
        print(f"[vision] ✗ Cannot open camera {camera_index}.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1080)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1920)
    actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"[vision] ✓ Camera {camera_index} opened at {actual_w}×{actual_h}. Running at {TARGET_FPS} FPS.")

    frame_count = 0
    interval = 1.0 / TARGET_FPS
    claude_in_flight = [False]   # mutable so nested async can clear the flag
    claude_last_time = [0.0]
    face_history: deque = deque(maxlen=8)  # last 8 face center positions

    while True:
        t0 = time.monotonic()

        # Camera switch requested by frontend
        if _pending_camera is not None and _pending_camera != camera_index:
            new_index = _pending_camera
            _pending_camera = None
            cap.release()
            cap = cv2.VideoCapture(new_index, cv2.CAP_AVFOUNDATION)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 720)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1280)
            if cap.isOpened():
                camera_index = new_index
                print(f"[vision] Switched to camera {new_index}")
            else:
                print(f"[vision] ✗ Failed to open camera {new_index}, staying on {camera_index}")
                cap = cv2.VideoCapture(camera_index, cv2.CAP_AVFOUNDATION)
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        ret, frame = await asyncio.to_thread(cap.read)
        if not ret:
            await asyncio.sleep(0.1)
            continue

        portrait_frame = crop_9_16(frame)

        # Stream display frame to frontend (binary JPEG)
        if clients:
            display = cv2.resize(portrait_frame, (360, 640))
            _, jpeg_buf = cv2.imencode('.jpg', display, [cv2.IMWRITE_JPEG_QUALITY, 80])
            await broadcast_binary(jpeg_buf.tobytes())

        small = cv2.resize(portrait_frame, (INFERENCE_W, INFERENCE_H))

        try:
            subjects, horizon = await asyncio.gather(
                asyncio.to_thread(person_det.detect, small),
                asyncio.to_thread(horizon_det.detect, small),
            )
            faces   = await asyncio.to_thread(face_det.detect, small)
            lighting = await asyncio.to_thread(lighting_analyzer.analyze, small, faces)

            if not faces:
                subjects    = []
                pose_lm     = []
                head_orient = {"roll": 0.0, "yaw": 0.0}
            else:
                pose_lm     = await asyncio.to_thread(pose_det.detect, small, faces[0])
                head_orient = await asyncio.to_thread(facemesh_det.detect, small, True)
        except Exception as exc:
            print(f"[vision] detection error: {exc}")
            await asyncio.sleep(interval)
            continue

        # Track subject stability via YOLOv8 (more reliable than Haar cascade)
        if subjects:
            sub = subjects[0]
            face_history.append((sub['x'] + sub['w'] / 2, sub['y'] + sub['h'] / 2))
        else:
            face_history.clear()

        # ── Intelligence layer ────────────────────────────────────────────
        scene_type   = classify(subjects, faces)
        composition  = analyze_composition(subjects, faces)
        portrait     = analyze_portrait(faces, scene_type)
        pose         = analyze_pose(pose_lm, head_orient)

        confidence   = subjects[0]["confidence"] if subjects else 0.0
        scores       = compute_scores(composition, portrait, horizon, confidence, lighting, pose)

        lighting_issues = []
        if lighting["backlit"]:                          lighting_issues.append("backlit")
        if lighting["harsh_shadow"]:                     lighting_issues.append("harsh_shadow")
        if lighting["exposure"] == "underexposed":       lighting_issues.append("underexposed")
        elif lighting["exposure"] == "overexposed":      lighting_issues.append("overexposed")

        all_issues    = composition["issues"] + portrait["issues"] + lighting_issues + pose["issues"]
        all_strengths = composition["strengths"] + portrait["strengths"] + pose["strengths"]

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
            "lighting":          lighting,
            "pose_landmarks":    pose_lm,
            "pose_type":         pose["pose_type"],
        })

        # ── Claude live analysis — fires when subject is stable, not in-flight ─
        _hist = face_history
        scene_stable = (
            len(_hist) >= 5
            and max(p[0] for p in _hist) - min(p[0] for p in _hist) < 0.06
            and max(p[1] for p in _hist) - min(p[1] for p in _hist) < 0.06
        )
        if clients and faces and not claude_in_flight[0] and scene_stable and t0 - claude_last_time[0] >= 1.0:
            claude_last_time[0] = t0
            claude_in_flight[0] = True
            _, cjpeg = cv2.imencode(
                '.jpg', cv2.resize(portrait_frame, (540, 960)),
                [cv2.IMWRITE_JPEG_QUALITY, 85],
            )
            model_snapshot = {
                "subjects": subjects, "faces": faces, "horizon": horizon,
                "scene_type": scene_type, "scores": scores,
                "issues": all_issues, "strengths": all_strengths,
            }
            async def _claude_task(jb=cjpeg.tobytes(), md=model_snapshot):
                try:
                    await _run_claude_analysis(jb, md)
                finally:
                    claude_in_flight[0] = False
            asyncio.create_task(_claude_task())

        frame_count += 1
        elapsed = time.monotonic() - t0
        await asyncio.sleep(max(0.0, interval - elapsed))

    cap.release()


# ── FastAPI app ───────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _available_cameras
    _available_cameras = await asyncio.to_thread(_scan_cameras)
    print(f"[cameras] found: {[c['index'] for c in _available_cameras]}")
    task = asyncio.create_task(vision_loop(CAMERA_INDEX))
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/cameras")
async def cameras_endpoint():
    return _available_cameras


@app.post("/switch/{index}")
async def switch_endpoint(index: int):
    global _pending_camera
    _pending_camera = index
    return {"ok": True}


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    clients.add(websocket)
    print(f"[ws] client connected  (total: {len(clients)})")
    try:
        async for _ in websocket.iter_bytes():
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
