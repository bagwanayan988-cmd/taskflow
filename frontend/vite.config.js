import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The API gateway's CORS policy allows exactly this origin, so fail fast instead of picking another port.
    port: 5173,
    strictPort: true,
  },
})
