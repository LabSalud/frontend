import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 80,
    host: "0.0.0.0",
    allowedHosts: ['gestion.labsalud.com.ar', 'www.gestion.labsalud.com.ar', '*']
  }
})
