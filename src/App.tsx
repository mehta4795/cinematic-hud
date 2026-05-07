import { useState, useCallback } from 'react'
import { CameraSelector } from './components/CameraSelector'
import { CameraFeed } from './components/CameraFeed'
import { OverlayCanvas } from './components/OverlayCanvas'
import { CaptureButton } from './components/CaptureButton'
import { PhotoReview } from './components/PhotoReview'

export default function App() {
  const [deviceId, setDeviceId] = useState('')
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)

  const onPhotoCaptured = useCallback((dataUrl: string) => setCapturedPhoto(dataUrl), [])

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* 9:16 portrait viewport — fills screen height */}
      <div className="relative overflow-hidden h-full" style={{ aspectRatio: '9/16' }}>
        <CameraSelector selectedId={deviceId} onSelect={setDeviceId} />
        <CameraFeed deviceId={deviceId} />
        <OverlayCanvas onCapture={onPhotoCaptured} isReviewing={capturedPhoto !== null} />
        {!capturedPhoto && <CaptureButton onCapture={onPhotoCaptured} />}
        {capturedPhoto && (
          <PhotoReview dataUrl={capturedPhoto} onDismiss={() => setCapturedPhoto(null)} />
        )}
      </div>
    </div>
  )
}
