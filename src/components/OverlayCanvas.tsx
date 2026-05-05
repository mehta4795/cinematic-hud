import { useRef, useEffect } from 'react'
import { useAnimationFrame } from '../hooks/useAnimationFrame'
import type { OverlayState } from '../types/overlay'
import { lerpVec2, lerp } from '../types/overlay'
import { drawGrid } from '../overlays/GridOverlay'
import { drawFocusBox } from '../overlays/FocusBox'
import { drawHudText } from '../overlays/HudText'
import { drawHorizonGuide } from '../overlays/HorizonGuide'
import { drawFaceGuides } from '../overlays/FaceGuide'
import { drawScoreDisplay } from '../overlays/ScoreDisplay'
import { drawAutoCaptureIndicator } from '../overlays/AutoCaptureIndicator'
import { drawCaptureFlash } from '../overlays/CaptureFlash'
import { drawVignette } from '../overlays/Vignette'
import { drawCinematicBars } from '../overlays/CinematicBars'
import { drawCaptureSuccess } from '../overlays/CaptureSuccess'
import { useVisionSocket } from '../websocket/useVisionSocket'
import {
  playSubjectLock,
  playCapturePulse,
  playShutter,
  playHeroActivate,
  playHeroDeactivate,
} from '../audio/sounds'

// Base constants — Hero Mode overrides these
const ZOOM_BASE   = 1.05
const ZOOM_ACTIVE = 1.15
const ZOOM_HIGH   = 1.22
const MAX_SHIFT_X = 32
const MAX_SHIFT_Y = 70

// Hero Mode overrides
const HERO_ZOOM_ACTIVE = 1.22
const HERO_ZOOM_HIGH   = 1.35
const HERO_MAX_SHIFT_X = 48
const HERO_MAX_SHIFT_Y = 100
const HERO_REFRAME_T   = 0.025   // faster reframing
const HERO_SCORE_GATE  = 80      // fires auto-capture more easily

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
  sceneType: 'general',
  scoreBreakdown: { overall: 50, composition: 50, framing: 50, portrait: 50, horizon: 50 },
  captureReady: false,
  captureCountdown: 0,
  shouldCapture: false,
  captureFlash: 0,
  bestScore: 0,
  reframeX: 0,
  reframeY: 0,
  reframeTargetX: 0,
  reframeTargetY: 0,
  zoomLevel: ZOOM_BASE,
  zoomTarget: ZOOM_BASE,
  captureSuccessOpacity: 0,
  captureCount: 0,
}

