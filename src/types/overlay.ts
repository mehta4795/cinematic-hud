export interface Vec2 {
  x: number
  y: number
}

export interface FaceData {
  cx: number
  cy: number
  w: number
  h: number
  smoothCx: number
  smoothCy: number
}

export interface PoseLandmark {
  idx: number
  x: number
  y: number
  vis: number
}

export interface ScoreBreakdown {
  overall: number
  composition: number
  framing: number
  portrait: number
  horizon: number
  lighting: number
  pose: number
}

export interface LightingState {
  exposure: 'underexposed' | 'good' | 'overexposed'
  faceBrightness: number
  dynamicRange: 'low' | 'normal' | 'high'
  backlit: boolean
  harshShadow: boolean
}

export interface OverlayState {
  focusBox: {
    target: Vec2
    current: Vec2
    targetSize: number
    currentSize: number
    active: boolean
  }
  hudText: {
    text: string
    opacity: number
    visible: boolean
  }
  showGrid: boolean
  timestamp: number

  // Phase 2
  faces: FaceData[]
  horizonTarget: number
  horizonCurrent: number
  scoreTarget: number
  scoreCurrent: number
  guidance: string[]
  guidanceText: string
  guidanceOpacity: number
  aiConnected: boolean

  // Phase 3
  sceneType: string
  scoreBreakdown: ScoreBreakdown
  captureReady: boolean
  captureCountdown: number
  shouldCapture: boolean
  captureFlash: number
  bestScore: number

  // Phase 4
  reframeX: number
  reframeY: number
  reframeTargetX: number
  reframeTargetY: number
  zoomLevel: number
  zoomTarget: number
  captureSuccessOpacity: number
  captureCount: number

  // Phase 5
  lighting: LightingState

  // Phase 6 — Pose
  poseLandmarks: PoseLandmark[]
  poseType: string
  poseIssues: string[]

  // Claude analysis
  claudeAnalysis: { headline: string; topTips: string[] } | null
  claudeAnalysisOpacity: number
  claudeAnalysisAge: number
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}
