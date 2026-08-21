import { useCallback, useEffect, useRef } from "react"
import { useInfiniteQuery, keepPreviousData, hashKey, type QueryKey } from "@tanstack/react-query"
import { useApi } from "@/hooks/use-api"
import { readApiError } from "@/lib/api-error"

/**
 * Respuesta paginada estándar del backend DRF.
 */
export interface PaginatedPage<T> {
  results: T[]
  next: string | null
  count?: number
}

/** Offset donde arranca el lote siguiente al último cargado. */
const offsetSiguiente = <T,>(pages: Array<PaginatedPage<T>>) =>
  pages.reduce((acc, page) => acc + page.results.length, 0)

/**
 * El lote que se pidió por adelantado y todavía nadie reclamó.
 *
 * Vive en un ref del hook y no en el cache de React Query a propósito: las
 * keys del cache se matchean por prefijo, y un `invalidateQueries` o un
 * `setQueriesData` del listado (protocolos actualiza filas así) le pegaría
 * también al lote estacionado, que tiene otra forma.
 */
interface LoteAdelantado<T> {
  offset: number
  /** Hash de la queryKey con la que se pidió: si cambian filtros o búsqueda,
   * lo adelantado ya no sirve. */
  hash: string
  promesa: Promise<PaginatedPage<T>>
}

/**
 * Wrapper sobre `useInfiniteQuery` que sigue la paginación DRF (`next` URL).
 *
 * Además adelanta trabajo: apenas un lote termina de llegar pide el
 * siguiente y lo deja esperando. Cuando el scroll llega al final de lo que
 * hay en pantalla ese lote ya está —o está en camino— y entra sin viaje al
 * servidor ni skeleton. Se mantiene un solo lote de ventaja, y cuando la
 * lista se terminó (`hasNextPage` en false) no se pide nada más.
 *
 * Uso:
 *   const query = useApiInfiniteQuery<Patient>({
 *     queryKey: ["patients", debouncedSearch],
 *     buildUrl: (offset) => `${PATIENT_ENDPOINTS.PATIENTS}?limit=20&offset=${offset}&search=${search}`,
 *   })
 *   const items = flattenPages(query.data?.pages)
 */
export interface UseApiInfiniteQueryParams {
  queryKey: QueryKey
  /** Construye la URL para un offset dado. */
  buildUrl: (offset: number) => string
  enabled?: boolean
  staleTime?: number
  /** Mientras cambian filtros/búsqueda (queryKey nueva), sigue mostrando la
   * página anterior en vez de vaciar todo a blanco+skeleton. */
  keepPrevious?: boolean
  /** Adelantar el lote siguiente. Por defecto sí. */
  prefetchNext?: boolean
}

export function useApiInfiniteQuery<T = unknown>({
  queryKey,
  buildUrl,
  enabled,
  staleTime,
  keepPrevious,
  prefetchNext = true,
}: UseApiInfiniteQueryParams) {
  const { apiRequest } = useApi()

  // La queryKey llega como literal nuevo en cada render; su hash es estable y
  // sirve tanto de dependencia como de marca de a qué filtros pertenece lo
  // que haya adelantado.
  const hashDeLaKey = hashKey(queryKey)
  const hashActual = useRef(hashDeLaKey)
  hashActual.current = hashDeLaKey

  const adelanto = useRef<LoteAdelantado<T> | null>(null)

  const traerLote = useCallback(
    async (offset: number) => {
      const response = await apiRequest(buildUrl(offset))
      if (!response.ok) {
        const message = await readApiError(response, `Error ${response.status}`)
        throw new Error(message)
      }
      return (await response.json()) as PaginatedPage<T>
    },
    [apiRequest, buildUrl],
  )

  const query = useInfiniteQuery({
    queryKey,
    // `enabled`/`staleTime` sólo se incluyen si el caller los pasó: como
    // parámetros destructurados, meterlos siempre en el objeto (aunque sea
    // `undefined`) pisa el default global del QueryClient (staleTime: 60s)
    // con "siempre stale", forzando un refetch en cada visita.
    ...(enabled !== undefined ? { enabled } : {}),
    ...(staleTime !== undefined ? { staleTime } : {}),
    placeholderData: keepPrevious ? keepPreviousData : undefined,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number
      const enEspera = adelanto.current
      // Se consume una sola vez: cualquier pedido lo saca de la sala de
      // espera, así un refetch posterior nunca sirve datos viejos desde acá.
      adelanto.current = null

      if (enEspera && enEspera.offset === offset && enEspera.hash === hashActual.current) {
        try {
          return await enEspera.promesa
        } catch {
          // El adelanto se pidió sin nadie mirando y falló. Ahora sí hay
          // alguien esperando la fila en pantalla: se reintenta en serio y,
          // si vuelve a fallar, el error sale por el camino normal.
          return traerLote(offset)
        }
      }

      return traerLote(offset)
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.next) return undefined
      return offsetSiguiente(allPages)
    },
  })

  const { data, hasNextPage, isFetching, isError } = query
  const pages = data?.pages as Array<PaginatedPage<T>> | undefined

  useEffect(() => {
    if (!prefetchNext || enabled === false) return

    // El listado está pidiendo algo: el primer lote, un filtro nuevo, un
    // refetch por invalidación, o el lote que el usuario acaba de alcanzar.
    // Lo que estuviera adelantado quedó viejo y no competimos por la
    // conexión: el efecto vuelve a correr cuando esto termine.
    if (isFetching) {
      adelanto.current = null
      return
    }

    // Se llegó al final de la lista: acá no se pide nada más.
    if (!hasNextPage) {
      adelanto.current = null
      return
    }

    if (isError || !pages || pages.length === 0) return

    const offset = offsetSiguiente(pages)
    const yaPedido = adelanto.current
    if (yaPedido && yaPedido.offset === offset && yaPedido.hash === hashDeLaKey) return

    const promesa = traerLote(offset)
    // Todavía no lo espera nadie: sin esto, un adelanto fallido sale por
    // consola como unhandled rejection. El `await` del queryFn sigue viendo
    // el rechazo igual.
    promesa.catch(() => {})
    adelanto.current = { offset, hash: hashDeLaKey, promesa }
  }, [prefetchNext, enabled, pages, hasNextPage, isFetching, isError, hashDeLaKey, traerLote])

  return query
}

/** Hace flat de las páginas a un array único para renderizar. */
export const flattenPages = <T,>(pages?: Array<PaginatedPage<T>>): T[] =>
  pages?.flatMap((page) => page.results) ?? []
