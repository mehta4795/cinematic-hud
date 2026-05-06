import { useRef, useEffect, useState } from 'react'

interface Props {
  dataUrl: string
  onDismiss: () => void
}

const SWIPE_THRESHOLD = 80

export function PhotoReview({ dataUrl, onDismiss }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)
  const draggingRef = useRef(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    startXRef.current = e.clientX
    currentXRef.current = 0
    draggingRef.current = true
    if (divRef.current) divRef.current.style.transition = 'none'
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current || !divRef.current) return
    const dx = e.clientX - startXRef.current
    currentXRef.current = dx
    const opacity = 1 - Math.min(1, Math.abs(dx) / 300)
    divRef.current.style.transform = `translateX(${dx}px)`
    divRef.current.style.opacity = String(opacity)
  }

  function onPointerUp() {
    if (!draggingRef.current) return
    draggingRef.current = false
    const dx = currentXRef.current
    if (!divRef.current) return

    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const target = dx > 0 ? 500 : -500
      divRef.current.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out'
      divRef.current.style.transform = `translateX(${target}px)`
      divRef.current.style.opacity = '0'
      setTimeout(onDismiss, 260)
    } else {
      divRef.current.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out'
      divRef.current.style.transform = 'translateX(0px)'
      divRef.current.style.opacity = '1'
    }
  }

  return (
    <div
      ref={divRef}
      className={`absolute inset-0 z-40 bg-black touch-none overflow-hidden transition-all duration-150 ease-out ${
        visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        src={dataUrl}
        className="w-full h-full object-cover select-none pointer-events-none"
        draggable={false}
      />
      <div className="absolute top-6 inset-x-0 text-center">
        <span className="text-white/60 font-mono text-xs tracking-widest">REVIEW</span>
      </div>
      <div className="absolute bottom-12 inset-x-0 text-center">
        <span className="text-white/30 font-mono text-[10px] tracking-widest">← swipe to dismiss →</span>
      </div>
    </div>
  )
}
