const FONT = '"SF Mono", "Courier New", monospace'

// Horizon spirit level. Anchored bottom-right corner, below the score column.
export function drawHorizonGuide(
  ctx: CanvasRenderingContext2D,
  angleDeg: number,
  w: number,
  h: number,
) {
  const isLevel = Math.abs(angleDeg) < 1.5
  const color   = isLevel ? 'rgba(0, 255, 120, 0.85)' : 'rgba(255, 200, 60, 0.90)'

  const trackW   = 72
  const trackH   = 4
  const trackX   = w - 14 - trackW  // right-aligned, 14px margin from canvas right
  const cx       = trackX + trackW / 2
  const cy       = h - 30           // track centre — leaves room for label below

  ctx.save()

  // ── Track background ──────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.beginPath()
  ctx.roundRect(trackX, cy - trackH / 2, trackW, trackH, 2)
  ctx.fill()

  // ── Center tick ───────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.fillRect(cx - 1, cy - trackH / 2 - 2, 2, trackH + 4)

  // ── Bubble — angle ±15° maps to ±(trackW/2 - 5) px ───────────────────────
  const maxShift = trackW / 2 - 5
  const shift    = Math.max(-maxShift, Math.min(maxShift, (angleDeg / 15) * maxShift))
  const bubbleX  = cx + shift

  ctx.shadowColor = color
  ctx.shadowBlur  = 8
  ctx.fillStyle   = color
  ctx.beginPath()
  ctx.arc(bubbleX, cy, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // ── Label ─────────────────────────────────────────────────────────────────
  ctx.font         = `600 8px ${FONT}`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle    = color

  if (isLevel) {
    ctx.fillText('LEVEL', cx, cy + 10)
  } else {
    const label = angleDeg < 0
      ? `← ${Math.abs(angleDeg).toFixed(1)}°`
      : `${Math.abs(angleDeg).toFixed(1)}° →`
    ctx.fillText(label, cx, cy + 10)
  }

  ctx.restore()
}
