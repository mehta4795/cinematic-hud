import type { ExpressionState } from '../types/overlay'

const FONT = '"SF Mono", "Courier New", monospace'

// Trimmed channel set — only the three the user wants visible.
// `brow` and `mouth` still flow into state from the backend; they're just
// not rendered here.
const ROWS: {
  key: keyof ExpressionState
  label: string
  rgb: string
  emphasis?: boolean
  alwaysShow?: boolean       // pin to the bar group regardless of value
}[] = [
  { key: 'smile', label: 'SMILE',    rgb: 'rgba(255, 215, 60,', alwaysShow: true                  }, // bright golden-yellow — always on
  { key: 'pout',  label: 'DUCKFACE', rgb: 'rgba(255, 30, 230,', emphasis: true                    }, // electric magenta — extra prominence
]

const ACTIVE_THRESHOLD = 0.10
const LABEL_DIM        = 'rgba(255, 255, 255,'
const TEXT_HALO        = 'rgba(0, 0, 0, 0.75)'

export function drawExpressionMeter(
  ctx: CanvasRenderingContext2D,
  expression: ExpressionState | null,
  _w: number,
  _h: number,
) {
  if (!expression) return

  // `alwaysShow` channels are pinned to the bar group at all times, even
  // when their value is 0 — the bar just renders as an empty track.
  const active   = ROWS.filter(r => r.alwaysShow || expression[r.key] >= ACTIVE_THRESHOLD)
  const inactive = ROWS.filter(r => !r.alwaysShow && expression[r.key] <  ACTIVE_THRESHOLD)

  const hasBars   = active.length   > 0
  const hasLegend = inactive.length > 0
  if (!hasBars && !hasLegend) return

  // Compact sizing
  const PAD_X         = 12
  const PAD_Y         = 10
  const COL_W         = 52       // wide enough for "DUCKFACE" at the larger label size
  const BAR_W         = 8
  const BAR_H         = 96
  const HEADER_H      = 13
  const PCT_H         = 12
  const LABEL_H       = 12
  const BAR_TOP_GAP   = 6
  const BAR_BOT_GAP   = 8
  const LEGEND_GAP    = 8
  const LEGEND_ROW_H  = 14

  const CARD_X = 12
  const CARD_Y = 130

  ctx.save()

  // ── Measure widest legend label so the card sizes correctly ──────────
  ctx.font = `700 11px ${FONT}`
  let maxLegendLabelW = 0
  for (const r of inactive) {
    const w = ctx.measureText(r.label).width
    if (w > maxLegendLabelW) maxLegendLabelW = w
  }

  const barsBlockW   = active.length * COL_W
  const barsBlockH   = PCT_H + BAR_TOP_GAP + BAR_H + BAR_BOT_GAP + LABEL_H
  const legendBlockH = hasLegend ? inactive.length * LEGEND_ROW_H : 0

  const cardW = Math.max(
                  maxLegendLabelW + PAD_X * 2,
                  barsBlockW      + PAD_X * 2,
                  80,
                )

  const cardH = PAD_Y * 2
              + HEADER_H + 4
              + (hasBars   ? barsBlockH + (hasLegend ? LEGEND_GAP : 0) : 0)
              + legendBlockH

  // ── Very soft transparent block — barely visible fill, hairline border
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
  ctx.beginPath()
  ctx.roundRect(CARD_X, CARD_Y, cardW, cardH, 6)
  ctx.fill()

  ctx.strokeStyle = `${LABEL_DIM}0.10)`
  ctx.lineWidth   = 0.5
  ctx.beginPath()
  ctx.roundRect(CARD_X, CARD_Y, cardW, cardH, 6)
  ctx.stroke()

  // ── Header ───────────────────────────────────────────────────────────
  ctx.font         = `700 9px ${FONT}`
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle    = `${LABEL_DIM}0.55)`
  ctx.shadowColor  = TEXT_HALO
  ctx.shadowBlur   = 5
  ctx.fillText('EXPRESSION', CARD_X + PAD_X, CARD_Y + PAD_Y + HEADER_H / 2)
  ctx.shadowBlur = 0

  // ── Active bars ──────────────────────────────────────────────────────
  if (hasBars) {
    const barsStartX = CARD_X + (cardW - barsBlockW) / 2
    const blockTop   = CARD_Y + PAD_Y + HEADER_H + 4
    const pctY       = blockTop + PCT_H / 2 + 1
    const barTop     = blockTop + PCT_H + BAR_TOP_GAP
    const barBottom  = barTop + BAR_H
    const labelY     = barBottom + BAR_BOT_GAP + LABEL_H / 2

    for (let i = 0; i < active.length; i++) {
      const { key, label, rgb, emphasis } = active[i]
      const v   = Math.max(0, Math.min(1, expression[key]))
      const pct = Math.round(v * 100)
      const cx  = barsStartX + i * COL_W + COL_W / 2

      // Emphasized channels (e.g. DUCKFACE) get extra visual punch
      const barLocalW = emphasis ? BAR_W + 2 : BAR_W
      const fillBlur  = emphasis ? 14 : 8
      const pctBlur   = emphasis ? 8  : 4
      const labelBlur = emphasis ? 7  : 4

      // Percentage above
      ctx.font         = `800 11px ${FONT}`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle    = `${rgb}0.98)`
      ctx.shadowColor  = `${rgb}0.6)`
      ctx.shadowBlur   = pctBlur
      ctx.fillText(`${pct}%`, cx, pctY)
      ctx.shadowBlur = 0

      // Track (slightly wider for emphasized channels)
      const barX   = cx - barLocalW / 2
      const trackR = barLocalW / 2
      ctx.fillStyle = `${LABEL_DIM}${emphasis ? 0.16 : 0.12})`
      ctx.beginPath()
      ctx.roundRect(barX, barTop, barLocalW, BAR_H, trackR)
      ctx.fill()

      // Outer halo behind emphasized bar — subtle ring of accent colour
      // around the entire track to draw the eye even when value is low.
      if (emphasis) {
        ctx.strokeStyle = `${rgb}0.5)`
        ctx.lineWidth   = 1
        ctx.shadowColor = `${rgb}0.6)`
        ctx.shadowBlur  = 10
        ctx.beginPath()
        ctx.roundRect(barX, barTop, barLocalW, BAR_H, trackR)
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Fill from the bottom up
      const fillH = BAR_H * v
      if (fillH > 0.5) {
        const fillTopY = barBottom - fillH
        const fillR    = Math.min(trackR, fillH / 2)
        ctx.fillStyle   = `${rgb}${emphasis ? 1 : 0.96})`
        ctx.shadowColor = `${rgb}${emphasis ? 0.85 : 0.6})`
        ctx.shadowBlur  = fillBlur
        ctx.beginPath()
        ctx.roundRect(barX, fillTopY, barLocalW, fillH, fillR)
        ctx.fill()
        // Second pass for emphasized — extra punch through stacked glow
        if (emphasis) {
          ctx.shadowBlur = fillBlur / 2
          ctx.fill()
        }
        ctx.shadowBlur = 0
      }

      // Label
      ctx.font         = `${emphasis ? 800 : 700} 10px ${FONT}`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle    = `${rgb}${emphasis ? 1 : 0.95})`
      ctx.shadowColor  = emphasis ? `${rgb}0.7)` : TEXT_HALO
      ctx.shadowBlur   = labelBlur + 2
      ctx.fillText(label, cx, labelY)
      ctx.shadowBlur = 0
    }
  }

  // ── Stacked legend — one inactive channel per row, centred ──────────
  if (hasLegend) {
    const legendBlockTop = CARD_Y + cardH - PAD_Y - legendBlockH
    const cardCenterX    = CARD_X + cardW / 2

    ctx.font         = `700 11px ${FONT}`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor  = TEXT_HALO
    ctx.shadowBlur   = 5

    for (let i = 0; i < inactive.length; i++) {
      const row = inactive[i]
      const rowCenterY = legendBlockTop + i * LEGEND_ROW_H + LEGEND_ROW_H / 2
      ctx.fillStyle = `${row.rgb}0.65)`
      ctx.fillText(row.label, cardCenterX, rowCenterY)
    }

    ctx.shadowBlur = 0
  }

  ctx.restore()
}
