import { useState } from 'react'
import { CameraSelector } from './components/CameraSelector'
import { CameraFeed } from './components/CameraFeed'
import { OverlayCanvas } from './components/OverlayCanvas'
import { CaptureButton } from './components/CaptureButton'

export default function App() {
  const [deviceId, setDeviceId] = useState('')

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Landscape viewport — matches camera feed aspect ratio sent to backend */}
      <div className="relative w-full h-full overflow-hidden">
        <CameraSelector selectedId={deviceId} onSelect={setDeviceId} />
        <CameraFeed deviceId={deviceId} />
        <OverlayCanvas />
        <CaptureButton />
      </div>
    </div>
  )
}
