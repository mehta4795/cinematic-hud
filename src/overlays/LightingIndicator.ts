import type { LightingState } from '../types/overlay'

const FONT = '"SF Mono", "Courier New", monospace'

// Colour palette (alpha appended at use site)
const C = {
  good:        'rgba(0, 220, 120,',     // green
  under:       'rgba(255, 95, 60,',     // coral / red-orange
  over:        'rgba(255, 195, 50,',    // amber / yellow-orange
  backlit:     'rgba(255, 220, 70,',    // sun yellow
  harshShadow: 'rgba(255, 70, 110,',    // hot pink-red
  label:       'rgba(255, 255, 255,',   // muted UI text
}

const STATUS_LABELS: Record<LightingState['exposure'], string> = {
  good:         'GOOD',
  underexposed: 'UNDEREXPOSED',
  overexposed:  'OVEREXPOSED',
}

// Brightness in 0–1; "target zone" mirrors backend thresholds: face_mean 85–195
const TARGET_LO = 85 / 255   // 0.333
const TARGET_HI = 195 / 255  // 0.765

export function drawLightingIndicator(
  ctx: CanvasRenderingContext2D,
  lighting: LightingState,
  w: number,
  h: number,
) {
  const PAD_X       = 10
  const PAD_Y       = 7
  const CARD_X      = 12
  const CARD_W      = 168
  const HEADER_H    = 18
  const BAR_LABEL_H = 14
  const BAR_H       = 8
  const ROW_H       = 14

  const warnings: { label: string; rgb: string }[] = []
  if (lighting.backlit)      warnings.push({ label: '⚠ BACKLIT',       rgb: C.backlit })
  if (lighting.harshShadow)  warnings.push({ label: '⚠ HARSH SHADOW',  rgb: C.harshShadow })

  const warnsBlockH = warnings.length > 0 ? 4 + warnings.length * ROW_H : 0
  const cardH = PAD_Y * 2 + HEADER_H + 4 + BAR_LABEL_H + BAR_H + warnsBlockH

  // Anchored at the very bottom of the safe area (card bottom = h).
  // Card grows upward as warnings stack.
  const CARD_Y = h - cardH

  // Pick exposure colour from the live state
  const statusRgb =
    lighting.exposure === 'good'         ? C.good
    : lighting.exposure === 'underexposed' ? C.under
    : C.over

  // Bar fill colour based on actual position
  const inTarget = lighting.faceBrightness >= TARGET_LO && lighting.faceBrightness <= TARGET_HI
  const fillRgb  = inTarget ? C.good : (lighting.faceBrightness < TARGET_LO ? C.under : C.over)

  const hasIssue =
    lighting.exposure !== 'good' || lighting.backlit || lighting.harshShadow

  ctx.save()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  // ── Card background ──────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.beginPath()
  ctx.roundRect(CARD_X, CARD_Y, CARD_W, cardH, 4)
  ctx.fill()

  // ── Card border (status-coloured) ────────────────────────────────────────
  ctx.strokeStyle = hasIssue ? `${statusRgb}0.55)` : `${C.good}0.45)`
  ctx.lineWidth = 0.75
  ctx.beginPath()
  ctx.roundRect(CARD_X, CARD_Y, CARD_W, cardH, 4)
  ctx.stroke()

  // ── Header: LIGHT  +  STATUS ─────────────────────────────────────────────
  let y = CARD_Y + PAD_Y
  ctx.font = `400 7px ${FONT}`
  ctx.fillStyle = `${C.label}0.4)`
  ctx.fillText('LIGHT', CARD_X + PAD_X, y)

  ctx.font = `700 10px ${FONT}`
  ctx.fillStyle = `${statusRgb}0.95)`
  ctx.shadowColor = `${statusRgb}0.5)`
  ctx.shadowBlur = 7
  ctx.fillText(STATUS_LABELS[lighting.exposure], CARD_X + PAD_X + 30, y)
  ctx.shadowBlur = 0

  // ── Separator ────────────────────────────────────────────────────────────
  y = CARD_Y + PAD_Y + HEADER_H + 2
  ctx.strokeStyle = `${statusRgb}0.25)`
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(CARD_X + PAD_X,         y)
  ctx.lineTo(CARD_X + CARD_W - PAD_X, y)
  ctx.stroke()

  // ── Brightness label + value ─────────────────────────────────────────────
  y += 6
  ctx.font = `400 8px ${FONT}`
  ctx.fillStyle = `${C.label}0.45)`
  ctx.fillText('BRIGHTNESS', CARD_X + PAD_X, y)

  const pct = Math.round(lighting.faceBrightness * 100)
  ctx.font = `700 8px ${FONT}`
  ctx.fillStyle = `${fillRgb}0.95)`
  ctx.shadowColor = `${fillRgb}0.4)`
  ctx.shadowBlur = 4
  ctx.textAlign = 'right'
  ctx.fillText(`${pct}%`, CARD_X + CARD_W - PAD_X, y)
  ctx.shadowBlur = 0
  ctx.textAlign = 'left'

  // ── Brightness bar ───────────────────────────────────────────────────────
  y += BAR_LABEL_H
  const BAR_X = CARD_X + PAD_X
  const BAR_W = CARD_W - PAD_X * 2

  // base track
  ctx.fillStyle = `${C.label}0.08)`
  ctx.beginPath()
  ctx.roundRect(BAR_X, y, BAR_W, BAR_H, 2)
  ctx.fill()

  // target-zone tint
  const targetStart = BAR_X + BAR_W * TARGET_LO
  const targetEnd   = BAR_X + BAR_W * TARGET_HI
  ctx.fillStyle = `${C.good}0.18)`
  ctx.fillRect(targetStart, y, targetEnd - targetStart, BAR_H)

  // fill (clamped 0–1)
  const fillW = BAR_W * Math.max(0, Math.min(1, lighting.faceBrightness))
  ctx.fillStyle = `${fillRgb}0.9)`
  ctx.shadowColor = `${fillRgb}0.55)`
  ctx.shadowBlur = 5
  ctx.beginPath()
  ctx.roundRect(BAR_X, y, fillW, BAR_H, 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // target-zone boundary ticks (subtle white verticals)
  ctx.strokeStyle = `${C.label}0.55)`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(targetStart, y - 1)
  ctx.lineTo(targetStart, y + BAR_H + 1)
  ctx.moveTo(targetEnd,   y - 1)
  ctx.lineTo(targetEnd,   y + BAR_H + 1)
  ctx.stroke()

  // ── Warning rows ─────────────────────────────────────────────────────────
  if (warnings.length > 0) {
    y += BAR_H + 4
    ctx.font = `700 8px ${FONT}`
    for (const warn of warnings) {
      ctx.fillStyle = `${warn.rgb}0.95)`
      ctx.shadowColor = `${warn.rgb}0.45)`
      ctx.shadowBlur = 5
      ctx.fillText(warn.label, CARD_X + PAD_X, y)
      ctx.shadowBlur = 0
      y += ROW_H
    }
  }

  ctx.restore()
}
