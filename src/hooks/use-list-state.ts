"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { SortState } from "@/components/common/data-table"

/**
 * Estado persistente de un listado (búsqueda + orden + filtros), guardado en
 * sessionStorage por `storageKey`. Sobrevive la navegación lista → detalle →
 * volver, sin ensuciar la URL ni el localStorage permanente.
 *
 * El `orderingParam` ya viene en el formato de DRF OrderingFilter
 * (`field` / `-field`) listo para mandar como query param.
 */
export interface ListState<F> {
  search: string
  setSearch: (value: string) => void
  sort: SortState
  setSort: (sort: SortState) => void
  filters: F
  setFilters: (filters: F | ((prev: F) => F)) => void
  /** `?ordering=` listo para el backend, o `undefined` si no hay orden. */
  orderingParam: string | undefined
  reset: () => void
}

interface PersistedShape<F> {
  search: string
  sort: SortState
  filters: F
}

function readPersisted<F>(storageKey: string, fallback: PersistedShape<F>): PersistedShape<F> {
  try {
    const raw = sessionStorage.getItem(storageKey)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<PersistedShape<F>>
    return {
      search: parsed.search ?? fallback.search,
      sort: parsed.sort ?? fallback.sort,
      filters: { ...fallback.filters, ...(parsed.filters ?? {}) },
    }
  } catch {
    return fallback
  }
}

export function useListState<F extends Record<string, unknown>>(options: {
  storageKey: string
  defaultFilters: F
  defaultSort?: SortState
}): ListState<F> {
  const { storageKey, defaultFilters, defaultSort = null } = options

  const fallback = useMemo<PersistedShape<F>>(
    () => ({ search: "", sort: defaultSort, filters: defaultFilters }),
    // defaultFilters/defaultSort se asumen estables por convención de uso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [state, setState] = useState<PersistedShape<F>>(() => readPersisted(storageKey, fallback))

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // sessionStorage lleno o no disponible: degradar silenciosamente.
    }
  }, [storageKey, state])

  const setSearch = useCallback((value: string) => {
    setState((prev) => ({ ...prev, search: value }))
  }, [])

  const setSort = useCallback((sort: SortState) => {
    setState((prev) => ({ ...prev, sort }))
  }, [])

  const setFilters = useCallback((filters: F | ((prev: F) => F)) => {
    setState((prev) => ({
      ...prev,
      filters:
        typeof filters === "function" ? (filters as (p: F) => F)(prev.filters) : filters,
    }))
  }, [])

  const reset = useCallback(() => setState(fallback), [fallback])

  const orderingParam = state.sort
    ? `${state.sort.dir === "desc" ? "-" : ""}${state.sort.field}`
    : undefined

  return {
    search: state.search,
    setSearch,
    sort: state.sort,
    setSort,
    filters: state.filters,
    setFilters,
    orderingParam,
    reset,
  }
}
