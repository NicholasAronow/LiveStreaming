import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Allow external access
    allowedHosts: [
      'webview.ngrok.dev',
      '.ngrok.dev',
      '.ngrok.io',
      '.ngrok.app',
      'general.dev.tpa.ngrok.app'
    ],
    proxy: {
      // Proxy ALL backend requests for session cookie compatibility
      '/api': {
        target: 'https://general.dev.tpa.ngrok.app',
        changeOrigin: true,
        secure: false,
      },
      '/stream-status': {
        target: 'https://general.dev.tpa.ngrok.app',
        changeOrigin: true,
        secure: false,
      },
      '/mentra-auth': {
        target: 'https://general.dev.tpa.ngrok.app',
        changeOrigin: true,
        secure: false,
      },
      '/__mentra': {
        target: 'https://general.dev.tpa.ngrok.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
  },
})
