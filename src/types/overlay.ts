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

export interface OverlayState {
  focusBox: {
    target: Vec2
    current: Vec2
    targetSize: number
    currentSize: number
    active: boolean     // true when AI has a detected subject
  }
  hudText: {
    text: string
    opacity: number
    visible: boolean
  }
  showGrid: boolean
  timestamp: number

  // Phase 2 — AI-driven
  faces: FaceData[]
  horizonTarget: number
  horizonCurrent: number
  scoreTarget: number
  scoreCurrent: number
  guidance: string[]
  guidanceText: string
  guidanceOpacity: number
  aiConnected: boolean
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}
