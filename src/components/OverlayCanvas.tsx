import { useRef } from 'react'
import { useAnimationFrame } from '../hooks/useAnimationFrame'
import type { OverlayState } from '../types/overlay'
import { lerpVec2, lerp } from '../types/overlay'
import { drawGrid } from '../overlays/GridOverlay'
import { drawFocusBox } from '../overlays/FocusBox'
import { drawHorizonGuide } from '../overlays/HorizonGuide'
import { drawFaceGuides } from '../overlays/FaceGuide'
import { drawScoreDisplay } from '../overlays/ScoreDisplay'
import { drawAutoCaptureIndicator } from '../overlays/AutoCaptureIndicator'
import { drawCaptureFlash } from '../overlays/CaptureFlash'
import { drawClaudeAnalysis } from '../overlays/ClaudeAnalysis'
import { drawVignette } from '../overlays/Vignette'
import { drawCinematicBars } from '../overlays/CinematicBars'
import { drawCaptureSuccess } from '../overlays/CaptureSuccess'
import { drawLightingIndicator } from '../overlays/LightingIndicator'
import { drawPoseGuide } from '../overlays/PoseGuide'
import { drawAiStatus } from '../overlays/AiStatus'
import { drawExpressionMeter } from '../overlays/ExpressionMeter'
import { drawPoutCaptureRing } from '../overlays/PoutCaptureRing'
import { getFrame } from '../websocket/frameStore'
import { useVisionSocket } from '../websocket/useVisionSocket'
import { usePhoneCameraSocket } from '../websocket/usePhoneCameraSocket'
import {
  playSubjectLock,
  playCapturePulse,
  playShutter,
} from '../audio/sounds'

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
  scoreBreakdown: { overall: 50, composition: 50, framing: 50, portrait: 50, horizon: 50, lighting: 100, pose: 100 },
  captureReady: false,
  captureCountdown: 0,
  shouldCapture: false,
  captureFlash: 0,
  bestScore: 0,
  captureSuccessOpacity: 0,
  captureCount: 0,
  lighting: {
    exposure: 'good' as const,
    faceBrightness: 0.5,
    dynamicRange: 'normal' as const,
    backlit: false,
    harshShadow: false,
  },
  poseLandmarks: [],
  poseType: 'general',
  poseIssues: [],
  expression: null,
  poutProgress: 0,
  claudeAnalysis: null,
  claudeAnalysisOpacity: 0,
  claudeAnalysisAge: 0,
}

interface Props {
  onCapture: (dataUrl: string) => void
  isReviewing: boolean
  phoneMode?: boolean
  stream?: MediaStream | null
}

