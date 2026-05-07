import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { OverlayState } from '../types/overlay'
import { BACKEND_WS } from '../config/backend'
import { setFrame } from './frameStore'

const RECONNECT_DELAY_MS = 2000
const FRAME_INTERVAL_MS  = 250   // 4 FPS

export function usePhoneCameraSocket(
  stateRef: MutableRefObject<OverlayState>,
  stream:   MediaStream | null,
  active:   boolean,
) {
  const wsRef      = useRef<WebSocket | null>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout>>()
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const canvasRef  = useRef<HTMLCanvasElement | null>(null)
  const videoRef   = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!active || !stream) return

    // Hidden video element for frame capture
    const video = document.createElement('video')
    video.srcObject = stream
    video.autoplay = true
    video.playsInline = true
    video.muted = true
    video.play().catch(() => {})
    videoRef.current = video

    const canvas = document.createElement('canvas')
    canvasRef.current = canvas

    function connect() {
      const ws = new WebSocket(`${BACKEND_WS()}/ws/phone`)
      ws.binaryType = 'blob'
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[phone-cam] connected')
        stateRef.current.aiConnected = true

        intervalRef.current = setInterval(() => {
          const vid = videoRef.current
          const cvs = canvasRef.current
          if (!vid || !cvs || vid.readyState < 2 || ws.readyState !== WebSocket.OPEN) return

          const vw = vid.videoWidth
          const vh = vid.videoHeight
          if (!vw || !vh) return

          // Center-crop to 9:16 portrait
          const cropW = Math.round(vh * 9 / 16)
          const x0    = Math.round((vw - cropW) / 2)
          cvs.width  = 360
          cvs.height = 640
          cvs.getContext('2d')!.drawImage(vid, x0, 0, cropW, vh, 0, 0, 360, 640)
          cvs.toBlob(blob => {
            if (!blob) return
            setFrame(blob)
            if (ws.readyState === WebSocket.OPEN) ws.send(blob)
          }, 'image/jpeg', 0.8)
        }, FRAME_INTERVAL_MS)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ws.onmessage = ({ data }: { data: any }) => {
        let msg: any
        try { msg = JSON.parse(data) } catch { return }
        const s = stateRef.current

        if (msg.type === 'claude_analysis') {
          s.claudeAnalysis    = { headline: msg.analysis.headline ?? '', topTips: msg.analysis.top_tips ?? [] }
          s.claudeAnalysisAge = 0
          s.claudeAnalysisOpacity = 0
          return
        }

        if (msg.subjects?.length > 0) {
          const sub = msg.subjects[0]
          s.focusBox.target    = { x: sub.x + sub.w / 2, y: sub.y + sub.h / 2 }
          s.focusBox.targetSize = Math.max(sub.w, sub.h) * 390
          s.focusBox.active    = true
          s.hudText.text       = 'SUBJECT LOCKED'
          s.hudText.visible    = true
        } else {
          s.focusBox.active = false
          s.hudText.text    = 'SCANNING…'
        }

        s.faces = (msg.faces ?? []).map((f: any) => {
          const cx = f.x + f.w / 2
          const cy = f.y + f.h / 2
          return { cx, cy, w: f.w, h: f.h, smoothCx: cx, smoothCy: cy }
        })

        s.horizonTarget    = msg.horizon
        s.scoreTarget      = msg.scores?.overall ?? 50
        s.guidance         = msg.guidance ?? []
        s.sceneType        = msg.scene_type ?? 'general'
        s.scoreBreakdown   = msg.scores ?? s.scoreBreakdown
        s.captureReady     = msg.capture_ready ?? false
        s.captureCountdown = msg.capture_countdown ?? 0
        s.shouldCapture    = msg.should_capture ?? false
        s.bestScore        = msg.best_score ?? s.bestScore
        if (msg.should_capture) s.captureFlash = 1.0
      }

      ws.onclose = () => {
        clearInterval(intervalRef.current)
        stateRef.current.aiConnected = false
        timerRef.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      clearTimeout(timerRef.current)
      clearInterval(intervalRef.current)
      wsRef.current?.close()
      video.srcObject = null
    }
  }, [active, stream])
}
