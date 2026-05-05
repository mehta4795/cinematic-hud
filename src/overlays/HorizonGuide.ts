export function drawHorizonGuide(
  ctx: CanvasRenderingContext2D,
  angleDeg: number,
  w: number,
  h: number
) {
  const isLevel = Math.abs(angleDeg) < 1.5
  const color = isLevel ? 'rgba(0, 255, 120, 0.6)' : 'rgba(255, 80, 80, 0.7)'

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.shadowColor = color
  ctx.shadowBlur = 6

  const rad = (angleDeg * Math.PI) / 180
  const cx = w / 2
  const cy = h / 2
  const halfLen = w * 0.35
  const dx = Math.cos(rad) * halfLen
  const dy = Math.sin(rad) * halfLen

  ctx.beginPath()
  ctx.moveTo(cx - dx, cy - dy)
  ctx.lineTo(cx + dx, cy + dy)
  ctx.stroke()

  // Center pivot dot
  ctx.beginPath()
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.shadowBlur = 4
  ctx.fill()

  ctx.restore()
}
