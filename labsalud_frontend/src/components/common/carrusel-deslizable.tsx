"use client"

import type React from "react"
import { useCallback, useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

/**
 * Una pista de paneles que se recorre deslizando.
 *
 * POR QUÉ SCROLL DE VERDAD Y NO `translateX`
 * ==========================================
 * Los carruseles de esta app movían el contenido con `transform: translateX`
 * y detectaban el gesto con `onTouchStart`/`onTouchEnd`. Eso anda con el dedo
 * y con nada más: en una notebook —que es donde se mira el inicio la mayor
 * parte del tiempo— el trackpad no hacía nada, porque un desplazamiento
 * horizontal de trackpad es un evento de scroll y ahí no había nada que
 * scrollear. Quedaban solo las flechas.
 *
 * Con un contenedor que scrollea de verdad, el mismo gesto funciona con dedo,
 * trackpad, rueda con Shift y teclado, y `scroll-snap` deja cada panel
 * encuadrado solo al soltar. La barra se esconde (`sin-barra-de-scroll`): para
 * saber dónde se está están los puntitos y las flechas.
 *
 * ES CONTROLADO
 * =============
 * `activo` manda: si cambia desde afuera (una flecha, un puntito), la pista se
 * desplaza sola. Y si el desplazamiento lo hizo la persona, avisa por
 * `onActivo` para que el estado de afuera —el rótulo "Hace 2 sem.", por
 * ejemplo— quede en el panel que se está viendo.
 */
export function CarruselDeslizable({
  activo,
  onActivo,
  children,
  className,
  ariaLabel,
}: {
  /** Índice del panel visible, en el orden en que se pasan los children. */
  activo: number
  onActivo: (indice: number) => void
  children: React.ReactNode
  className?: string
  ariaLabel?: string
}) {
  const pista = useRef<HTMLDivElement>(null)
  // El desplazamiento que dispara el propio componente no tiene que volver
  // como si lo hubiera hecho la persona: sin esto, `onActivo` se llamaría en
  // medio de la animación con los índices intermedios.
  const moviendoSolo = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const irA = useCallback((indice: number, animado: boolean) => {
    const el = pista.current
    if (!el) return
    moviendoSolo.current = true
    el.scrollTo({ left: indice * el.clientWidth, behavior: animado ? "smooth" : "auto" })
    if (timer.current) clearTimeout(timer.current)
    // No hay evento de "terminó el scroll" con soporte parejo todavía
    // (`scrollend` no está en todos lados), así que se libera por tiempo.
    timer.current = setTimeout(() => {
      moviendoSolo.current = false
    }, 400)
  }, [])

  // Al montar, la pista arranca donde diga `activo` y sin animación: el inicio
  // abre en la semana actual, no en la primera y viajando.
  const montado = useRef(false)
  useEffect(() => {
    irA(activo, montado.current)
    montado.current = true
  }, [activo, irA])

  const alScrollear = useCallback(() => {
    const el = pista.current
    if (!el || moviendoSolo.current || el.clientWidth === 0) return
    const indice = Math.round(el.scrollLeft / el.clientWidth)
    if (indice !== activo) onActivo(indice)
  }, [activo, onActivo])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return (
    <div
      ref={pista}
      onScroll={alScrollear}
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "sin-barra-de-scroll flex flex-1 snap-x snap-mandatory overflow-x-auto scroll-smooth",
        className,
      )}
    >
      {children}
    </div>
  )
}
