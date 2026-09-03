import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = import.meta.dirname

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': path.resolve(root, '../shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3001',
    },
  },
})
