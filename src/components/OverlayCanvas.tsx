import { useRef } from 'react'
import { useAnimationFrame } from '../hooks/useAnimationFrame'
import { OverlayState, lerpVec2 } from '../types/overlay'
import { drawGrid } from '../overlays/GridOverlay'
import { drawFocusBox } from '../overlays/FocusBox'
import { drawHudText } from '../overlays/HudText'

const INITIAL_STATE: OverlayState = {
  focusBox: {
    target: { x: 0.5, y: 0.44 },
    current: { x: 0.5, y: 0.44 },
    size: 120,
  },
  hudText: { text: 'SUBJECT LOCKED', opacity: 0, visible: true },
  showGrid: true,
  timestamp: 0,
}

export function OverlayCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // State in a ref — no React re-renders; future AI data can mutate this directly
  const stateRef = useRef<OverlayState>(structuredClone(INITIAL_STATE))

  useAnimationFrame(delta => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const state = stateRef.current
    state.timestamp += delta

    const drift = 0.015 * Math.sin(state.timestamp * 0.0004)
    state.focusBox.target = { x: 0.5 + drift, y: 0.44 + drift * 0.4 }
    state.focusBox.current = lerpVec2(state.focusBox.current, state.focusBox.target, 0.04)

    if (state.hudText.visible && state.hudText.opacity < 1) {
      state.hudText.opacity = Math.min(1, state.hudText.opacity + delta * 0.0007)
    }

    ctx.clearRect(0, 0, w, h)

    if (state.showGrid) drawGrid(ctx, w, h)

    drawFocusBox(
      ctx,
      { x: state.focusBox.current.x * w, y: state.focusBox.current.y * h },
      state.focusBox.size
    )

    drawHudText(ctx, state.hudText.text, state.hudText.opacity, w, h)
  })

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ background: 'transparent' }}
    />
  )
}
