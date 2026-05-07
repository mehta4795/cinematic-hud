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

  // ── Warning badges ────────────────────────────────────────────────────────
  let warningY = baseY

  if (lighting.exposure !== 'good') {
    const label = lighting.exposure === 'underexposed' ? 'UNDEREXPOSED' : 'OVEREXPOSED'
    ctx.font = `700 8px ${FONT}`
    ctx.fillStyle = 'rgba(255, 165, 0, 0.90)'
    ctx.shadowColor = 'rgba(255, 140, 0, 0.5)'
    ctx.shadowBlur = 6
    ctx.fillText(`⚠ ${label}`, x, warningY)
    ctx.shadowBlur = 0
    warningY += 14
  }

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
