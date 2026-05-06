import { useState, useCallback } from 'react'
import { OverlayCanvas } from './components/OverlayCanvas'
import { CaptureButton } from './components/CaptureButton'
import { CameraSelector } from './components/CameraSelector'
import { PhotoReview } from './components/PhotoReview'

export default function App() {
  const [cameraIndex, setCameraIndex] = useState(1)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)

  const onPhotoCaptured = useCallback((dataUrl: string) => setCapturedPhoto(dataUrl), [])

  const handleCameraSelect = async (index: number) => {
    setCameraIndex(index)
    await fetch(`http://localhost:8765/switch/${index}`, { method: 'POST' }).catch(() => {})
  }

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
      <div
        className="relative overflow-hidden h-full"
        style={{ aspectRatio: '9 / 16' }}
      >
        <CameraSelector activeIndex={cameraIndex} onSelect={handleCameraSelect} />
        <OverlayCanvas onCapture={onPhotoCaptured} isReviewing={capturedPhoto !== null} />
        {!capturedPhoto && <CaptureButton onCapture={onPhotoCaptured} />}
        {capturedPhoto && (
          <PhotoReview dataUrl={capturedPhoto} onDismiss={() => setCapturedPhoto(null)} />
        )}
      </div>
    </div>
  )
}
