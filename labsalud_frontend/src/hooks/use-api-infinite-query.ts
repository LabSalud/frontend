import { useInfiniteQuery, keepPreviousData, type QueryKey } from "@tanstack/react-query"
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

/**
 * Wrapper sobre `useInfiniteQuery` que sigue la paginación DRF (`next` URL).
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
}

export function useApiInfiniteQuery<T = unknown>({
  queryKey,
  buildUrl,
  enabled,
  staleTime,
  keepPrevious,
}: UseApiInfiniteQueryParams) {
  const { apiRequest } = useApi()

  return useInfiniteQuery({
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
      const url = buildUrl(pageParam as number)
      const response = await apiRequest(url)
      if (!response.ok) {
        const message = await readApiError(response, `Error ${response.status}`)
        throw new Error(message)
      }
      return (await response.json()) as PaginatedPage<T>
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.next) return undefined
      return allPages.reduce((acc, page) => acc + page.results.length, 0)
    },
  })
}

/** Hace flat de las páginas a un array único para renderizar. */
export const flattenPages = <T,>(pages?: Array<PaginatedPage<T>>): T[] =>
  pages?.flatMap((page) => page.results) ?? []
