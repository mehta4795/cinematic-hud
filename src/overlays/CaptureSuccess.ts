export function drawCaptureSuccess(
  ctx: CanvasRenderingContext2D,
  opacity: number,
  score: number,
  captureCount: number,
  w: number,
  h: number
) {
  if (opacity <= 0) return

  ctx.save()
  ctx.globalAlpha = opacity

  const cardW = 220
  const cardH = 80
  const cardX = (w - cardW) / 2
  const cardY = h * 0.38

  // Frosted background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  roundRect(ctx, cardX, cardY, cardW, cardH, 8)
  ctx.fill()

  // Green border
  ctx.strokeStyle = 'rgba(0, 255, 120, 0.7)'
  ctx.shadowColor = 'rgba(0, 255, 120, 0.4)'
  ctx.shadowBlur = 12
  ctx.lineWidth = 1
  roundRect(ctx, cardX, cardY, cardW, cardH, 8)
  ctx.stroke()

  ctx.shadowBlur = 0
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Title
  ctx.fillStyle = 'rgba(0, 255, 120, 0.95)'
  ctx.font = '700 11px "SF Mono", "Courier New", monospace'
  ctx.fillText('PERFECT SHOT CAPTURED', w / 2, cardY + 24)

  // Score
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.font = '400 9px "SF Mono", "Courier New", monospace'
  ctx.fillText(`QUALITY SCORE  ${Math.round(score)}%`, w / 2, cardY + 44)

  // Capture count
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.font = '400 8px "SF Mono", "Courier New", monospace'
  ctx.fillText(`SHOT #${captureCount}`, w / 2, cardY + 62)

  ctx.restore()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}
