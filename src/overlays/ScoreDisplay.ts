export function drawScoreDisplay(
  ctx: CanvasRenderingContext2D,
  score: number,
  guidanceText: string,
  guidanceOpacity: number,
  aiConnected: boolean,
  w: number,
  h: number
) {
  ctx.save()
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'right'

  // AI status dot
  const statusColor = aiConnected ? 'rgba(0, 255, 120, 0.85)' : 'rgba(255, 80, 80, 0.75)'
  ctx.fillStyle = statusColor
  ctx.shadowColor = statusColor
  ctx.shadowBlur = 6
  ctx.font = '400 8px "SF Mono", "Courier New", monospace'
  ctx.fillText(aiConnected ? 'AI LIVE' : 'AI OFFLINE', w - 14, h - 56)

  if (aiConnected) {
    // Score label
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '400 8px "SF Mono", "Courier New", monospace'
    ctx.fillText('COMPOSITION', w - 14, h - 44)

    // Score value — colour shifts green/yellow/red
    const scoreColor =
      score >= 75
        ? 'rgba(0, 255, 120, 0.9)'
        : score >= 50
        ? 'rgba(255, 210, 0, 0.9)'
        : 'rgba(255, 90, 70, 0.9)'
    ctx.fillStyle = scoreColor
    ctx.shadowColor = scoreColor
    ctx.shadowBlur = 5
    ctx.font = '600 14px "SF Mono", "Courier New", monospace'
    ctx.fillText(`${Math.round(score)}%`, w - 14, h - 28)
  }

  // Guidance text — centered, fades in/out
  if (guidanceOpacity > 0 && guidanceText) {
    ctx.globalAlpha = guidanceOpacity
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255, 220, 0, 0.95)'
    ctx.shadowColor = 'rgba(255, 220, 0, 0.5)'
    ctx.shadowBlur = 8
    ctx.font = '500 10px "SF Mono", "Courier New", monospace'
    ctx.fillText(guidanceText.toUpperCase(), w / 2, h - 14)
  }

  ctx.restore()
}
