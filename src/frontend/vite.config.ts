import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, '../public'),
  server: {
    port: 5173,
    host: true, // Allow external access
    allowedHosts: [
      'webview.ngrok.dev',
      '.ngrok.dev',
      '.ngrok.io',
      '.ngrok.app',
      'localhost'
    ],
    proxy: {
      // Proxy ALL backend requests to localhost:3000
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/stream-status': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/mentra-auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/__mentra': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: '../../dist/frontend',
    emptyOutDir: true,
  },
})
