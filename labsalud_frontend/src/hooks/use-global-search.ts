"use client"

import { useCallback, useEffect, useState } from "react"
import { useApiQuery } from "@/hooks/use-api-query"
import { useApi } from "@/hooks/use-api"
import { SEARCH_ENDPOINTS } from "@/config/api"
import { PERMISSIONS } from "@/config/permissions"
import { readApiError } from "@/lib/api-error"
import type {
  GlobalSearchCounts,
  GlobalSearchFilter,
  GlobalSearchItem,
  GlobalSearchResponse,
  GlobalSearchType,
} from "@/types"

/** El backend devuelve `results: []` con menos de 2 caracteres: ni siquiera vale la pena pedirle. */
export const GLOBAL_SEARCH_MIN_CHARS = 2
export const GLOBAL_SEARCH_PAGE_SIZE = 20

/** Página de resultados. La búsqueda vive en la URL para ser compartible. */
export const GLOBAL_SEARCH_ROUTE = "/buscar"

/**
 * El libro diario es el único tipo con permiso propio.
 *
 * Los demás son cosas que cualquier usuario autenticado ya ve un click más
 * allá. El libro no: `administrar_libro_diario` existe justamente para que
 * haya quien opere el sistema sin ver cada movimiento de plata. El backend no
 * lo consulta sin el permiso —el conteo llega en cero—; acá se esconde también
 * la columna, para no mostrar una que siempre va a decir "ninguno".
 */
export const GLOBAL_SEARCH_FILTROS_CON_PERMISO: Partial<Record<GlobalSearchFilter, string>> = {
  ledger: PERMISSIONS.MANAGE_LEDGER.codename,
}

/**
 * El link a la página de resultados. Lo usan la navbar y la propia página.
 *
 * Solo el término: la pantalla muestra TODOS los tipos a la vez, así que ya no
 * hay un filtro ni una página que poner en la URL. Un link viejo con `?type=`
 * o `?page=` sigue funcionando —esos parámetros simplemente se ignoran.
 */
export function buildGlobalSearchPath({ q }: { q: string }) {
  const params = new URLSearchParams({ q: q.trim() })
  return `${GLOBAL_SEARCH_ROUTE}?${params.toString()}`
}

export type GlobalSearchState = "idle" | "loading" | "error" | "empty" | "results"

const EMPTY_COUNTS: GlobalSearchCounts = {
  all: 0,
  patient: 0,
  protocol: 0,
  result: 0,
  validation: 0,
  ledger: 0,
  analysis: 0,
}

// ---------------------------------------------------------------------------
// Una columna por tipo
// ---------------------------------------------------------------------------

/** Los tipos, en el orden en que se muestran las columnas. */
export const GLOBAL_SEARCH_TIPOS: GlobalSearchType[] = [
  "patient",
  "protocol",
  "result",
  "validation",
  // El catálogo va después de lo que le pasa a un paciente y antes de la
  // plata: buscando un apellido es lo menos probable que se esté buscando,
  // pero buscando un análisis es lo primero.
  "analysis",
  "ledger",
]

export interface ColumnaDeBusqueda {
  tipo: GlobalSearchType
  items: GlobalSearchItem[]
  /** Total del tipo (acotado por el tope del backend). */
  total: number
  /** Quedan resultados sin traer. */
  hayMas: boolean
  cargandoMas: boolean
}

const SIN_ITEMS: GlobalSearchItem[] = []

/**
 * La búsqueda con los resultados repartidos en una columna por tipo.
 *
 * UNA SOLA REQUEST, NO UNA POR COLUMNA
 * ====================================
 * El backend ya calcula los candidatos de todos los tipos en cada búsqueda
 * —son los que alimentan los conteos—, así que con `?group=type` devuelve los
 * primeros de cada uno sin buscar cinco veces. Pedir una búsqueda por columna
 * desde acá serían cinco requests por término tipeado contra el endpoint más
 * caro del sistema, que además está limitado a 30 por minuto por usuario.
 *
 * El "cargar más" de cada columna sí es una request, pero solo cuando alguien
 * la pide y solo para esa columna: usa el endpoint plano de siempre
 * (`type=<tipo>&page=N`).
 */
