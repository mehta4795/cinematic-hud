import type { LightingState } from '../types/overlay'

const FONT = '"SF Mono", "Courier New", monospace'

export function drawLightingIndicator(
  ctx: CanvasRenderingContext2D,
  lighting: LightingState,
  w: number,
  h: number,
) {
  const x = 14
  const baseY = h - 96

  ctx.save()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  // ── Exposure label ────────────────────────────────────────────────────────
  ctx.font = `700 7px ${FONT}`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.30)'
  ctx.fillText('EXPOSURE', x, baseY)

  // ── Exposure bar ──────────────────────────────────────────────────────────
  const barY    = baseY + 11
  const barW    = 60
  const barH    = 4
  const third   = barW / 3

  // Under zone (red)
  ctx.fillStyle = 'rgba(255, 90, 70, 0.50)'
  ctx.fillRect(x, barY, third, barH)

  // Good zone (green)
  ctx.fillStyle = 'rgba(0, 255, 120, 0.50)'
  ctx.fillRect(x + third, barY, third, barH)

  // Over zone (red)
  ctx.fillStyle = 'rgba(255, 90, 70, 0.50)'
  ctx.fillRect(x + third * 2, barY, third, barH)

  // Tick — faceBrightness 0→1 maps to bar left→right
  const tickX = x + lighting.faceBrightness * barW
  ctx.fillStyle = 'rgba(255, 255, 255, 0.90)'
  ctx.fillRect(tickX - 1, barY - 2, 2, barH + 4)

  // ── Exposure text badge ───────────────────────────────────────────────────
  if (lighting.exposure !== 'good') {
    const label = lighting.exposure === 'underexposed' ? 'UNDEREXPOSED' : 'OVEREXPOSED'
    ctx.font = `700 7px ${FONT}`
    ctx.fillStyle = 'rgba(255, 165, 0, 0.85)'
    ctx.shadowColor = 'rgba(255, 140, 0, 0.5)'
    ctx.shadowBlur = 6
    ctx.fillText(`⚠ ${label}`, x, barY + barH + 6)
    ctx.shadowBlur = 0
  }

  // ── Warning badges ────────────────────────────────────────────────────────
  let warningY = barY + barH + (lighting.exposure !== 'good' ? 20 : 6)

  ctx.font = `700 8px ${FONT}`
  ctx.shadowBlur = 6

  if (lighting.backlit) {
    ctx.fillStyle = 'rgba(255, 165, 0, 0.90)'
    ctx.shadowColor = 'rgba(255, 140, 0, 0.5)'
    ctx.fillText('⚠ BACKLIT', x, warningY)
    warningY += 14
  }

  if (lighting.harshShadow) {
    ctx.fillStyle = 'rgba(255, 165, 0, 0.90)'
    ctx.shadowColor = 'rgba(255, 140, 0, 0.5)'
    ctx.fillText('⚠ HARSH SHADOW', x, warningY)
  }

  ctx.shadowBlur = 0
  ctx.restore()
}
