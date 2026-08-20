import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built site works on GitHub Pages / any subpath / static hosts.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
