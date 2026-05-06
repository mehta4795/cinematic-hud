export function drawClaudeAnalysis(
  ctx: CanvasRenderingContext2D,
  analysis: { headline: string; topTips: string[] },
  opacity: number,
  w: number,
  h: number,
) {
  ctx.save()

  const padding = 10
  const lineH = 16
  const cardH = 18 + 16 + analysis.topTips.length * lineH + padding
  const cardW = w - 28
  const cardX = 14
  const cardY = h * 0.58 - cardH

  // Background
  ctx.globalAlpha = opacity * 0.82
  ctx.fillStyle = 'rgba(0, 8, 20, 0.85)'
  ctx.beginPath()
  ctx.roundRect(cardX, cardY, cardW, cardH, 4)
  ctx.fill()

  // Border
  ctx.globalAlpha = opacity * 0.5
  ctx.strokeStyle = 'rgba(80, 180, 255, 0.55)'
  ctx.lineWidth = 0.5
  ctx.stroke()

  ctx.globalAlpha = opacity

  // Header label
  ctx.font = '600 7px "SF Mono", "Courier New", monospace'
  ctx.fillStyle = 'rgba(80, 180, 255, 0.9)'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('✦ CLAUDE ANALYSIS', cardX + padding, cardY + padding)

  // Headline
  ctx.font = '600 10px "SF Mono", "Courier New", monospace'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.fillText(analysis.headline.toUpperCase(), cardX + padding, cardY + padding + 16)

  // Top tips
  analysis.topTips.forEach((tip, i) => {
    ctx.font = '400 8.5px "SF Mono", "Courier New", monospace'
    ctx.fillStyle = 'rgba(160, 230, 160, 0.88)'
    ctx.fillText(`→ ${tip}`, cardX + padding, cardY + padding + 32 + i * lineH)
  })

  ctx.restore()
}
