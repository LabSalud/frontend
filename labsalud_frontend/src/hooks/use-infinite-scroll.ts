"use client"

import { useCallback, useEffect, useRef } from "react"

interface UseInfiniteScrollOptions {
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  threshold?: number
  /** Cuánto antes del final se dispara el pedido. Por defecto una pantalla
   * completa: cuando al usuario le queda un viewport de scroll, el lote
   * siguiente ya se está pidiendo y no llega a ver el hueco. */
  rootMargin?: string
  /** Ya no hace falta: el observer lee el estado por ref y nunca queda
   * viejo. Se sigue aceptando para no tocar los callers, y sirve para
   * forzar una relectura cuando cambian filtros o búsqueda. */
  dependencies?: unknown[]
}

export function useInfiniteScroll({
  loading,
  hasMore,
  onLoadMore,
  threshold = 0,
  rootMargin = "0px 0px 100% 0px",
  dependencies = [],
}: UseInfiniteScrollOptions) {
  const nodeRef = useRef<HTMLElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // El observer se crea una sola vez por centinela y lee el estado de acá.
  // Antes se lo recreaba en cada cambio de `loading`/`hasMore`, y en esa
  // ventana se perdían intersecciones justo cuando el lote terminaba de
  // llegar: el scroll quedaba clavado hasta que el usuario lo movía a mano.
  const estado = useRef({ loading, hasMore, onLoadMore })
  estado.current = { loading, hasMore, onLoadMore }

  const pedirSiCorresponde = useCallback((visible: boolean) => {
    const { loading, hasMore, onLoadMore } = estado.current
    // Sin más páginas no se pide nada, por más que el centinela esté a la
    // vista: la lista terminó.
    if (!visible || loading || !hasMore) return
    onLoadMore()
  }, [])

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect()
      observerRef.current = null
      nodeRef.current = node
      if (!node) return

      const observer = new IntersectionObserver(
        (entries) => pedirSiCorresponde(entries.some((entry) => entry.isIntersecting)),
        { threshold, rootMargin },
      )
      observer.observe(node)
      observerRef.current = observer
    },
    [pedirSiCorresponde, threshold, rootMargin],
  )

  const hashDeps = dependencies.map((dep) => String(dep)).join("|")

  // Cuando el lote termina de llegar el centinela puede seguir dentro del
  // margen (pantalla alta, lote corto, lista más corta que el viewport). El
  // observer no vuelve a avisar porque nunca dejó de intersectar, así que lo
  // re-observamos para forzar una lectura nueva y encadenar el lote que sigue.
  useEffect(() => {
    const node = nodeRef.current
    const observer = observerRef.current
    if (!node || !observer || loading || !hasMore) return
    observer.unobserve(node)
    observer.observe(node)
  }, [loading, hasMore, hashDeps])

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [])

  return sentinelRef
}
