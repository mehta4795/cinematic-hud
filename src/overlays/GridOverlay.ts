export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  for (let i = 1; i <= 2; i++) {
    ctx.moveTo((w / 3) * i, 0)
    ctx.lineTo((w / 3) * i, h)
    ctx.moveTo(0, (h / 3) * i)
    ctx.lineTo(w, (h / 3) * i)
  }
  ctx.stroke()

  // Cinematic sweet-spot dots at thirds intersections
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.shadowColor = 'rgba(255, 255, 255, 0.15)'
  ctx.shadowBlur = 3
  for (let i = 1; i <= 2; i++) {
    for (let j = 1; j <= 2; j++) {
      ctx.beginPath()
      ctx.arc((w / 3) * i, (h / 3) * j, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}
