import { Vec2 } from '../types/overlay'

const BRACKET_LEN = 18
const GLOW_COLOR = 'rgba(0, 220, 255, 0.85)'

export function drawFocusBox(ctx: CanvasRenderingContext2D, pos: Vec2, size: number) {
  const half = size / 2
  const x = pos.x - half
  const y = pos.y - half

  ctx.save()
  ctx.shadowColor = GLOW_COLOR
  ctx.shadowBlur = 8
  ctx.strokeStyle = GLOW_COLOR
  ctx.lineWidth = 1.5

  const corners: [number, number, number, number][] = [
    [x,        y,        1,  1],
    [x + size, y,       -1,  1],
    [x,        y + size, 1, -1],
    [x + size, y + size,-1, -1],
  ]

  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath()
    ctx.moveTo(cx + dx * BRACKET_LEN, cy)
    ctx.lineTo(cx, cy)
    ctx.lineTo(cx, cy + dy * BRACKET_LEN)
    ctx.stroke()
  }

  ctx.restore()
}
