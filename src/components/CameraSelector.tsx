import { useEffect, useState } from 'react'

interface Props {
  selectedId: string
  onSelect: (deviceId: string) => void
}

export function CameraSelector({ selectedId, onSelect }: Props) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  useEffect(() => {
    async function enumerate() {
      // getUserMedia must be called first — browsers hide device labels until permission is granted
      await navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(s => s.getTracks().forEach(t => t.stop()))
        .catch(() => {})

      const all = await navigator.mediaDevices.enumerateDevices()
      const cameras = all.filter(d => d.kind === 'videoinput')
      setDevices(cameras)
      if (cameras.length > 0 && !selectedId) {
        onSelect(cameras[0].deviceId)
      }
    }
    enumerate()
  }, [])

  if (devices.length <= 1) return null

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
      <select
        value={selectedId}
        onChange={e => onSelect(e.target.value)}
        className="bg-black/70 text-white/80 text-xs font-mono border border-white/20 rounded px-3 py-1.5 outline-none backdrop-blur-sm"
      >
        {devices.map(d => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
          </option>
        ))}
      </select>
    </div>
  )
}
