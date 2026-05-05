export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  for (let i = 1; i <= 2; i++) {
    ctx.moveTo((w / 3) * i, 0)
    ctx.lineTo((w / 3) * i, h)
    ctx.moveTo(0, (h / 3) * i)
    ctx.lineTo(w, (h / 3) * i)
  }
  ctx.stroke()
  ctx.restore()
}
