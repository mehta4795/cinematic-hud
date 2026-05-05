import { useRef } from 'react'
import { useAnimationFrame } from '../hooks/useAnimationFrame'
import type { OverlayState } from '../types/overlay'
import { lerpVec2, lerp } from '../types/overlay'
import { drawGrid } from '../overlays/GridOverlay'
import { drawFocusBox } from '../overlays/FocusBox'
import { drawHudText } from '../overlays/HudText'
import { drawHorizonGuide } from '../overlays/HorizonGuide'
import { drawFaceGuides } from '../overlays/FaceGuide'
import { drawScoreDisplay } from '../overlays/ScoreDisplay'
import { useVisionSocket } from '../websocket/useVisionSocket'

const INITIAL_STATE: OverlayState = {
  focusBox: {
    target: { x: 0.5, y: 0.44 },
    current: { x: 0.5, y: 0.44 },
    targetSize: 120,
    currentSize: 120,
    active: false,
  },
  hudText: { text: 'SCANNING…', opacity: 0, visible: true },
  showGrid: true,
  timestamp: 0,
  faces: [],
  horizonTarget: 0,
  horizonCurrent: 0,
  scoreTarget: 50,
  scoreCurrent: 50,
  guidance: [],
  guidanceText: '',
  guidanceOpacity: 0,
  aiConnected: false,
}

export function OverlayCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // All state lives in a ref — RAF loop reads it, WebSocket hook writes it, no re-renders needed
  const stateRef = useRef<OverlayState>(structuredClone(INITIAL_STATE))

  useVisionSocket(stateRef)

  useAnimationFrame(delta => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight

    if (
      canvas.width !== Math.round(w * dpr) ||
      canvas.height !== Math.round(h * dpr)
    ) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const s = stateRef.current
    s.timestamp += delta

    // ── Focus box ─────────────────────────────────────────────────────────
    if (s.focusBox.active) {
      // AI driving: interpolate toward detected subject
      s.focusBox.current = lerpVec2(s.focusBox.current, s.focusBox.target, 0.08)
      s.focusBox.currentSize = lerp(s.focusBox.currentSize, s.focusBox.targetSize, 0.08)
    } else {
      // Fallback: slow sinusoidal drift so the HUD feels alive
      const drift = 0.015 * Math.sin(s.timestamp * 0.0004)
      s.focusBox.target = { x: 0.5 + drift, y: 0.44 + drift * 0.4 }
      s.focusBox.current = lerpVec2(s.focusBox.current, s.focusBox.target, 0.04)
    }

    // ── HUD text opacity ──────────────────────────────────────────────────
    if (s.hudText.visible && s.hudText.opacity < 1) {
      s.hudText.opacity = Math.min(1, s.hudText.opacity + delta * 0.0007)
    }

    // ── Horizon & score smoothing ─────────────────────────────────────────
    s.horizonCurrent = lerp(s.horizonCurrent, s.horizonTarget, 0.05)
    s.scoreCurrent = lerp(s.scoreCurrent, s.scoreTarget, 0.03)

    // ── Face position smoothing ───────────────────────────────────────────
    for (const face of s.faces) {
      face.smoothCx = lerp(face.smoothCx, face.cx, 0.08)
      face.smoothCy = lerp(face.smoothCy, face.cy, 0.08)
    }

    // ── Guidance text cross-fade ──────────────────────────────────────────
    const newGuidance = s.guidance[0] ?? ''
    if (newGuidance !== s.guidanceText) {
      // Fade out current text before switching
      if (s.guidanceOpacity > 0) {
        s.guidanceOpacity = Math.max(0, s.guidanceOpacity - delta * 0.004)
      } else {
        s.guidanceText = newGuidance
      }
    } else if (newGuidance) {
      s.guidanceOpacity = Math.min(1, s.guidanceOpacity + delta * 0.0012)
    } else {
      s.guidanceOpacity = Math.max(0, s.guidanceOpacity - delta * 0.002)
    }

    // ── Draw ──────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, w, h)

    if (s.showGrid) drawGrid(ctx, w, h)
    drawHorizonGuide(ctx, s.horizonCurrent, w, h)
    drawFocusBox(
      ctx,
      { x: s.focusBox.current.x * w, y: s.focusBox.current.y * h },
      s.focusBox.currentSize,
    )
    drawFaceGuides(ctx, s.faces, w, h)
    drawHudText(ctx, s.hudText.text, s.hudText.opacity, w, h)
    drawScoreDisplay(ctx, s.scoreCurrent, s.guidanceText, s.guidanceOpacity, s.aiConnected, w, h)
  })

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ background: 'transparent' }}
    />
  )
}
