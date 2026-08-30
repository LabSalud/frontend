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
  // Pre-bundleado de dependencias, para `vite dev`.
  //
  // Vite convierte cada dependencia de node_modules a un solo archivo la
  // primera vez que alguien la importa. Si la descubre a mitad de camino
  // —porque vive adentro de una pantalla que se carga con `lazy()`— tiene que
  // frenar, optimizarla y RECARGAR la página entera. Es el "new dependencies
  // optimized, reloading" que aparece en la consola justo cuando uno estaba
  // por hacer algo.
  //
  // Declarándolas acá se pre-bundlean todas al arrancar, de una vez, y esas
  // recargas dejan de pasar. La lista es la de `package.json` que se usa desde
  // pantallas lazy: los Radix de los diálogos, dnd-kit del ordenamiento, cmdk
  // del buscador.
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react-router-dom",
      "@tanstack/react-query",
      "lucide-react",
      "sonner",
      "cmdk",
      "next-themes",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/modifiers",
      "@dnd-kit/utilities",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },

  server: {
    port: Number(process.env.VITE_DEV_PORT ?? 5173),
    host: process.env.VITE_DEV_HOST ?? "0.0.0.0",
    ...(allowedHosts?.length ? { allowedHosts } : {}),

    // Transformar de antemano lo que se va a pedir igual.
    //
    // En dev no hay bundle: el navegador pide UN archivo por módulo y Vite lo
    // transforma en el momento. Son ~277 archivos propios, así que al entrar a
    // una pantalla se ve la catarata de requests en la pestaña Network — que en
    // producción no aparece porque ahí ya está todo empaquetado en chunks.
    //
    // `warmup` le dice a Vite que vaya transformando estos mientras uno todavía
    // está abriendo el navegador, en vez de esperar a que se los pidan. No
    // cambia la cantidad de requests; cambia que lleguen ya listas.
    warmup: {
      clientFiles: [
        "./src/main.tsx",
        "./src/App.tsx",
        "./src/contexts/*.tsx",
        "./src/hooks/*.tsx",
        "./src/lib/*.ts",
        "./src/components/ui/*.tsx",
        "./src/components/common/*.tsx",
      ],
    },
  }
})
