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
 *
 * EL NÚMERO EN LA PUNTA DE CADA FLECHA
 * ====================================
 * Es el protocolo al que lleva ese lado. Sin el número, "Siguiente" es un salto
 * a ciegas: no se sabe adónde se va hasta después de aterrizar, y para volver
 * hay que acordarse de dónde se venía. Con el número se decide antes de tocar,
 * y quedan a la vista los dos vecinos.
 *
 * Va del lado que APUNTA la flecha, no pegado al texto: la flecha señala el
 * destino, y el destino es el número.
 *
 * SIGUIENTE VA A LA IZQUIERDA Y ANTERIOR A LA DERECHA
 * ===================================================
 * Al revés de lo que suele hacerse. Es como lo pidió el laboratorio: el que
 * sigue es el que se va a abrir, así que queda del lado por donde se empieza a
 * leer, y volver al anterior es la acción secundaria. Cada flecha sigue
 * apuntando hacia afuera, al número al que lleva.
 */
export function NextInQueuePill({ prevId, nextId, basePath, maxWidthClass = "max-w-6xl" }: NextInQueuePillProps) {
  const navigate = useNavigate()
  const [atBottom, setAtBottom] = useState(false)

  // Al saltar, arriba de todo. El botón se toca casi siempre desde el fondo de
  // la página, y sin esto el protocolo nuevo abre a mitad de camino: no se ve
  // ni de quién es, que es lo primero que hay que confirmar después de saltar.
  const saltarA = (id: number) => {
    navigate(`${basePath}/${id}`)
    window.scrollTo({ top: 0 })
  }

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
    "flex min-w-0 flex-1 items-center justify-center gap-1.5 font-semibold text-white transition-colors hover:bg-white/10 active:bg-white/25",
    atBottom ? "px-6 py-4 text-base" : "px-3.5 py-2.5 text-sm",
  )
  const iconSize = atBottom ? "h-5 w-5" : "h-4 w-4"

  // Cuadradito con el número adentro. `shrink-0` porque lo que puede achicarse
  // es la palabra, no el dato.
  const numero = (id: number) => (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border border-white/50 bg-white/10 font-mono leading-none tabular-nums",
        atBottom ? "min-w-[2.25rem] px-2 py-1.5 text-sm" : "min-w-[1.75rem] px-1.5 py-1 text-xs",
      )}
    >
      {id}
    </span>
  )

  return (
    <div className={cn("pointer-events-none fixed inset-x-0 bottom-4 z-40 mx-auto flex justify-center px-3 sm:px-4", maxWidthClass)}>
      <div
        className={cn(
          "pointer-events-auto flex items-stretch overflow-hidden rounded-full bg-[#204983]/85 shadow-lg ring-1 ring-white/20 backdrop-blur-md transition-all duration-300 ease-out",
          atBottom ? "w-full" : "w-[min(24rem,100%)]",
        )}
      >
        {nextId && (
          <button
            type="button"
            onClick={() => saltarA(nextId)}
            className={btn}
            aria-label={`Siguiente: protocolo ${nextId}`}
          >
            {numero(nextId)}
            <ArrowLeft className={cn(iconSize, "shrink-0")} />
            <span className="truncate">Siguiente</span>
          </button>
        )}
        {prevId && nextId && <div className="w-px shrink-0 bg-white/20" />}
        {prevId && (
          <button
            type="button"
            onClick={() => saltarA(prevId)}
            className={btn}
            aria-label={`Anterior: protocolo ${prevId}`}
          >
            <span className="truncate">Anterior</span>
            <ArrowRight className={cn(iconSize, "shrink-0")} />
            {numero(prevId)}
          </button>
        )}
      </div>
    </div>
  )
}
