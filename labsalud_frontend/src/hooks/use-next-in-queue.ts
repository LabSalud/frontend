"use client"

import { useMemo } from "react"
import { useApiQuery } from "@/hooks/use-api-query"
import { RESULTS_ENDPOINTS } from "@/config/api"
import { appendStatusParams, normalizeStatusFilter, statusFilterKey } from "@/lib/status-filter"

/**
 * Devuelve el protocolo anterior y siguiente en la cola (resultados/validación),
 * usando los mismos filtros de estado que el usuario dejó guardados en
 * localStorage. Sirve para saltar entre detalles sin volver a la tabla.
 */
export function useQueueNav(currentId: number, statusStorageKey: string): { prevId: number | null; nextId: number | null } {
  const filter = useMemo(() => {
    try {
      const raw = localStorage.getItem(statusStorageKey)
      return normalizeStatusFilter(raw ? JSON.parse(raw) : null)
    } catch {
      return { include: [], exclude: [] }
    }
  }, [statusStorageKey])

  const params = new URLSearchParams({ limit: "100", offset: "0" })
  appendStatusParams(params, filter)
  const url = `${RESULTS_ENDPOINTS.QUEUE}?${params.toString()}`

  const query = useApiQuery<{ results: Array<{ id: number }> }>({
    queryKey: ["queue-nav", statusStorageKey, statusFilterKey(filter)],
    url,
    enabled: Number.isFinite(currentId) && currentId > 0,
    staleTime: 30 * 1000,
  })

  const ids = query.data?.results?.map((r) => r.id) ?? []
  const idx = ids.indexOf(currentId)
  if (idx < 0) return { prevId: null, nextId: null }
  return {
    prevId: idx > 0 ? ids[idx - 1] : null,
    nextId: idx < ids.length - 1 ? ids[idx + 1] : null,
  }
}
