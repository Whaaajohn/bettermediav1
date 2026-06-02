import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:5174",
      "/socket.io": {
        target: "http://127.0.0.1:5174",
        ws: true,
      },
      "/media": "http://127.0.0.1:5174",
    },
  },
})
