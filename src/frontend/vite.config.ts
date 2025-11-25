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
    ],
    proxy: {
      // Proxy API calls to backend ngrok URL
      '/api': {
        target: 'https://general.dev.tpa.ngrok.app',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // Proxy SSE endpoint to backend ngrok URL
      '/stream-status': {
        target: 'https://general.dev.tpa.ngrok.app',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // Proxy Mentra auth endpoint to backend ngrok URL
      '/mentra-auth': {
        target: 'https://general.dev.tpa.ngrok.app',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Mentra SDK endpoints to backend ngrok URL
      '/__mentra': {
        target: 'https://general.dev.tpa.ngrok.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: '../../public/react',
    emptyOutDir: true,
  },
})