export function OverlayCanvas({ onCapture, isReviewing, phoneMode = false, stream = null }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const stateRef   = useRef<OverlayState>(structuredClone(INITIAL_STATE))
  const prevRef    = useRef({ focusActive: false, captureReady: false })
  const onCaptureRef = useRef(onCapture)
  onCaptureRef.current = onCapture
  const isReviewingRef = useRef(isReviewing)
  isReviewingRef.current = isReviewing
  const frameRef   = useRef<ImageBitmap | null>(null)

  useVisionSocket(stateRef, phoneMode ? undefined : (bmp) => {
    frameRef.current?.close()
    frameRef.current = bmp
  }, !phoneMode)

  usePhoneCameraSocket(stateRef, stream, phoneMode)

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

    const s = stateRef.current
    s.timestamp += delta

    // ── Focus box ────────────────────────────────────────────────────────
    if (s.focusBox.active) {
      s.focusBox.current = lerpVec2(s.focusBox.current, s.focusBox.target, 0.15)
      s.focusBox.currentSize = lerp(s.focusBox.currentSize, s.focusBox.targetSize, 0.15)
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

    // ── Pose landmark smoothing ───────────────────────────────────────────
    for (const lm of s.poseLandmarks) {
      if (!(lm as any)._sx) { (lm as any)._sx = lm.x; (lm as any)._sy = lm.y }
      ;(lm as any)._sx = lerp((lm as any)._sx, lm.x, 0.15)
      ;(lm as any)._sy = lerp((lm as any)._sy, lm.y, 0.15)
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

    // ── Claude analysis lifecycle ─────────────────────────────────────────
    if (s.claudeAnalysis) {
      s.claudeAnalysisAge += delta
      const SHOW_MS = 9000
      const FADE_IN = 400
      const FADE_OUT = 1200
      if (s.claudeAnalysisAge < FADE_IN) {
        s.claudeAnalysisOpacity = s.claudeAnalysisAge / FADE_IN
      } else if (s.claudeAnalysisAge < SHOW_MS) {
        s.claudeAnalysisOpacity = 1
      } else if (s.claudeAnalysisAge < SHOW_MS + FADE_OUT) {
        s.claudeAnalysisOpacity = 1 - (s.claudeAnalysisAge - SHOW_MS) / FADE_OUT
      } else {
        s.claudeAnalysis = null
        s.claudeAnalysisOpacity = 0
        s.claudeAnalysisAge = 0
      }
    }

    // ── Capture flash decay ───────────────────────────────────────────────
    if (s.captureFlash > 0) {
      s.captureFlash = Math.max(0, s.captureFlash - delta * 0.004)
    }

    // ── Capture success ───────────────────────────────────────────────────
    if (s.shouldCapture) {
      s.captureSuccessOpacity = 1.0
      s.captureCount += 1

      if (!isReviewingRef.current) {
        const blob = getFrame()
        if (blob) {
          createImageBitmap(blob).then(bmp => {
            const cv = document.createElement('canvas')
            cv.width = bmp.width; cv.height = bmp.height
            cv.getContext('2d')!.drawImage(bmp, 0, 0)
            bmp.close()
            const dataUrl = cv.toDataURL('image/jpeg', 0.95)
            window.api?.saveCapture(dataUrl)
            onCaptureRef.current(dataUrl)
          })
        }
      }
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

    // ── Draw ──────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, w, h)

    // Video frame + tracking overlays — drawn at native canvas coords
    if (!phoneMode && frameRef.current) ctx.drawImage(frameRef.current, 0, 0, w, h)
    drawFocusBox(
      ctx,
      { x: s.focusBox.current.x * w, y: s.focusBox.current.y * h },
      s.focusBox.currentSize,
      s.timestamp,
      s.scoreCurrent,
      s.focusBox.active,
    )
    drawFaceGuides(ctx, s.faces, w, h)
    if (s.faces.length > 0) drawPoseGuide(ctx, s.poseLandmarks, s.poseType, s.poseIssues, w, h)

    // Fixed HUD overlays (no transform)
    // Offset bottom-anchored drawers above Safari browser toolbar (~83px)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const safeH = h - (isStandalone ? 20 : 90)

    if (s.showGrid) drawGrid(ctx, w, h)
    drawVignette(ctx, w, h, s.focusBox.active ? 0.7 : 0.2)
    drawHorizonGuide(ctx, s.horizonCurrent, w, safeH)
    drawAutoCaptureIndicator(ctx, s.captureReady, s.captureCountdown, s.shouldCapture, s.timestamp, w, h)
    drawScoreDisplay(ctx, s.scoreCurrent, s.guidanceText, s.guidanceOpacity, s.aiConnected, s.sceneType, s.bestScore, w, safeH)
    drawCaptureSuccess(ctx, s.captureSuccessOpacity, s.scoreCurrent, s.captureCount, w, h)
    if (s.aiConnected) drawLightingIndicator(ctx, s.lighting, w, safeH)
    if (s.faces.length > 0) drawExpressionMeter(ctx, s.expression, w, safeH)
    drawAiStatus(ctx, s.aiConnected, w, h)
    drawPoutCaptureRing(ctx, s.poutProgress, w, h)
    drawCinematicBars(ctx, w, h, s.sceneType === 'landscape' ? 0.85 : 0)

    if (s.claudeAnalysis && s.claudeAnalysisOpacity > 0) {
      drawClaudeAnalysis(ctx, s.claudeAnalysis, s.claudeAnalysisOpacity, w, h)
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
