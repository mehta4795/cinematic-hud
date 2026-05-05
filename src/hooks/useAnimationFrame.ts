import { useEffect, useRef } from 'react'

export function useAnimationFrame(callback: (deltaMs: number) => void) {
  const rafRef = useRef<number>(0)
  const prevTimeRef = useRef<number>(0)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    function loop(time: number) {
      const delta = prevTimeRef.current ? time - prevTimeRef.current : 0
      prevTimeRef.current = time
      callbackRef.current(delta)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])
}
