# Cinematic HUD

An AI-powered camera viewfinder for desktop. Analyses your webcam feed in real time and overlays cinematic guides, subject tracking, composition scoring, and auto-capture.

## Features

- Real-time person + face detection with animated focus overlay
- Composition scoring and photography guidance
- Smart reframing and cinematic zoom
- Auto-capture when shot quality peaks
- Hero Mode (`H`) for enhanced tracking and zoom

## Prerequisites

- Node.js 18+
- Python 3.10+
- Webcam

## Setup

**Frontend**
```bash
npm install
```

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

> YOLOv8 weights (`yolov8n.pt`) download automatically on first run.

## Run

Open two terminals:

```bash
# Terminal 1 — AI backend
cd backend && source venv/bin/activate && python main.py

# Terminal 2 — Electron app
npm run dev
```

Select your camera from the dropdown in the top-left corner.

## Captures

Photos are saved to `~/Downloads/capture/` — triggered automatically when composition score peaks, or manually via the shutter button.

## Shortcuts

| Key | Action |
|-----|--------|
| `H` | Toggle Hero Mode (aggressive zoom + reframe) |