export function OverlayCanvas() {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const stateRef   = useRef<OverlayState>(structuredClone(INITIAL_STATE))
  const heroRef    = useRef(false)
  const prevRef    = useRef({ focusActive: false, captureReady: false })

  useVisionSocket(stateRef)

  // Hero Mode — press H to toggle
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'h') return
      heroRef.current = !heroRef.current
      if (heroRef.current) playHeroActivate()
      else playHeroDeactivate()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useAnimationFrame(delta => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight

    if (
      canvas.width  !== Math.round(w * dpr) ||
      canvas.height !== Math.round(h * dpr)
    ) {
      canvas.width  = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const s    = stateRef.current
    const hero = heroRef.current
    s.timestamp += delta

    // ── Focus box ────────────────────────────────────────────────────────
    if (s.focusBox.active) {
      s.focusBox.current = lerpVec2(s.focusBox.current, s.focusBox.target, 0.08)
      s.focusBox.currentSize = lerp(s.focusBox.currentSize, s.focusBox.targetSize, 0.08)
    } else {
      const drift = 0.015 * Math.sin(s.timestamp * 0.0004)
      s.focusBox.target  = { x: 0.5 + drift, y: 0.44 + drift * 0.4 }
      s.focusBox.current = lerpVec2(s.focusBox.current, s.focusBox.target, 0.04)
    }

    // ── HUD text ─────────────────────────────────────────────────────────
    if (s.hudText.visible && s.hudText.opacity < 1) {
      s.hudText.opacity = Math.min(1, s.hudText.opacity + delta * 0.0007)
    }

    // ── Horizon + score smoothing ─────────────────────────────────────────
    s.horizonCurrent = lerp(s.horizonCurrent, s.horizonTarget, 0.05)
    s.scoreCurrent   = lerp(s.scoreCurrent,   s.scoreTarget,   0.03)

    // ── Face smoothing ────────────────────────────────────────────────────
    for (const face of s.faces) {
      face.smoothCx = lerp(face.smoothCx, face.cx, 0.08)
      face.smoothCy = lerp(face.smoothCy, face.cy, 0.08)
    }

    // ── Guidance cross-fade ───────────────────────────────────────────────
    const newGuidance = s.guidance[0] ?? ''
    if (newGuidance !== s.guidanceText) {
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

    // ── Capture flash decay ───────────────────────────────────────────────
    if (s.captureFlash > 0) {
      s.captureFlash = Math.max(0, s.captureFlash - delta * 0.004)
    }

    // ── Capture success ───────────────────────────────────────────────────
    if (s.shouldCapture) {
      s.captureSuccessOpacity = 1.0
      s.captureCount += 1
    }
    s.shouldCapture = false
    if (s.captureSuccessOpacity > 0) {
      s.captureSuccessOpacity = Math.max(0, s.captureSuccessOpacity - delta * 0.00055)
    }

    // ── Audio triggers (on state transitions only) ────────────────────────
    if (s.focusBox.active && !prevRef.current.focusActive) {
      playSubjectLock()
    }
    if (s.captureReady && !prevRef.current.captureReady) {
      playCapturePulse()
    }
    if (s.captureSuccessOpacity === 1.0 && prevRef.current.captureReady) {
      playShutter()
    }
    prevRef.current.focusActive  = s.focusBox.active
    prevRef.current.captureReady = s.captureReady

    // ── Smart Reframing ───────────────────────────────────────────────────
    const maxX = hero ? HERO_MAX_SHIFT_X : MAX_SHIFT_X
    const maxY = hero ? HERO_MAX_SHIFT_Y : MAX_SHIFT_Y
    const reframeT = hero ? HERO_REFRAME_T : 0.012

    if (s.focusBox.active) {
      const idealX = w * (s.sceneType === 'landscape' ? 0.5 : 0.36)
      const idealY = h * 0.38
      const subjectX = s.focusBox.current.x * w
      const subjectY = s.focusBox.current.y * h
      s.reframeTargetX = Math.max(-maxX, Math.min(maxX, idealX - subjectX))
      s.reframeTargetY = Math.max(-maxY, Math.min(maxY, idealY - subjectY))
    } else {
      s.reframeTargetX = 0
      s.reframeTargetY = 0
    }
    s.reframeX = lerp(s.reframeX, s.reframeTargetX, reframeT)
    s.reframeY = lerp(s.reframeY, s.reframeTargetY, reframeT)

    // ── Cinematic zoom ────────────────────────────────────────────────────
    const zoomActive = hero ? HERO_ZOOM_ACTIVE : ZOOM_ACTIVE
    const zoomHigh   = hero ? HERO_ZOOM_HIGH   : ZOOM_HIGH
    const scoreGate  = hero ? HERO_SCORE_GATE  : 80

    s.zoomTarget = s.focusBox.active
      ? (s.scoreCurrent >= scoreGate ? zoomHigh : zoomActive)
      : ZOOM_BASE
    s.zoomLevel = lerp(s.zoomLevel, s.zoomTarget, 0.0008)

    const video = canvas.parentElement?.querySelector('video') as HTMLVideoElement | null
    if (video) {
      video.style.transform = `translate(${s.reframeX}px, ${s.reframeY}px) scale(${s.zoomLevel})`
      video.style.transformOrigin = 'center center'
    }

    // ── Draw ──────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, w, h)

    if (s.showGrid) drawGrid(ctx, w, h)
    drawVignette(ctx, w, h, s.focusBox.active ? (hero ? 0.9 : 0.7) : 0.2)
    drawHorizonGuide(ctx, s.horizonCurrent, w, h)
    drawAutoCaptureIndicator(ctx, s.captureReady, s.captureCountdown, s.shouldCapture, s.timestamp, w, h)
    drawFocusBox(
      ctx,
      { x: s.focusBox.current.x * w, y: s.focusBox.current.y * h },
      s.focusBox.currentSize,
      s.timestamp,
      s.scoreCurrent,
      s.focusBox.active,
    )
    drawFaceGuides(ctx, s.faces, w, h)
    drawHudText(ctx, s.hudText.text, s.hudText.opacity, w, h)
    drawScoreDisplay(ctx, s.scoreCurrent, s.guidanceText, s.guidanceOpacity, s.aiConnected, s.sceneType, s.bestScore, w, h)
    drawCaptureSuccess(ctx, s.captureSuccessOpacity, s.scoreCurrent, s.captureCount, w, h)
    drawCinematicBars(ctx, w, h, s.sceneType === 'landscape' ? 0.85 : 0)

    // Hero Mode badge
    if (hero) {
      ctx.save()
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(0, 255, 120, 0.9)'
      ctx.shadowColor = 'rgba(0, 255, 120, 0.5)'
      ctx.shadowBlur = 8
      ctx.font = '700 8px "SF Mono", "Courier New", monospace'
      ctx.fillText('◈ HERO MODE', 14, 14)
      ctx.restore()
    }

    drawCaptureFlash(ctx, s.captureFlash, w, h)
  })

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ background: 'transparent' }}
    />
  )
}
