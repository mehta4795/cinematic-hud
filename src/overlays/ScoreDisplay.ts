const SCENE_LABELS: Record<string, string> = {
  portrait:  'PORTRAIT',
  group:     'GROUP',
  close_up:  'CLOSE-UP',
  landscape: 'LANDSCAPE',
  general:   'SCENE',
}

// Distinct accent colour per scene type so the tag carries information at a glance
const SCENE_COLORS: Record<string, string> = {
  portrait:  'rgba(0, 220, 255,',     // cyan
  group:     'rgba(60, 220, 200,',    // teal
  close_up:  'rgba(255, 100, 180,',   // hot pink
  landscape: 'rgba(255, 180, 80,',    // amber
  general:   'rgba(200, 200, 200,',   // grey
}

const FONT = '"SF Mono", "Courier New", monospace'

export function drawScoreDisplay(
  ctx: CanvasRenderingContext2D,
  score: number,
  guidanceText: string,
  guidanceOpacity: number,
  aiConnected: boolean,
  sceneType: string,
  bestScore: number,
  w: number,
  h: number,
) {
  ctx.save()
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'right'

  if (aiConnected) {
    // ── Scene-type pill ───────────────────────────────────────────────────
    const sceneLabel = SCENE_LABELS[sceneType] ?? 'SCENE'
    const sceneRgb   = SCENE_COLORS[sceneType] ?? SCENE_COLORS.general

    ctx.font = `700 11px ${FONT}`
    const PAD_X = 9
    const PILL_H = 20
    const textW = ctx.measureText(sceneLabel).width
    const pillW = Math.ceil(textW) + PAD_X * 2
    const pillX = w - 14 - pillW
    const pillY = h - 110 - PILL_H

    // background
    ctx.fillStyle = `${sceneRgb}0.22)`
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, PILL_H, 10)
    ctx.fill()

    // border
    ctx.strokeStyle = `${sceneRgb}0.6)`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, PILL_H, 10)
    ctx.stroke()

    // text
    ctx.fillStyle   = `${sceneRgb}0.98)`
    ctx.shadowColor = `${sceneRgb}0.55)`
    ctx.shadowBlur  = 8
    ctx.textBaseline = 'middle'
    ctx.textAlign    = 'center'
    ctx.fillText(sceneLabel, pillX + pillW / 2, pillY + PILL_H / 2 + 0.5)
    ctx.shadowBlur = 0

    // restore baseline / align for the rest of the right column
    ctx.textBaseline = 'bottom'
    ctx.textAlign    = 'right'

    // ── Score (label + value share the same colour band) ──────────────────
    const scoreRgb =
      score >= 85 ? 'rgba(0, 255, 120,'      // bright green — excellent
      : score >= 70 ? 'rgba(120, 255, 200,'  // mint — good
      : score >= 50 ? 'rgba(255, 210, 0,'    // amber — okay
      : score >= 30 ? 'rgba(255, 140, 60,'   // orange — needs work
      : 'rgba(255, 80, 100,'                  // hot red — poor

    // ── Score label — tinted to match score colour ────────────────────────
    ctx.fillStyle   = `${scoreRgb}0.72)`
    ctx.shadowColor = `${scoreRgb}0.4)`
    ctx.shadowBlur  = 5
    ctx.font = `700 8px ${FONT}`
    ctx.fillText('SHOT QUALITY', w - 14, h - 92)
    ctx.shadowBlur = 0

    // ── Score value — bigger, more glow ──────────────────────────────────
    ctx.fillStyle   = `${scoreRgb}0.98)`
    ctx.shadowColor = `${scoreRgb}0.7)`
    ctx.shadowBlur  = 14
    ctx.font = `800 26px ${FONT}`
    ctx.fillText(`${Math.round(score)}`, w - 14, h - 62)
    ctx.shadowBlur = 0
  }

  // ── Guidance text — centered, floating above the capture button.
  if (guidanceOpacity > 0 && guidanceText) {
    const text = guidanceText.toUpperCase()

    ctx.globalAlpha  = guidanceOpacity
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 18px ${FONT}`

    const tx = w / 2
    const ty = h - 120

    // No border, no fill — just floating text with strong glow so it
    // stays legible over the live video.
    ctx.fillStyle   = 'rgba(255, 240, 90, 1)'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
    ctx.shadowBlur  = 6
    ctx.fillText(text, tx, ty + 1)

    // Second pass with the yellow glow on top of the dark halo
    ctx.shadowColor = 'rgba(255, 220, 0, 0.75)'
    ctx.shadowBlur  = 16
    ctx.fillText(text, tx, ty + 1)
    ctx.shadowBlur  = 0
  }

  ctx.restore()
}
