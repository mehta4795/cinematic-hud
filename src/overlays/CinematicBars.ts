export function drawCinematicBars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opacity: number  // 0–1; fade in/out
) {
  if (opacity <= 0) return

  // 2.39:1 anamorphic crop
  const targetH = w / 2.39
  const barH = (h - targetH) / 2

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, w, barH)
  ctx.fillRect(0, h - barH, w, barH)
  ctx.restore()
}
