import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Relative base so the production build can be hosted from any static
  // sub-path (e.g. GitHub Pages project sites) without extra configuration.
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Keep the app chunk small and let browsers cache the heavy, rarely
        // changing libraries (React, the icon set, and KaTeX) separately.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          katex: ['katex'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    // Allow proxied preview hosts (e.g. cloud dev environments) in dev only.
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
})
