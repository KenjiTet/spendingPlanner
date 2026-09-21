import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // The API is served by the Node server, on the same origin once built
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
