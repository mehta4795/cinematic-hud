import type { FaceData } from '../types/overlay'

export function drawFaceGuides(
  ctx: CanvasRenderingContext2D,
  faces: FaceData[],
  w: number,
  h: number
) {
  if (faces.length === 0) return

  ctx.save()

  for (const face of faces) {
    const fx = face.smoothCx * w
    const fy = face.smoothCy * h
    const fw = face.w * w
    const fh = face.h * h

    // Oval framing
    ctx.strokeStyle = 'rgba(255, 220, 0, 0.45)'
    ctx.lineWidth = 1
    ctx.shadowColor = 'rgba(255, 220, 0, 0.3)'
    ctx.shadowBlur = 4
    ctx.beginPath()
    ctx.ellipse(fx, fy, fw * 0.55, fh * 0.65, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Eye-line guide
    ctx.setLineDash([3, 5])
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    ctx.moveTo(fx - fw * 0.9, fy - fh * 0.1)
    ctx.lineTo(fx + fw * 0.9, fy - fh * 0.1)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }

  ctx.restore()
}
