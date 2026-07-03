/**
 * Filtro de estado tri-estado (neutral → incluir → excluir → neutral), igual que
 * en Protocolos. Compartido por Resultados y Validación (lista + cola de detalle)
 * para que el toggle de excluir funcione idéntico en todas las pantallas.
 */
export type StatusFilterState = { include: number[]; exclude: number[] }

const onlyInts = (value: unknown): number[] =>
  Array.isArray(value) ? (value.filter((n) => Number.isInteger(n)) as number[]) : []

/** Acepta el formato nuevo {include, exclude} o el legado (array de ids = incluidos). */
export function normalizeStatusFilter(value: unknown): StatusFilterState {
  if (Array.isArray(value)) return { include: onlyInts(value), exclude: [] }
  if (value && typeof value === "object") {
    const v = value as { include?: unknown; exclude?: unknown }
    return { include: onlyInts(v.include), exclude: onlyInts(v.exclude) }
  }
  return { include: [], exclude: [] }
}

export function toggleStatusFilter(prev: StatusFilterState, statusId: number): StatusFilterState {
  const inInclude = prev.include.includes(statusId)
  const inExclude = prev.exclude.includes(statusId)
  if (!inInclude && !inExclude) return { ...prev, include: [...prev.include, statusId] }
  if (inInclude) {
    return { include: prev.include.filter((id) => id !== statusId), exclude: [...prev.exclude, statusId] }
  }
  return { ...prev, exclude: prev.exclude.filter((id) => id !== statusId) }
}

export function getStatusFilterState(filter: StatusFilterState, statusId: number): "neutral" | "include" | "exclude" {
  if (filter.include.includes(statusId)) return "include"
  if (filter.exclude.includes(statusId)) return "exclude"
  return "neutral"
}

export const hasAnyStatusFilter = (filter: StatusFilterState) => filter.include.length > 0 || filter.exclude.length > 0

/** Clave estable para react-query. */
export const statusFilterKey = (filter: StatusFilterState) =>
  `${[...filter.include].sort((a, b) => a - b).join(",")}|${[...filter.exclude].sort((a, b) => a - b).join(",")}`

export function appendStatusParams(params: URLSearchParams, filter: StatusFilterState) {
  if (filter.include.length > 0) params.append("status", filter.include.join(","))
  if (filter.exclude.length > 0) params.append("exclude_status", filter.exclude.join(","))
}
