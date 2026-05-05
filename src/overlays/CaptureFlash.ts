export function drawCaptureFlash(
  ctx: CanvasRenderingContext2D,
  flashOpacity: number,
  w: number,
  h: number
) {
  if (flashOpacity <= 0) return
  ctx.save()
  ctx.globalAlpha = flashOpacity
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}
