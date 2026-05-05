import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { OverlayState } from '../types/overlay'

interface SubjectMsg {
  id: number
  label: string
  x: number
  y: number
  w: number
  h: number
  confidence: number
}

interface FaceMsg {
  x: number
  y: number
  w: number
  h: number
}

interface VisionFrame {
  frame: number
  subjects: SubjectMsg[]
  faces: FaceMsg[]
  horizon: number
  composition_score: number
  guidance: string[]
}

const WS_URL = 'ws://localhost:8765/ws'
const RECONNECT_DELAY_MS = 2000

export function useVisionSocket(stateRef: MutableRefObject<OverlayState>) {
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[vision] WebSocket connected')
        stateRef.current.aiConnected = true
      }

      ws.onmessage = ({ data }) => {
        let msg: VisionFrame
        try {
          msg = JSON.parse(data)
        } catch {
          return
        }

        const state = stateRef.current

        // Subject tracking
        if (msg.subjects.length > 0) {
          const s = msg.subjects[0]
          state.focusBox.target = { x: s.x + s.w / 2, y: s.y + s.h / 2 }
          // Convert normalized size → canvas pixels (canvas width = 390)
          state.focusBox.targetSize = Math.max(s.w, s.h) * 390
          state.focusBox.active = true
          state.hudText.text = 'SUBJECT LOCKED'
          state.hudText.visible = true
        } else {
          state.focusBox.active = false
          state.hudText.text = 'SCANNING…'
        }

        // Face positions — initialize smooth values on first appearance
        state.faces = msg.faces.map(f => {
          const cx = f.x + f.w / 2
          const cy = f.y + f.h / 2
          return { cx, cy, w: f.w, h: f.h, smoothCx: cx, smoothCy: cy }
        })

        state.horizonTarget = msg.horizon
        state.scoreTarget = msg.composition_score
        state.guidance = msg.guidance
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
