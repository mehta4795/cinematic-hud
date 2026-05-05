export function drawAutoCaptureIndicator(
  ctx: CanvasRenderingContext2D,
  captureReady: boolean,
  countdown: number,
  shouldCapture: boolean,
  timestamp: number,
  w: number,
  h: number
) {
  if (!captureReady && countdown < 0.05) return

  ctx.save()

  const pulseSpeed = 0.006 + countdown * 0.006
  const pulse = 0.5 + 0.5 * Math.sin(timestamp * pulseSpeed)
  const alpha = 0.35 + countdown * 0.55
  const color = shouldCapture
    ? `rgba(0, 255, 120, 0.95)`
    : `rgba(0, 255, 120, ${alpha})`

  ctx.strokeStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = shouldCapture ? 18 : 8
  ctx.lineWidth = shouldCapture ? 2 : 1.5

  const cx = w / 2
  const cy = h * 0.44
  const radius = 68 + pulse * 10 + countdown * 12

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.stroke()

  if (shouldCapture) {
    ctx.fillStyle = 'rgba(0, 255, 120, 1)'
    ctx.shadowBlur = 20
    ctx.font = '700 11px "SF Mono", "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('PERFECT SHOT', cx, cy - radius - 10)
  }

  ctx.restore()
}
