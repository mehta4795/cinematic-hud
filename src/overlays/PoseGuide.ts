import type { PoseLandmark } from '../types/overlay'

const VIS_MIN = 0.5
const FONT    = '"SF Mono", "Courier New", monospace'

// Shoulder line body marker only shown above this tilt (degrees)
const SHOULDER_MARKER_DEG = 8

const POSE_LABELS: Record<string, string> = {
  standing: 'STANDING',
  sitting:  'SITTING',
  walking:  'WALKING',
  jumping:  'JUMPING',
  general:  'POSE DETECTED',
}

const ISSUE_LABELS: Record<string, string> = {
  leaning:           'LEANING',
  out_of_frame:      'OUT OF FRAME',
  head_tilted:       'HEAD TILTED',
  not_facing_camera: 'LOOK AT CAMERA',
}

export function drawPoseGuide(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  poseType: string,
  poseIssues: string[],
  w: number,
  h: number
) {
  if (landmarks.length === 0) return

  const byIdx = new Map(landmarks.map(lm => [lm.idx, {
    ...lm,
    x: (lm as any)._sx ?? lm.x,
    y: (lm as any)._sy ?? lm.y,
  }]))

  const amber = 'rgba(255, 180, 0,'
  const cyan  = 'rgba(0, 220, 255,'
  const green = 'rgba(0, 220, 120,'

  // ── Shoulder tilt (computed live from landmarks) ───────────────────────────
  const ls = byIdx.get(11)
  const rs = byIdx.get(12)
  let shoulderTiltDeg = 0
  let shouldersVisible = false

  if (ls && rs && ls.vis >= VIS_MIN && rs.vis >= VIS_MIN) {
    shouldersVisible = true
    const lsx = ls.x * w, lsy = ls.y * h
    const rsx = rs.x * w, rsy = rs.y * h
    // Use absolute dx/dy so the sign of (rsx - lsx) doesn't matter —
    // landmark 11 can appear on either side depending on camera mirroring.
    const dx = Math.abs(rsx - lsx)
    const dy = Math.abs(rsy - lsy)
    shoulderTiltDeg = dx > 1 ? Math.atan2(dy, dx) * 180 / Math.PI : 0
  }

  const hasIssues = poseIssues.filter(k => k !== 'uneven_shoulders').length > 0
    || (shouldersVisible && shoulderTiltDeg >= SHOULDER_MARKER_DEG)

  ctx.save()

  // ── Body indicators ────────────────────────────────────────────────────────

  // Shoulder tilt line — only above the higher threshold
  if (shouldersVisible && shoulderTiltDeg >= SHOULDER_MARKER_DEG) {
    const lsx = ls!.x * w, lsy = ls!.y * h
    const rsx = rs!.x * w, rsy = rs!.y * h

    ctx.lineWidth = 2
    ctx.setLineDash([5, 4])
    ctx.strokeStyle = `${amber}0.85)`
    ctx.shadowColor = `${amber}0.4)`
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.moveTo(lsx, lsy)
    ctx.lineTo(rsx, rsy)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.shadowBlur = 0

    for (const [px, py] of [[lsx, lsy], [rsx, rsy]] as [number, number][]) {
      ctx.lineWidth = 2
      ctx.strokeStyle = `${amber}0.85)`
      ctx.beginPath()
      ctx.moveTo(px, py - 8)
      ctx.lineTo(px, py + 8)
      ctx.stroke()
    }
  }

  // Lean reference
  if (poseIssues.includes('leaning') && ls && rs && ls.vis >= VIS_MIN && rs.vis >= VIS_MIN) {
    const lh = byIdx.get(23)
    const rh = byIdx.get(24)
    const midX = ((ls.x + rs.x) / 2) * w
    const topY = Math.min(ls.y, rs.y) * h - 20
    const botY = lh && rh ? ((lh.y + rh.y) / 2) * h + 20 : topY + 130

    ctx.lineWidth = 1.5
    ctx.strokeStyle = `${amber}0.65)`
    ctx.shadowColor = `${amber}0.35)`
    ctx.shadowBlur = 4
    ctx.setLineDash([4, 5])
    ctx.beginPath()
    ctx.moveTo(midX, topY)
    ctx.lineTo(midX, botY)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.shadowBlur = 0
    ctx.setLineDash([3, 6])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(w / 2, topY)
    ctx.lineTo(w / 2, botY)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Head tilt arc
  if (poseIssues.includes('head_tilted')) {
    const nose = byIdx.get(0)
    if (nose && nose.vis >= VIS_MIN) {
      const nx = nose.x * w
      const ny = nose.y * h
      ctx.strokeStyle = `${amber}0.8)`
      ctx.shadowColor = `${amber}0.4)`
      ctx.shadowBlur = 6
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(nx, ny - 34, 16, -Math.PI * 0.75, -Math.PI * 0.25)
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }

  // Out-of-frame arrow
  if (poseIssues.includes('out_of_frame')) {
    const lowestVis = landmarks.reduce(
      (max, lm) => lm.vis >= 0.3 && lm.y > max ? lm.y : max, 0
    )
    if (lowestVis > 0.88) {
      const ax = w / 2, ay = h - 16
      ctx.fillStyle = `${amber}0.85)`
      ctx.shadowColor = `${amber}0.5)`
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.moveTo(ax, ay + 9)
      ctx.lineTo(ax - 8, ay)
      ctx.lineTo(ax + 8, ay)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }

  // ── Pose info card (top-left) ─────────────────────────────────────────────
  const PAD_X  = 10
  const PAD_Y  = 7
  const CARD_X = 12
  const CARD_Y = 12
  const ROW_H  = 14

  // Shoulder row always present when visible; other issues below
  const otherIssues = poseIssues.filter(k => k !== 'uneven_shoulders').slice(0, 2)
  const rowCount = (shouldersVisible ? 1 : 0) + otherIssues.length
  const cardH = PAD_Y * 2 + 18 + (rowCount > 0 ? 4 + rowCount * ROW_H : 0)
  const cardW = 152

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.52)'
  ctx.beginPath()
  ctx.roundRect(CARD_X, CARD_Y, cardW, cardH, 4)
  ctx.fill()

  // Border — amber if any real issue, cyan otherwise
  const borderColor = hasIssues ? `${amber}0.5)` : `${cyan}0.3)`
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 0.75
  ctx.beginPath()
  ctx.roundRect(CARD_X, CARD_Y, cardW, cardH, 4)
  ctx.stroke()

  // Section label
  ctx.font = `400 7px ${FONT}`
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.fillStyle = hasIssues ? `${amber}0.5)` : `${cyan}0.3)`
  ctx.fillText('POSE', CARD_X + PAD_X, CARD_Y + PAD_Y)

  // Pose type
  const poseLabel = POSE_LABELS[poseType] ?? 'POSE'
  ctx.font = `600 10px ${FONT}`
  ctx.fillStyle = hasIssues ? `${amber}0.92)` : `${cyan}0.88)`
  ctx.shadowColor = hasIssues ? `${amber}0.45)` : `${cyan}0.4)`
  ctx.shadowBlur = 6
  ctx.fillText(poseLabel, CARD_X + PAD_X + 30, CARD_Y + PAD_Y)
  ctx.shadowBlur = 0

  // Separator
  if (rowCount > 0) {
    const sepY = CARD_Y + PAD_Y + 18 + 2
    ctx.strokeStyle = hasIssues ? `${amber}0.25)` : `${cyan}0.15)`
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(CARD_X + PAD_X, sepY)
    ctx.lineTo(CARD_X + cardW - PAD_X, sepY)
    ctx.stroke()

    let rowY = sepY + 6
    ctx.font = `400 8px ${FONT}`

    // Shoulder level row — always shown when shoulders visible
    if (shouldersVisible) {
      const isShoulderIssue = poseIssues.includes('uneven_shoulders')
      const tiltStr = shoulderTiltDeg < 1.5
        ? 'LEVEL'
        : `${shoulderTiltDeg.toFixed(1)}°`

      // Label
      ctx.fillStyle = isShoulderIssue ? `${amber}0.6)` : `${cyan}0.45)`
      ctx.fillText('SHOULDERS', CARD_X + PAD_X, rowY)

      // Value — right-aligned inside card
      const valX = CARD_X + cardW - PAD_X
      ctx.textAlign = 'right'
      if (isShoulderIssue) {
        ctx.fillStyle = `${amber}0.92)`
        ctx.shadowColor = `${amber}0.4)`
        ctx.shadowBlur = 4
      } else {
        ctx.fillStyle = shoulderTiltDeg < 1.5 ? `${green}0.85)` : `${amber}0.7)`
        ctx.shadowBlur = 0
      }
      ctx.fillText(tiltStr, valX, rowY)
      ctx.shadowBlur = 0
      ctx.textAlign = 'left'
      rowY += ROW_H
    }

    // Other issues
    for (const issue of otherIssues) {
      const text = ISSUE_LABELS[issue] ?? issue.replace(/_/g, ' ').toUpperCase()
      ctx.fillStyle = `${amber}0.88)`
      ctx.shadowColor = `${amber}0.35)`
      ctx.shadowBlur = 4
      ctx.fillText(`› ${text}`, CARD_X + PAD_X, rowY)
      ctx.shadowBlur = 0
      rowY += ROW_H
    }
  }

  ctx.restore()
}
