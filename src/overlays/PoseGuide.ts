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
  general:  '',         // hide the big title for unclassified pose
}

// Distinct accent colour per pose type — bright, saturated palette so the
// card pops at a glance rather than reading as a flat dull panel.
const POSE_COLORS: Record<string, string> = {
  standing: 'rgba(60, 235, 255,',    // electric cyan
  sitting:  'rgba(220, 130, 255,',   // vivid purple
  walking:  'rgba(80, 245, 130,',    // bright emerald
  jumping:  'rgba(255, 100, 200,',   // vivid magenta
  general:  'rgba(80, 235, 210,',    // vivid aqua-teal (was warm gold / dull yellow)
}

const ISSUE_LABELS: Record<string, string> = {
  leaning:           'LEANING',
  out_of_frame:      'OUT OF FRAME',
  head_tilted:       'HEAD TILTED',
  not_facing_camera: 'LOOK AT CAMERA',
}

const amber = 'rgba(255, 180, 0,'
const green = 'rgba(0, 230, 130,'

export function drawPoseGuide(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  poseType: string,
  poseIssues: string[],
  w: number,
  h: number,
) {
  if (landmarks.length === 0) return

  const byIdx = new Map(landmarks.map(lm => [lm.idx, {
    ...lm,
    x: (lm as any)._sx ?? lm.x,
    y: (lm as any)._sy ?? lm.y,
  }]))

  // ── Shoulder tilt (computed live from landmarks) ───────────────────────
  const ls = byIdx.get(11)
  const rs = byIdx.get(12)
  let shoulderTiltDeg = 0
  let shouldersVisible = false

  if (ls && rs && ls.vis >= VIS_MIN && rs.vis >= VIS_MIN) {
    shouldersVisible = true
    const lsx = ls.x * w, lsy = ls.y * h
    const rsx = rs.x * w, rsy = rs.y * h
    const dx = Math.abs(rsx - lsx)
    const dy = Math.abs(rsy - lsy)
    shoulderTiltDeg = dx > 1 ? Math.atan2(dy, dx) * 180 / Math.PI : 0
  }

  const otherIssues = poseIssues.filter(k => k !== 'uneven_shoulders').slice(0, 2)
  const hasIssues = otherIssues.length > 0
    || (shouldersVisible && shoulderTiltDeg >= SHOULDER_MARKER_DEG)

  ctx.save()

  // ── Body indicators ────────────────────────────────────────────────────

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

  // ── Pose info card (top-left) — compact but readable ────────────────
  const PAD_X      = 12
  const PAD_Y      = 10
  const CARD_X     = 12
  const CARD_Y     = 12
  const HEADER_H   = 12
  const TITLE_H    = 22
  const ROW_H      = 18

  // Title row only renders when we have a meaningful pose label.
  const poseLabel = POSE_LABELS[poseType] ?? ''
  const showTitle = poseLabel.length > 0

  const rowCount   = (shouldersVisible ? 1 : 0) + otherIssues.length
  const cardW      = 188
  const cardH      = PAD_Y * 2 + HEADER_H +
                     (showTitle ? 3 + TITLE_H : 0) +
                     (rowCount > 0 ? 6 + rowCount * ROW_H : 0)

  // Pick accent colour: red-amber when issues, else pose-type colour
  const poseRgb   = POSE_COLORS[poseType] ?? POSE_COLORS.general
  const accentRgb = hasIssues ? amber : poseRgb

  // ── Translucent background — dark enough that the words pop, but you
  //    can still see through to the video. Plus a faint accent tint.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.beginPath()
  ctx.roundRect(CARD_X, CARD_Y, cardW, cardH, 6)
  ctx.fill()

  ctx.fillStyle = `${accentRgb}0.08)`
  ctx.beginPath()
  ctx.roundRect(CARD_X, CARD_Y, cardW, cardH, 6)
  ctx.fill()

  // ── Bold glowing border ──────────────────────────────────────────────
  ctx.strokeStyle = `${accentRgb}0.95)`
  ctx.lineWidth   = 2
  ctx.shadowColor = `${accentRgb}0.75)`
  ctx.shadowBlur  = 16
  ctx.beginPath()
  ctx.roundRect(CARD_X, CARD_Y, cardW, cardH, 6)
  ctx.stroke()
  ctx.shadowBlur = 0

  // ── Vertical accent stripe on the left edge ──────────────────────────
  ctx.fillStyle   = `${accentRgb}1)`
  ctx.shadowColor = `${accentRgb}0.85)`
  ctx.shadowBlur  = 12
  ctx.beginPath()
  ctx.roundRect(CARD_X + 1, CARD_Y + 6, 4, cardH - 12, 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // ── Header caption: status dot + "POSE" ──────────────────────────────
  ctx.textBaseline = 'top'
  ctx.textAlign    = 'left'

  const dotX = CARD_X + PAD_X + 5
  const dotY = CARD_Y + PAD_Y + 5
  ctx.fillStyle   = `${accentRgb}1)`
  ctx.shadowColor = `${accentRgb}0.9)`
  ctx.shadowBlur  = 10
  ctx.beginPath()
  ctx.arc(dotX, dotY, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.font = `800 10px ${FONT}`
  ctx.fillStyle = `${accentRgb}1)`
  ctx.shadowColor = `${accentRgb}0.7)`
  ctx.shadowBlur  = 8
  ctx.fillText('POSE', CARD_X + PAD_X + 14, CARD_Y + PAD_Y + 1)
  ctx.shadowBlur = 0

  // ── Big pose-type title (only when we have one to show) ─────────────
  const titleY = CARD_Y + PAD_Y + HEADER_H + 4

  if (showTitle) {
    ctx.font = `800 17px ${FONT}`
    ctx.fillStyle   = `${accentRgb}1)`
    ctx.shadowColor = `${accentRgb}1)`
    ctx.shadowBlur  = 18
    ctx.fillText(poseLabel, CARD_X + PAD_X, titleY)
    ctx.shadowBlur  = 10
    ctx.fillText(poseLabel, CARD_X + PAD_X, titleY)
    // Third pass for an extra-crisp top layer
    ctx.shadowBlur  = 4
    ctx.fillText(poseLabel, CARD_X + PAD_X, titleY)
    ctx.shadowBlur  = 0
  }

  // ── Separator + rows ─────────────────────────────────────────────────
  if (rowCount > 0) {
    const sepY = showTitle ? titleY + TITLE_H : CARD_Y + PAD_Y + HEADER_H + 4
    ctx.strokeStyle = `${accentRgb}0.3)`
    ctx.lineWidth = 0.75
    ctx.beginPath()
    ctx.moveTo(CARD_X + PAD_X, sepY)
    ctx.lineTo(CARD_X + cardW - PAD_X, sepY)
    ctx.stroke()

    let rowY = sepY + 6

    // Shoulder row — always shown when shoulders visible
    if (shouldersVisible) {
      const isShoulderIssue = poseIssues.includes('uneven_shoulders')
      const tiltStr = shoulderTiltDeg < 1.5
        ? 'LEVEL'
        : `${shoulderTiltDeg.toFixed(1)}°`

      // left label
      ctx.font = `700 10px ${FONT}`
      ctx.textAlign = 'left'
      ctx.fillStyle   = isShoulderIssue ? `${amber}1)` : `${accentRgb}0.98)`
      ctx.shadowColor = isShoulderIssue ? `${amber}0.6)` : `${accentRgb}0.55)`
      ctx.shadowBlur  = 6
      ctx.fillText('SHOULDERS', CARD_X + PAD_X, rowY)
      ctx.shadowBlur = 0

      // right value
      const valRgb = isShoulderIssue
        ? amber
        : (shoulderTiltDeg < 1.5 ? green : amber)
      ctx.font = `800 12px ${FONT}`
      ctx.textAlign = 'right'
      ctx.fillStyle   = `${valRgb}0.98)`
      ctx.shadowColor = `${valRgb}0.6)`
      ctx.shadowBlur  = 7
      ctx.fillText(tiltStr, CARD_X + cardW - PAD_X, rowY - 1)
      ctx.shadowBlur = 0
      ctx.textAlign = 'left'

      rowY += ROW_H
    }

    // Other issue rows
    for (const issue of otherIssues) {
      const text = ISSUE_LABELS[issue] ?? issue.replace(/_/g, ' ').toUpperCase()
      ctx.font = `800 11px ${FONT}`
      ctx.fillStyle   = `${amber}1)`
      ctx.shadowColor = `${amber}0.75)`
      ctx.shadowBlur  = 9
      ctx.fillText(`› ${text}`, CARD_X + PAD_X, rowY)
      ctx.shadowBlur = 0
      rowY += ROW_H
    }
  }

  ctx.restore()
}
