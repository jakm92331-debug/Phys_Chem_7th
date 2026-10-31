import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the production build can be hosted from any static
  // sub-path (e.g. GitHub Pages project sites) without extra configuration.
  base: './',
  server: {
    host: '0.0.0.0',
  },
  preview: {
    host: '0.0.0.0',
  },
})