export function useGlobalSearchPorTipo({
  term,
  pageSize = GLOBAL_SEARCH_PAGE_SIZE,
}: {
  term: string
  pageSize?: number
}) {
  const { apiRequest } = useApi()
  const searchedTerm = term.trim()
  const isEnabled = searchedTerm.length >= GLOBAL_SEARCH_MIN_CHARS

  const query = useApiQuery<GlobalSearchResponse>({
    queryKey: ["global-search", "por-tipo", searchedTerm, pageSize],
    url: SEARCH_ENDPOINTS.GLOBAL({ q: searchedTerm, pageSize, porTipo: true }),
    enabled: isEnabled,
    staleTime: 60 * 1000,
  })

  // Lo que se fue trayendo con "cargar más", por columna. Vive acá y no en la
  // cache de react-query porque es un append sobre la respuesta de arriba, no
  // una consulta propia con su propio ciclo de vida.
  const [extra, setExtra] = useState<Partial<Record<GlobalSearchType, GlobalSearchItem[]>>>({})
  const [paginas, setPaginas] = useState<Partial<Record<GlobalSearchType, number>>>({})
  const [hayMasExtra, setHayMasExtra] = useState<Partial<Record<GlobalSearchType, boolean>>>({})
  // Un conjunto y no "la columna que está cargando": en una pantalla ancha se
  // ven varias columnas cortas a la vez y sus centinelas de scroll infinito
  // disparan juntos. Con un solo lugar, la segunda columna se descartaba en
  // silencio y quedaba clavada hasta que alguien la scrolleara a mano.
  const [cargando, setCargando] = useState<Set<GlobalSearchType>>(new Set())

  // Término nuevo, columnas nuevas: lo traído para "perez" no tiene nada que
  // hacer abajo de los resultados de "gomez".
  useEffect(() => {
    setExtra({})
    setPaginas({})
    setHayMasExtra({})
    setCargando(new Set())
  }, [searchedTerm])

  const data = isEnabled ? query.data : undefined
  const grupos = data?.groups
  const gruposHasNext = data?.groups_has_next

  const cargarMas = useCallback(
    async (tipo: GlobalSearchType) => {
      if (!isEnabled || cargando.has(tipo)) return
      const siguiente = (paginas[tipo] ?? 1) + 1
      setCargando((prev) => new Set(prev).add(tipo))
      try {
        const respuesta = await apiRequest(
          SEARCH_ENDPOINTS.GLOBAL({ q: searchedTerm, type: tipo, page: siguiente, pageSize }),
        )
        if (!respuesta.ok) {
          throw new Error(await readApiError(respuesta, "No se pudo traer más resultados"))
        }
        const payload: GlobalSearchResponse = await respuesta.json()
        setExtra((prev) => ({ ...prev, [tipo]: [...(prev[tipo] ?? []), ...payload.results] }))
        setPaginas((prev) => ({ ...prev, [tipo]: siguiente }))
        setHayMasExtra((prev) => ({ ...prev, [tipo]: payload.has_next }))
      } catch {
        // Silencioso a propósito: es un "traeme más" opcional sobre una lista
        // que ya está en pantalla. El botón vuelve a estar disponible.
      } finally {
        setCargando((prev) => {
          const siguiente = new Set(prev)
          siguiente.delete(tipo)
          return siguiente
        })
      }
    },
    [apiRequest, cargando, isEnabled, pageSize, paginas, searchedTerm],
  )

  const counts = data?.counts ?? EMPTY_COUNTS

  const columnas: ColumnaDeBusqueda[] = GLOBAL_SEARCH_TIPOS.map((tipo) => ({
    tipo,
    items: [...(grupos?.[tipo] ?? SIN_ITEMS), ...(extra[tipo] ?? SIN_ITEMS)],
    total: counts[tipo] ?? 0,
    hayMas: hayMasExtra[tipo] ?? gruposHasNext?.[tipo] ?? false,
    cargandoMas: cargando.has(tipo),
  }))

  const hayAlgo = columnas.some((columna) => columna.items.length > 0)

  let state: GlobalSearchState = "loading"
  if (!isEnabled) {
    state = "idle"
  } else if (query.isError) {
    state = "error"
  } else if (query.isLoading) {
    state = "loading"
  } else if (hayAlgo) {
    state = "results"
  } else if (query.isSuccess) {
    state = "empty"
  }

  return {
    state,
    columnas,
    counts,
    countsCapped: data?.counts_capped ?? false,
    countsCap: data?.counts_cap,
    tookMs: data?.took_ms,
    searchedTerm,
    error: query.error,
    isFetching: isEnabled && query.isFetching,
    refetch: query.refetch,
    cargarMas,
  }
}
