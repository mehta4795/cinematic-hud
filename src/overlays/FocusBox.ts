import type { Vec2 } from '../types/overlay'

const BRACKET_LEN = 16

export function drawFocusBox(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
  size: number,
  timestamp: number,
  score: number,
  active: boolean
) {
  const breathSpeed = active ? 0.0018 : 0.0008
  const breathAmt   = active ? 3 : 6
  const displaySize = size + Math.sin(timestamp * breathSpeed) * breathAmt

  const half = displaySize / 2
  const x = pos.x - half
  const y = pos.y - half

  // Glow shifts cyan → green as score improves
  const t = Math.max(0, Math.min(1, (score - 40) / 60))
  const g = Math.round(lerp(160, 255, t))
  const b = Math.round(lerp(255, 120, t))
  const glowColor = `rgba(0, ${g}, ${b}, 0.85)`
  const glowBlur  = 6 + t * 12

  ctx.save()
  ctx.shadowColor = glowColor
  ctx.shadowBlur  = glowBlur
  ctx.strokeStyle = glowColor
  ctx.lineWidth   = active ? 1.5 : 1

  const corners: [number, number, number, number][] = [
    [x,                y,                 1,  1],
    [x + displaySize,  y,                -1,  1],
    [x,                y + displaySize,   1, -1],
    [x + displaySize,  y + displaySize,  -1, -1],
  ]

  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath()
    ctx.moveTo(cx + dx * BRACKET_LEN, cy)
    ctx.lineTo(cx, cy)
    ctx.lineTo(cx, cy + dy * BRACKET_LEN)
    ctx.stroke()
  }

  // Corner dots for premium look
  ctx.shadowBlur = 4
  ctx.fillStyle  = glowColor
  for (const [cx, cy] of corners) {
    ctx.beginPath()
    ctx.arc(cx, cy, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
