export function drawHudText(
  ctx: CanvasRenderingContext2D,
  text: string,
  opacity: number,
  w: number,
  h: number
) {
  if (opacity <= 0) return

  ctx.save()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'

  ctx.globalAlpha = opacity
  ctx.fillStyle = 'rgba(0, 220, 255, 0.9)'
  ctx.shadowColor = 'rgba(0, 220, 255, 0.5)'
  ctx.shadowBlur = 8
  ctx.font = '600 11px "SF Mono", "Courier New", monospace'
  ctx.fillText(text, w / 2, h * 0.72)

  ctx.restore()
}
