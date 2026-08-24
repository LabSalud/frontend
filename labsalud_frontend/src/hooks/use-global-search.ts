"use client"

import { useApiQuery } from "@/hooks/use-api-query"
import { SEARCH_ENDPOINTS } from "@/config/api"
import { PERMISSIONS } from "@/config/permissions"
import type { GlobalSearchCounts, GlobalSearchFilter, GlobalSearchResponse } from "@/types"

/** El backend devuelve `results: []` con menos de 2 caracteres: ni siquiera vale la pena pedirle. */
export const GLOBAL_SEARCH_MIN_CHARS = 2
export const GLOBAL_SEARCH_PAGE_SIZE = 20

/** Página de resultados. La búsqueda vive en la URL para ser compartible. */
export const GLOBAL_SEARCH_ROUTE = "/buscar"

export const GLOBAL_SEARCH_FILTERS: GlobalSearchFilter[] = [
  "all",
  "patient",
  "protocol",
  "result",
  "validation",
  "ledger",
]

/**
 * El libro diario es el único tipo con permiso propio.
 *
 * Los demás son cosas que cualquier usuario autenticado ya ve un click más
 * allá. El libro no: `administrar_libro_diario` existe justamente para que
 * haya quien opere el sistema sin ver cada movimiento de plata. El backend no
 * lo consulta sin el permiso —el conteo llega en cero—; acá se esconde también
 * el chip, para no ofrecer un filtro que nunca puede traer nada.
 */
export const GLOBAL_SEARCH_FILTROS_CON_PERMISO: Partial<Record<GlobalSearchFilter, string>> = {
  ledger: PERMISSIONS.MANAGE_LEDGER.codename,
}

export const isGlobalSearchFilter = (value: string | null): value is GlobalSearchFilter =>
  value !== null && (GLOBAL_SEARCH_FILTERS as string[]).includes(value)

/** Arma el link a la página de resultados. Se usa desde la navbar y desde la propia página. */
export function buildGlobalSearchPath({
  q,
  type = "all",
  page = 1,
}: {
  q: string
  type?: GlobalSearchFilter
  page?: number
}) {
  const params = new URLSearchParams({ q: q.trim() })
  // `all` y la página 1 son los valores por defecto: dejarlos afuera mantiene la
  // URL corta y hace que dos búsquedas iguales generen la misma URL.
  if (type !== "all") params.set("type", type)
  if (page > 1) params.set("page", String(page))
  return `${GLOBAL_SEARCH_ROUTE}?${params.toString()}`
}

export type GlobalSearchState = "idle" | "loading" | "error" | "empty" | "results"

interface UseGlobalSearchParams {
  /** Término crudo de la URL; acá se trimmea. */
  term: string
  type: GlobalSearchFilter
  page: number
  pageSize?: number
}

const EMPTY_COUNTS: GlobalSearchCounts = {
  all: 0,
  patient: 0,
  protocol: 0,
  result: 0,
  validation: 0,
  ledger: 0,
}

/**
 * Búsqueda global paginada. Se dispara con el término que ya está en la URL
 * (la página se navega recién al apretar Enter), así que no hay debounce: cada
 * llamada corresponde a una búsqueda que el usuario pidió explícitamente.
 */
export function useGlobalSearch({
  term,
  type,
  page,
  pageSize = GLOBAL_SEARCH_PAGE_SIZE,
}: UseGlobalSearchParams) {
  const searchedTerm = term.trim()
  const isEnabled = searchedTerm.length >= GLOBAL_SEARCH_MIN_CHARS

  const query = useApiQuery<GlobalSearchResponse>({
    queryKey: ["global-search", searchedTerm, type, page, pageSize],
    url: SEARCH_ENDPOINTS.GLOBAL({ q: searchedTerm, type, page, pageSize }),
    enabled: isEnabled,
    // Volver atrás a una búsqueda recién hecha no vuelve a pegarle al backend.
    staleTime: 60 * 1000,
  })

  const data = isEnabled ? query.data : undefined
  const results = data?.results ?? []

  let state: GlobalSearchState = "loading"
  if (!isEnabled) {
    state = "idle"
  } else if (query.isError) {
    state = "error"
  } else if (query.isLoading) {
    state = "loading"
  } else if (results.length > 0) {
    state = "results"
  } else if (query.isSuccess) {
    state = "empty"
  }

  return {
    state,
    results,
    counts: data?.counts ?? EMPTY_COUNTS,
    countsCapped: data?.counts_capped ?? false,
    countsCap: data?.counts_cap,
    hasNext: data?.has_next ?? false,
    pageSize: data?.page_size ?? pageSize,
    tookMs: data?.took_ms,
    searchedTerm,
    error: query.error,
    /** Hay una búsqueda en vuelo (para el spinner del input, sin tapar la tabla). */
    isFetching: isEnabled && query.isFetching,
    refetch: query.refetch,
  }
}
