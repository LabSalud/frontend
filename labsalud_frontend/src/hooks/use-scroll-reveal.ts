"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Estado de la navbar según hacia dónde se está scrolleando.
 *
 * - `top`: estamos arriba de todo. La navbar va en el flujo normal y ocupa su
 *   espacio, como siempre.
 * - `revealed`: se está subiendo. La navbar aparece pegada arriba, sin que
 *   haga falta llegar hasta el principio de la página.
 * - `hidden`: se está bajando. Se va para no tapar contenido.
 */
export type ScrollRevealState = "top" | "revealed" | "hidden"

/** Debajo de esto se considera "arriba de todo". No es 0 para tolerar el rebote. */
const TOP_OFFSET = 4

/**
 * Mínimo de píxeles para considerar que hubo un cambio de dirección.
 *
 * Sin este margen, el temblor de un trackpad (o el rebote elástico de iOS al
 * llegar a los extremos) alterna entre mostrar y ocultar varias veces por
 * segundo y la navbar tiembla.
 */
const DIRECTION_THRESHOLD = 8

export function useScrollReveal(): ScrollRevealState {
  const [state, setState] = useState<ScrollRevealState>("top")
  // En refs y no en estado: cambian en cada evento de scroll y no tienen que
  // provocar renders por sí mismos.
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    lastScrollY.current = window.scrollY

    const evaluar = () => {
      ticking.current = false
      const actual = window.scrollY
      const anterior = lastScrollY.current

      if (actual <= TOP_OFFSET) {
        lastScrollY.current = actual
        setState("top")
        return
      }

      const delta = actual - anterior
      // Movimientos por debajo del umbral no cambian nada Y TAMPOCO actualizan
      // la referencia: si no, un arrastre lento de 7px por evento nunca
      // acumularía lo suficiente para contar como dirección.
      if (Math.abs(delta) < DIRECTION_THRESHOLD) return

      lastScrollY.current = actual
      setState(delta > 0 ? "hidden" : "revealed")
    }

    const onScroll = () => {
      // El navegador dispara scroll muchas veces por frame; con rAF hacemos
      // como mucho un cálculo por frame.
      if (ticking.current) return
      ticking.current = true
      window.requestAnimationFrame(evaluar)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    // El contenido puede achicarse (cerrar un acordeón, filtrar una tabla) y
    // dejarnos scrolleados más abajo del nuevo alto: sin esto la navbar
    // quedaría escondida sin forma de recuperarla salvo scrolleando.
    window.addEventListener("resize", onScroll, { passive: true })

    evaluar()

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  return state
}
