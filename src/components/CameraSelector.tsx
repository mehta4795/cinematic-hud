import { useEffect, useState } from 'react'
import { BACKEND_HTTP } from '../config/backend'

interface Camera { index: number }

interface Props {
  activeIndex: number
  onSelect: (index: number) => void
}

export function CameraSelector({ activeIndex, onSelect }: Props) {
  const [cameras, setCameras] = useState<Camera[]>([])

  useEffect(() => {
    fetch(`${BACKEND_HTTP()}/cameras`)
      .then(r => r.json())
      .then(setCameras)
      .catch(() => {})
  }, [])

  if (cameras.length <= 1) return null

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
      <select
        value={activeIndex}
        onChange={e => onSelect(Number(e.target.value))}
        className="bg-black/70 text-white/80 text-xs font-mono border border-white/20 rounded px-3 py-1.5 outline-none backdrop-blur-sm"
      >
        {cameras.map(c => (
          <option key={c.index} value={c.index}>
            Camera {c.index}
          </option>
        ))}
      </select>
    </div>
  )
}
