import { useState } from 'react'
import { CameraSelector } from './components/CameraSelector'
import { CameraFeed } from './components/CameraFeed'
import { OverlayCanvas } from './components/OverlayCanvas'
import { CaptureButton } from './components/CaptureButton'

export default function App() {
  const [deviceId, setDeviceId] = useState('')

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Portrait viewport — 9:16 aspect ratio, matches backend portrait crop */}
      <div
        className="relative overflow-hidden"
        style={{ height: '100%', aspectRatio: '9 / 16' }}
      >
        <CameraSelector selectedId={deviceId} onSelect={setDeviceId} />
        <CameraFeed deviceId={deviceId} />
        <OverlayCanvas />
        <CaptureButton />
      </div>
    </div>
  )
}
