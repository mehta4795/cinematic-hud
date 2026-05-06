import { useState, useCallback } from 'react'

interface Props {
  onCapture: (dataUrl: string) => void
}

export function CaptureButton({ onCapture }: Props) {
  const [flash, setFlash] = useState(false)

  const handleCapture = useCallback(() => {
    const video = document.querySelector('video')
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)

    setFlash(true)
    setTimeout(() => setFlash(false), 150)

    onCapture(dataUrl)
    window.api.saveCapture(dataUrl)
  }, [onCapture])

  return (
    <>
      {flash && (
        <div className="absolute inset-0 bg-white pointer-events-none z-30 opacity-80" />
      )}
      <button
        onClick={handleCapture}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20
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
