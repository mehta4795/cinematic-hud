// Progress ring drawn around the capture button while the user holds a pout.
// Snaps the shutter when progress reaches 1.0 (handled server-side via
// should_capture). The ring fades out during the cooldown after firing.

const FONT = '"SF Mono", "Courier New", monospace'
const ROSE = 'rgba(255, 70, 140,'

export function drawPoutCaptureRing(
  ctx: CanvasRenderingContext2D,
  progress: number,   // 0..1 — pout-hold progress from backend
  w: number,
  h: number,          // full canvas height (NOT safeH — button is in canvas coords)
) {
  if (progress <= 0.02) return

  // Capture button: bottom-10 (40 px from canvas bottom), w-16 / h-16 (64 px tall),
  // horizontally centered. Center is therefore at (w/2, h - 40 - 32) = (w/2, h - 72).
  const cx = w / 2
  const cy = h - 72
  const radius = 38   // sits just outside the 32 px button radius

  ctx.save()

  // Faint background ring
  ctx.strokeStyle = `${ROSE}0.18)`
  ctx.lineWidth   = 5
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.stroke()

  // Progress arc — starts at top, sweeps clockwise
  const start = -Math.PI / 2
  const end   = start + Math.PI * 2 * Math.min(1, Math.max(0, progress))
  ctx.strokeStyle = `${ROSE}0.95)`
  ctx.shadowColor = `${ROSE}0.6)`
  ctx.shadowBlur  = 14
  ctx.lineCap     = 'round'
  ctx.lineWidth   = 5
  ctx.beginPath()
  ctx.arc(cx, cy, radius, start, end)
  ctx.stroke()
  ctx.shadowBlur = 0

  // Hint text just below the button when actively holding
  if (progress > 0.05) {
    ctx.font         = `700 9px ${FONT}`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle    = `${ROSE}0.95)`
    ctx.shadowColor  = `${ROSE}0.5)`
    ctx.shadowBlur   = 6
    ctx.fillText('DUCKFACE TO CAPTURE', cx, cy + radius + 10)
    ctx.shadowBlur = 0
  }

  ctx.restore()
}
