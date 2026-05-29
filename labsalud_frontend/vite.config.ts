import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const allowedHosts = process.env.VITE_ALLOWED_HOSTS
  ?.split(",")
  .map((host) => host.trim())
  .filter(Boolean)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: Number(process.env.VITE_DEV_PORT ?? 5173),
    host: process.env.VITE_DEV_HOST ?? "0.0.0.0",
    ...(allowedHosts?.length ? { allowedHosts } : {}),
  }
})
