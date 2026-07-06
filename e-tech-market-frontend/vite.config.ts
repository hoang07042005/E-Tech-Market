import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// In Docker, "localhost" inside the frontend container refers to itself, not the
// nginx service.  Use the Docker service name "nginx" by default when the
// VITE_API_PROXY_TARGET env-var is not explicitly set.
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://nginx:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Provide an ESM wrapper for the CommonJS `shallowequal` package so
      // Vite/Rolldown can see a proper default export during optimization.
      'shallowequal': path.resolve(__dirname, './src/compat/shallowequal-compat.js'),
    },
  },
  optimizeDeps: {
    include: ['react-helmet-async', 'react-fast-compare', 'shallowequal'],
  },
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
    },
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        ws: true,
      },
      '/storage': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
