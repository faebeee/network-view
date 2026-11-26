import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_TARGET = process.env.API_URL ?? 'http://127.0.0.1:3100'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must come before the React plugin. Generates src/routeTree.gen.ts from src/routes.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
  ],
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
})
