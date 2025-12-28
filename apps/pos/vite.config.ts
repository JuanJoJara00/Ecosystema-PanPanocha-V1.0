import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Crucial for Electron file protocol
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['@powersync/web'],
    include: ['@powersync/web > event-iterator']
  },
  worker: {
    format: 'es'
  }
})
