let audioCtx: AudioContext | null = null

function ctx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

// Soft electronic tick when subject locks
export function playSubjectLock() {
  const ac = ctx()
  const t = ac.currentTime

  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, t)
  osc.frequency.exponentialRampToValueAtTime(440, t + 0.08)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.12, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.1)
}

// Subtle high pulse when capture countdown passes 50%
export function playCapturePulse() {
  const ac = ctx()
  const t = ac.currentTime

  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1200, t)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.08, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.15)
}

// Premium shutter: click transient + body resonance thunk
export function playShutter() {
  const ac = ctx()
  const t = ac.currentTime

  // Click — filtered noise burst
  const bufSize = Math.floor(ac.sampleRate * 0.02)
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ac.createBufferSource()
  noise.buffer = buf
  const hp = ac.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 2000
  const noiseGain = ac.createGain()
  noiseGain.gain.setValueAtTime(0.35, t)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02)
  noise.connect(hp)
  hp.connect(noiseGain)
  noiseGain.connect(ac.destination)
  noise.start(t)

  // Thunk — low sine decay
  const osc = ac.createOscillator()
  const oscGain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(120, t)
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.15)
  oscGain.gain.setValueAtTime(0.22, t)
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  osc.connect(oscGain)
  oscGain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.2)
}

