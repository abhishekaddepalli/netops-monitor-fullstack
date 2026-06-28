import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    minify: false,
  },
  server: {
    port: 5173,
    proxy: {
      // Proxies API calls to the Laravel backend during local dev so you
      // don't need to configure CORS on api/v1/* routes (Sanctum SPA auth
      // is happiest same-origin anyway). Adjust target if your backend
      // runs on a different port.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/hb': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
