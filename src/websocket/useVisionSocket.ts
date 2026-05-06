import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { OverlayState, ScoreBreakdown, LightingState, PoseLandmark } from '../types/overlay'
import { setFrame } from './frameStore'

interface SubjectMsg {
  id: number; label: string
  x: number; y: number; w: number; h: number
  confidence: number
}

interface FaceMsg {
  x: number; y: number; w: number; h: number
}

interface LightingMsg {
  exposure: LightingState['exposure']
  face_brightness: number
  dynamic_range: LightingState['dynamicRange']
  backlit: boolean
  harsh_shadow: boolean
}

interface VisionFrame {
  frame: number
  subjects: SubjectMsg[]
  faces: FaceMsg[]
  horizon: number
  scene_type: string
  scores: ScoreBreakdown
  issues: string[]
  strengths: string[]
  guidance: string[]
  capture_ready: boolean
  should_capture: boolean
  capture_countdown: number
  best_score: number
  lighting?: LightingMsg
  pose_landmarks?: PoseLandmark[]
  pose_type?: string
}

const WS_URL = 'ws://localhost:8765/ws'
const RECONNECT_DELAY_MS = 2000

export function useVisionSocket(
  stateRef: MutableRefObject<OverlayState>,
  onFrame?: (bmp: ImageBitmap) => void,
) {
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL)
      ws.binaryType = 'blob'
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[vision] connected')
        stateRef.current.aiConnected = true
      }

      ws.onmessage = ({ data }) => {
        // Binary = JPEG frame streamed from backend camera
        if (data instanceof Blob) {
          setFrame(data)
          createImageBitmap(data).then(bmp => onFrameRef.current?.(bmp))
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let msg: any
        try { msg = JSON.parse(data) } catch { return }

        const s = stateRef.current

        if (msg.type === 'claude_analysis') {
          s.claudeAnalysis = {
            headline: msg.analysis.headline ?? '',
            topTips: msg.analysis.top_tips ?? [],
          }
          s.claudeAnalysisAge = 0
          s.claudeAnalysisOpacity = 0
          return
        }

        if (msg.subjects.length > 0) {
          const sub = msg.subjects[0]
          const cx = sub.x + sub.w / 2
          const cy = sub.y + sub.h / 2
          s.focusBox.target  = { x: cx, y: cy }
          s.focusBox.current = { x: cx, y: cy }
          s.focusBox.targetSize = Math.max(sub.w, sub.h) * 260
          s.focusBox.active = true
          s.hudText.text = 'SUBJECT LOCKED'
          s.hudText.visible = true
        } else {
          s.focusBox.active = false
          s.hudText.text = 'SCANNING…'
        }

        s.faces = msg.faces.map(f => {
          const cx = f.x + f.w / 2
          const cy = f.y + f.h / 2
          return { cx, cy, w: f.w, h: f.h, smoothCx: cx, smoothCy: cy }
        })

        s.horizonTarget = msg.horizon
        s.scoreTarget   = msg.scores?.overall ?? 50
        s.guidance      = msg.guidance ?? []

        s.sceneType        = msg.scene_type ?? 'general'
        s.scoreBreakdown   = msg.scores ? { ...s.scoreBreakdown, ...msg.scores } : s.scoreBreakdown
        s.captureReady     = msg.capture_ready ?? false
        s.captureCountdown = msg.capture_countdown ?? 0
        s.shouldCapture    = msg.should_capture ?? false
        s.bestScore        = msg.best_score ?? s.bestScore

        if (msg.should_capture) {
          s.captureFlash = 1.0
        }

        if (msg.lighting) {
          s.lighting = {
            exposure:       msg.lighting.exposure       ?? 'good',
            faceBrightness: msg.lighting.face_brightness ?? 0.5,
            dynamicRange:   msg.lighting.dynamic_range   ?? 'normal',
            backlit:        msg.lighting.backlit         ?? false,
            harshShadow:    msg.lighting.harsh_shadow    ?? false,
          }
        }

        s.poseLandmarks = msg.pose_landmarks ?? []
        s.poseType      = msg.pose_type      ?? 'general'

        const POSE_ISSUE_KEYS = new Set([
          'uneven_shoulders', 'leaning', 'out_of_frame', 'head_tilted', 'not_facing_camera',
        ])
        s.poseIssues = (msg.issues ?? []).filter((k: string) => POSE_ISSUE_KEYS.has(k))
      }

      ws.onclose = () => {
        stateRef.current.aiConnected = false
        timerRef.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }

      ws.onerror = () => ws.close()
    }

    connect()
    return () => {
      clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [])
}
