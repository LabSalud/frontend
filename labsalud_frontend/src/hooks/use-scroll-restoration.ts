"use client"

import { useEffect } from "react"

/**
 * Restaura la posición de scroll de un listado al volver desde una página de
 * detalle. Guarda `window.scrollY` por `key` en sessionStorage y la reaplica
 * al montar.
 *
 * Pasar `enabled: false` mientras la lista carga por primera vez, para
 * restaurar recién cuando el contenido ya tiene altura (si no, el scroll
 * queda clampeado a 0).
 */
export function useScrollRestoration(key: string, enabled = true) {
  const storageKey = `scroll:${key}`

  useEffect(() => {
    if (!enabled) return

    // Restaurar en el próximo frame, cuando el DOM del listado ya está pintado.
    const raf = requestAnimationFrame(() => {
      const saved = sessionStorage.getItem(storageKey)
      if (saved) {
        const y = Number(saved)
        if (!Number.isNaN(y)) window.scrollTo(0, y)
      }
    })

    const save = () => {
      try {
        sessionStorage.setItem(storageKey, String(window.scrollY))
      } catch {
        // degradar silenciosamente
      }
    }

    window.addEventListener("scroll", save, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      save()
      window.removeEventListener("scroll", save)
    }
  }, [storageKey, enabled])
}
