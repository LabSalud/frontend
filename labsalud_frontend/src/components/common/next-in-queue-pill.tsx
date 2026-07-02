"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface NextInQueuePillProps {
  prevId: number | null
  nextId: number | null
  /** Ruta base a la que navegar, ej. "/resultados" o "/validacion". */
  basePath: string
  maxWidthClass?: string
}

/**
 * Píldora flotante fija abajo para saltar entre detalles de la cola. Partida a
 * la mitad: "Anterior" | "Siguiente" (mitades iguales). Si es el primero muestra
 * solo Siguiente; si es el último, solo Anterior. Flotando es compacta y
 * centrada; al llegar al fondo se agranda al ancho del contenedor. Glassy.
 */
export function NextInQueuePill({ prevId, nextId, basePath, maxWidthClass = "max-w-6xl" }: NextInQueuePillProps) {
  const navigate = useNavigate()
  const [atBottom, setAtBottom] = useState(false)

  useEffect(() => {
    const recompute = () => {
      setAtBottom(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 48)
    }
    recompute()
    window.addEventListener("scroll", recompute, { passive: true })
    window.addEventListener("resize", recompute)
    // Recalcular cuando cambia la altura del contenido (ej: al navegar a otro
    // protocolo la página arranca corta y luego crece al cargar los resultados).
    const ro = new ResizeObserver(recompute)
    ro.observe(document.body)
    return () => {
      window.removeEventListener("scroll", recompute)
      window.removeEventListener("resize", recompute)
      ro.disconnect()
    }
  }, [])

  if (!prevId && !nextId) return null

  const btn = cn(
    "flex flex-1 items-center justify-center gap-1.5 font-semibold text-white transition-colors hover:bg-white/10 active:bg-white/25",
    atBottom ? "px-6 py-4 text-base" : "px-5 py-2.5 text-sm",
  )
  const iconSize = atBottom ? "h-5 w-5" : "h-4 w-4"

  return (
    <div className={cn("pointer-events-none fixed inset-x-0 bottom-4 z-40 mx-auto flex justify-center px-3 sm:px-4", maxWidthClass)}>
      <div
        className={cn(
          "pointer-events-auto flex items-stretch overflow-hidden rounded-full bg-[#204983]/85 shadow-lg ring-1 ring-white/20 backdrop-blur-md transition-all duration-300 ease-out",
          atBottom ? "w-full" : "w-[min(22rem,100%)]",
        )}
      >
        {prevId && (
          <button type="button" onClick={() => navigate(`${basePath}/${prevId}`)} className={btn}>
            <ArrowLeft className={iconSize} />
            Anterior
          </button>
        )}
        {prevId && nextId && <div className="w-px shrink-0 bg-white/20" />}
        {nextId && (
          <button type="button" onClick={() => navigate(`${basePath}/${nextId}`)} className={btn}>
            Siguiente
            <ArrowRight className={iconSize} />
          </button>
        )}
      </div>
    </div>
  )
}
