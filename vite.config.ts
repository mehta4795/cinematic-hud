import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), basicSsl()],
  base: './',
  server: {
    port: 5173,
    host: true,
    https: true,
    proxy: {
      '/ws':            { target: 'ws://localhost:8765',   ws: true,       changeOrigin: true },
      '/cameras':       { target: 'http://localhost:8765', changeOrigin: true },
      '/switch':        { target: 'http://localhost:8765', changeOrigin: true },
      '/save-capture':  { target: 'http://localhost:8765', changeOrigin: true },
    },
  },
})
