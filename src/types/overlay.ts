export interface Vec2 {
  x: number
  y: number
}

export interface OverlayState {
  focusBox: {
    target: Vec2
    current: Vec2
    size: number
  }
  hudText: {
    text: string
    opacity: number
    visible: boolean
  }
  showGrid: boolean
  timestamp: number
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}
