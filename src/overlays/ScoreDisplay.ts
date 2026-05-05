const SCENE_LABELS: Record<string, string> = {
  portrait:  'PORTRAIT',
  group:     'GROUP',
  close_up:  'CLOSE-UP',
  landscape: 'LANDSCAPE',
  general:   'SCENE',
}

export function drawScoreDisplay(
  ctx: CanvasRenderingContext2D,
  score: number,
  guidanceText: string,
  guidanceOpacity: number,
  aiConnected: boolean,
  sceneType: string,
  bestScore: number,
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
  ctx.shadowBlur = 5
  ctx.font = '400 8px "SF Mono", "Courier New", monospace'
  ctx.fillText(aiConnected ? 'AI LIVE' : 'AI OFFLINE', w - 14, h - 72)

  if (aiConnected) {
    // Scene type
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.font = '400 7px "SF Mono", "Courier New", monospace'
    ctx.fillText(SCENE_LABELS[sceneType] ?? 'SCENE', w - 14, h - 59)

    // Score label
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '400 8px "SF Mono", "Courier New", monospace'
    ctx.fillText('SHOT QUALITY', w - 14, h - 46)

    // Score value
    const scoreColor =
      score >= 75 ? 'rgba(0, 255, 120, 0.92)'
      : score >= 50 ? 'rgba(255, 210, 0, 0.92)'
      : 'rgba(255, 90, 70, 0.92)'
    ctx.fillStyle = scoreColor
    ctx.shadowColor = scoreColor
    ctx.shadowBlur = 6
    ctx.font = '700 16px "SF Mono", "Courier New", monospace'
    ctx.fillText(`${Math.round(score)}`, w - 14, h - 28)

    // Best score
    if (bestScore > 0) {
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = '400 7px "SF Mono", "Courier New", monospace'
      ctx.fillText(`BEST ${bestScore}`, w - 14, h - 14)
    }
  }

  // Guidance text — centered, cross-fades
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
