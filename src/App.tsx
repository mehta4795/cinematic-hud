import { useState } from 'react'
import { CameraSelector } from './components/CameraSelector'
import { CameraFeed } from './components/CameraFeed'
import { OverlayCanvas } from './components/OverlayCanvas'

export default function App() {
  const [deviceId, setDeviceId] = useState('')

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Mobile portrait viewport — iPhone 14 dimensions (390×844) */}
      <div className="relative overflow-hidden" style={{ width: 390, height: 844 }}>
        <CameraSelector selectedId={deviceId} onSelect={setDeviceId} />
        <CameraFeed deviceId={deviceId} />
        <OverlayCanvas />
      </div>
    </div>
  )
}
