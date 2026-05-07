import { useState, useCallback } from 'react'
import { getFrame } from '../websocket/frameStore'
import { BACKEND_HTTP } from '../config/backend'

interface Props {
  onCapture: (dataUrl: string) => void
}

export function CaptureButton({ onCapture }: Props) {
  const [flash, setFlash] = useState(false)

  const handleCapture = useCallback(async () => {
    const blob = getFrame()
    if (!blob) return

    const bmp = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = bmp.width
    canvas.height = bmp.height
    canvas.getContext('2d')!.drawImage(bmp, 0, 0)
    bmp.close()
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)

    setFlash(true)
    setTimeout(() => setFlash(false), 150)

    onCapture(dataUrl)
    if (window.api) {
      await window.api.saveCapture(dataUrl)
    } else {
      await fetch(`${BACKEND_HTTP()}/save-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      }).catch(() => {})
    }
  }, [onCapture])

  return (
    <>
      {flash && (
        <div className="absolute inset-0 bg-white pointer-events-none z-30 opacity-80" />
      )}
      <button
        onClick={handleCapture}
        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20
                   w-16 h-16 rounded-full
                   bg-white/10 border-4 border-white
                   flex items-center justify-center
                   active:scale-90 transition-transform duration-75
                   focus:outline-none"
        aria-label="Capture photo"
      >
        <div className="w-11 h-11 rounded-full bg-white" />
      </button>
    </>
  )
}
