import { useState, useCallback, useEffect, useRef } from 'react'
import { OverlayCanvas } from './components/OverlayCanvas'
import { CaptureButton } from './components/CaptureButton'
import { CameraSelector } from './components/CameraSelector'
import { PhotoReview } from './components/PhotoReview'
import { BACKEND_HTTP } from './config/backend'

const isElectron = typeof window !== 'undefined' && !!window.api

export default function App() {
  const [cameraIndex, setCameraIndex]   = useState(1)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [phoneMode, setPhoneMode]       = useState(false)
  const [stream, setStream]             = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode]     = useState<'environment' | 'user'>('environment')
  const videoElRef = useRef<HTMLVideoElement | null>(null)

  const onPhotoCaptured = useCallback((dataUrl: string) => setCapturedPhoto(dataUrl), [])

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null
    async function acquire() {
      try { wakeLock = await navigator.wakeLock.request('screen') } catch {}
    }
    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      document.removeEventListener('visibilitychange', acquire)
      wakeLock?.release()
    }
  }, [])

  useEffect(() => {
    if (!phoneMode || !stream) return
    const video = document.createElement('video')
    video.srcObject = stream
    video.autoplay = true
    video.playsInline = true
    video.muted = true
    video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;'
    videoElRef.current = video
    const container = document.getElementById('camera-container')
    container?.insertBefore(video, container.firstChild)
    video.play().catch(() => {})
    return () => {
      video.srcObject = null
      video.remove()
      videoElRef.current = null
    }
  }, [phoneMode, stream])

  const startStream = async (facing: 'environment' | 'user') => {
    stream?.getTracks().forEach(t => t.stop())
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      setStream(s)
      setFacingMode(facing)
      setPhoneMode(true)
    } catch (e) {
      console.error('[phone-cam] getUserMedia failed:', e)
    }
  }

  const enablePhoneCamera  = () => startStream('environment')
  const disablePhoneCamera = () => {
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setPhoneMode(false)
  }
  const flipCamera = () => startStream(facingMode === 'environment' ? 'user' : 'environment')

  const handleCameraSelect = async (index: number) => {
    setCameraIndex(index)
    await fetch(`${BACKEND_HTTP()}/switch/${index}`, { method: 'POST' }).catch(() => {})
  }

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
      <div
        id="camera-container"
        className="relative overflow-hidden h-full"
        style={{ aspectRatio: '9 / 16' }}
      >
        {!phoneMode && (
          <CameraSelector activeIndex={cameraIndex} onSelect={handleCameraSelect} />
        )}
        <OverlayCanvas
          onCapture={onPhotoCaptured}
          isReviewing={capturedPhoto !== null}
          phoneMode={phoneMode}
          stream={stream}
        />
        {!capturedPhoto && <CaptureButton onCapture={onPhotoCaptured} />}
        {capturedPhoto && (
          <PhotoReview dataUrl={capturedPhoto} onDismiss={() => setCapturedPhoto(null)} />
        )}

        {!isElectron && (
          <button
            onClick={phoneMode ? disablePhoneCamera : enablePhoneCamera}
            className="absolute bottom-44 left-1/2 -translate-x-1/2 z-20
                       px-3 py-1 rounded-full text-xs font-mono
                       bg-black/60 border border-white/30 text-white/70
                       active:scale-95 transition-transform"
          >
            {phoneMode ? '⇄ CONTINUITY CAM' : '⇄ PHONE CAM'}
          </button>
        )}

        {phoneMode && (
          <button
            onClick={flipCamera}
            className="absolute bottom-44 right-4 z-20
                       w-10 h-10 rounded-full
                       bg-black/60 border border-white/30 text-white/80 text-lg
                       flex items-center justify-center
                       active:scale-95 transition-transform"
            aria-label="Flip camera"
          >
            ↺
          </button>
        )}
      </div>
    </div>
  )
}
