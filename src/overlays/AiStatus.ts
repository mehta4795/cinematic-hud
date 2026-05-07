// AI Coach status indicator — top-right corner, visible green / red dot
// + "AI COACH LIVE" / "AI COACH OFFLINE" label.
const FONT = '"SF Mono", "Courier New", monospace'

export function drawAiStatus(
  ctx: CanvasRenderingContext2D,
  aiConnected: boolean,
  w: number,
  _h: number,
) {
  const dotColor   = aiConnected ? 'rgba(0, 255, 120,' : 'rgba(255, 80, 80,'
  const labelColor = aiConnected ? 'rgba(0, 255, 120,' : 'rgba(255, 100, 100,'
  const label      = aiConnected ? 'AI COACH LIVE' : 'AI COACH OFFLINE'

  const RIGHT_PAD = 14
  const TOP_PAD   = 16
  const DOT_R     = 4.5

  ctx.save()
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'middle'
  ctx.font = `700 10px ${FONT}`

  const labelX = w - RIGHT_PAD
  const labelY = TOP_PAD + DOT_R

  // Label
  ctx.fillStyle   = `${labelColor}0.95)`
  ctx.shadowColor = `${labelColor}0.5)`
  ctx.shadowBlur  = 8
  ctx.fillText(label, labelX, labelY)
  ctx.shadowBlur = 0

  // Dot — placed to the LEFT of the label, with a small gap
  const labelW = ctx.measureText(label).width
  const dotX   = labelX - labelW - 8
  const dotY   = labelY

  // Outer glow / halo
  ctx.fillStyle   = `${dotColor}0.18)`
  ctx.shadowColor = `${dotColor}0.7)`
  ctx.shadowBlur  = 12
  ctx.beginPath()
  ctx.arc(dotX, dotY, DOT_R + 2, 0, Math.PI * 2)
  ctx.fill()

  // Solid dot
  ctx.fillStyle   = `${dotColor}1)`
  ctx.shadowColor = `${dotColor}0.85)`
  ctx.shadowBlur  = 8
  ctx.beginPath()
  ctx.arc(dotX, dotY, DOT_R, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.restore()
}
