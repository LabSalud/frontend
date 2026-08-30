"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { buildGlobalSearchPath, GLOBAL_SEARCH_MIN_CHARS } from "@/hooks/use-global-search"

/**
 * Marcá con este atributo cualquier botón que abra/cierre la búsqueda
 * (`data-global-search-trigger`), así el cierre por click afuera lo ignora.
 */
export const GLOBAL_SEARCH_TRIGGER_SELECTOR = "[data-global-search-trigger]"

interface GlobalSearchProps {
  /**
   * El puntero está sobre el logo de la navbar (con su gracia para llegar hasta
   * acá). La barra además se sostiene sola mientras el mouse está encima de ella.
   */
  isHovering: boolean
  /** Abierta a propósito: tap del botón en mobile o Ctrl/⌘+K. */
  isPinned: boolean
  /** Pedido de cierre: la navbar tiene que apagar `isPinned` cuando llega. */
  onRequestClose: () => void
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isHovering,
  isPinned,
  onRequestClose,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  // El puntero está sobre la propia barra: es lo que la sostiene abierta cuando
  // el mouse ya se fue del logo pero todavía no hizo click en el input.
  const [isBarHovered, setIsBarHovered] = useState(false)
  // Cierre explícito (Escape o click afuera). Se apaga solo cuando el mouse
  // vuelve al logo o cuando se abre a mano: si no, quedaría cerrada para
  // siempre mientras el puntero no se mueva de ahí.
  const [isDismissed, setIsDismissed] = useState(false)

  const hasQuery = query.trim().length > 0
  // Con foco o con texto escrito NO se cierra aunque el mouse se vaya: cerrarse
  // mientras alguien está tipeando sería insoportable.
  const isOpen = !isDismissed && (isPinned || isHovering || isBarHovered || isFocused || hasQuery)

  useEffect(() => {
    if (isHovering) setIsDismissed(false)
  }, [isHovering])

  const wasPinnedRef = useRef(isPinned)
  useEffect(() => {
    const wasPinned = wasPinnedRef.current
    wasPinnedRef.current = isPinned

    if (isPinned) {
      setIsDismissed(false)
      inputRef.current?.focus()
      return
    }

    // Despinear es un cierre explícito (el botón de búsqueda en mobile, que
    // funciona como toggle): hay que soltar el foco, si no seguiría abierta.
    if (wasPinned) {
      setIsDismissed(true)
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }, [isPinned])

  // Al cambiar de ruta (incluye ir a la página de resultados y el botón atrás)
  // la barra se cierra y se limpia: la página de resultados tiene su propio
  // input, y arrastrar el término acá sería duplicarlo.
  // El primer render no cuenta como navegación: si contara, montar la navbar
  // con el puntero ya sobre el logo dejaría la barra cerrada hasta salir y volver.
  const lastLocationKeyRef = useRef(location.key)
  useEffect(() => {
    if (lastLocationKeyRef.current === location.key) return
    lastLocationKeyRef.current = location.key
    setQuery("")
    setIsDismissed(true)
    setIsFocused(false)
    setIsBarHovered(false)
  }, [location.key])

  // Click afuera cierra (sin limpiar: si volvés a abrir, el texto sigue ahí).
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null
      if (containerRef.current?.contains(target)) return
      // El botón que abre/cierra la búsqueda no cuenta como "afuera": si lo
      // tratáramos así, el mousedown cerraría y el click de después volvería a
      // abrir, y el toggle nunca podría cerrar.
      if (target?.closest?.(GLOBAL_SEARCH_TRIGGER_SELECTOR)) return
      setIsDismissed(true)
      setIsFocused(false)
      inputRef.current?.blur()
      onRequestClose()
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
    }
  }, [isOpen, onRequestClose])

  const close = useCallback(
    ({ clear }: { clear: boolean }) => {
      if (clear) setQuery("")
      setIsDismissed(true)
      setIsFocused(false)
      setIsBarHovered(false)
      inputRef.current?.blur()
      onRequestClose()
    },
    [onRequestClose],
  )

  // La búsqueda se resuelve en su propia página: acá solo se arma la URL.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const term = query.trim()
    if (term.length < GLOBAL_SEARCH_MIN_CHARS) return
    close({ clear: true })
    navigate(buildGlobalSearchPath({ q: term }))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      close({ clear: true })
    }
  }

  return (
    <>
      {/* Solo en pantallas chicas: sin hover, el cierre depende de tocar afuera,
          y sin este telón ese toque además dispararía lo que haya debajo. */}
      {isOpen && isPinned && <div className="fixed inset-0 z-40 lg:hidden" aria-hidden="true" />}

      <div
        ref={containerRef}
        onMouseEnter={() => setIsBarHovered(true)}
        onMouseLeave={() => setIsBarHovered(false)}
        // Queda montada siempre (aunque esté cerrada) para poder enfocarla por
        // atajo o con Tab: al recibir foco se abre sola.
        className={cn(
          "absolute left-1/2 top-full z-50 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 transition-all duration-200 ease-out",
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <form
          role="search"
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-b-2xl bg-white shadow-lg ring-1 ring-black/5"
        >
          <div className="relative flex items-center">
            <button
              type="submit"
              tabIndex={-1}
              // El foco se queda en el input: apretar la lupa es lo mismo que Enter.
              onMouseDown={(event) => event.preventDefault()}
              className="absolute left-2 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Buscar"
            >
              <Search className="h-4 w-4" />
            </button>
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar pacientes, protocolos, resultados… (Enter para buscar)"
              aria-label="Búsqueda global"
              autoComplete="off"
              spellCheck={false}
              tabIndex={isOpen ? 0 : -1}
              className="h-11 rounded-none border-0 bg-transparent pl-9 pr-9 shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
            {hasQuery && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery("")
                  inputRef.current?.focus()
                }}
                className="absolute right-2 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  )
}
