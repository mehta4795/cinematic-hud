export function drawVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number  // 0–1; higher = tighter when subject locked
) {
  const cx = w / 2
  const cy = h / 2
  const outerRadius = Math.sqrt(cx * cx + cy * cy) * 1.1
  const innerRadius = outerRadius * lerp(0.55, 0.35, intensity)

  const gradient = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(1, `rgba(0,0,0,${lerp(0.45, 0.65, intensity)})`)

  ctx.save()
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
