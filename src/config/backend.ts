function backendHost(): string {
  // Electron: connect directly to the backend (window.api is injected by preload)
  if (typeof window !== 'undefined' && window.api) return 'localhost:8765'
  // Browser (phone or Mac): route through Vite proxy — same origin, avoids mixed content
  return location.host
}

function wsScheme(): string {
  return location.protocol === 'https:' ? 'wss:' : 'ws:'
}

export const BACKEND_HTTP = () => `${location.protocol}//${backendHost()}`
export const BACKEND_WS   = () => `${wsScheme()}//${backendHost()}`
