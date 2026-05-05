import { useEffect, useRef } from 'react'

interface Props {
  deviceId: string
}

export function CameraFeed({ deviceId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let stream: MediaStream | null = null

    const videoConstraint = deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      : { width: { ideal: 1920 }, height: { ideal: 1080 } }

    navigator.mediaDevices
      .getUserMedia({ video: videoConstraint, audio: false })
      .then(s => {
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch(console.error)

    return () => {
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [deviceId])

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="w-full h-full object-cover"
    />
  )
}
