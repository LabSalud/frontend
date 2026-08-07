"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  FlaskConical,
  Loader2,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable, type Column } from "@/components/common/data-table"
import { cn } from "@/lib/utils"
import { formatDniForDisplay } from "@/lib/dni"
import { formatUtcDate } from "@/lib/format-utils"
import { getProtocolStatusBadgeClassByName } from "@/lib/status-styles"
import {
  buildGlobalSearchPath,
  GLOBAL_SEARCH_FILTERS,
  GLOBAL_SEARCH_MIN_CHARS,
  isGlobalSearchFilter,
  useGlobalSearch,
} from "@/hooks/use-global-search"
import type { GlobalSearchFilter, GlobalSearchItem } from "@/types"

// Chips de filtro, con el mismo look de pestaña pill que el resto de la app.
const CHIP_BASE =
  "flex h-8 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors"
const CHIP_ACTIVE = "border-[#204983] bg-[#204983] text-white shadow-sm"
const CHIP_IDLE = "border-transparent text-gray-600 hover:bg-gray-100"

const FILTER_LABELS: Record<GlobalSearchFilter, string> = {
  all: "Todo",
  patient: "Pacientes",
  protocol: "Protocolos",
  result: "Resultados",
  validation: "Validaciones",
}

// Etiqueta e ícono de cada tipo en la columna "Tipo" (en singular: es una fila).
const TYPE_META: Record<string, { label: string; icon: React.ElementType; badge: string }> = {
  patient: {
    label: "Paciente",
    icon: User,
    badge: "border-[#204983]/25 bg-[#204983]/10 text-[#204983]",
  },
  protocol: {
    label: "Protocolo",
    icon: FileText,
    badge: "border-amber-200 bg-amber-50 text-amber-700",
  },
  result: {
    label: "Resultado",
    icon: FlaskConical,
    badge: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  validation: {
    label: "Validación",
    icon: ShieldCheck,
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
}

// Si el backend suma un tipo nuevo, la fila igual se dibuja (con el tipo crudo
// como etiqueta) en vez de romper por un color que no existe.
const getTypeMeta = (type: string) =>
  TYPE_META[type] ?? { label: type, icon: Search, badge: "border-gray-200 bg-gray-100 text-gray-700" }

const SEARCH_HINTS = [
  { label: "Paciente", example: "Pérez, María" },
  { label: "DNI", example: "30123456" },
  { label: "N° de protocolo", example: "4822" },
  { label: "Análisis", example: "hemograma" },
]

/**
 * Con `counts_capped` el backend dejó de contar en un tope, así que los conteos
 * que llegaron a ese tope son un piso ("1000+"), no un total. Los que quedaron
 * por debajo terminaron de contarse y son exactos.
 */
function formatCount(value: number, cap: number | undefined, capped: boolean) {
  if (!capped || !cap) return String(value)
  return value >= cap ? `${value}+` : String(value)
}

/**
 * En una fila de paciente el nombre ya es el título (y el DNI, el subtítulo):
 * repetirlo en la columna "Paciente" es ruido, no información.
 */
const showsPatient = (item: GlobalSearchItem) =>
  Boolean(item.patient) && item.patient?.name !== item.title

const parsePage = (raw: string | null) => {
  const parsed = Number(raw)
  // `?page=0`, `?page=-3` o `?page=hola` no tienen por qué romper la pantalla.
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 px-4 py-14 text-center">
      <Icon className="h-8 w-8 text-gray-300" />
      <p className="mt-3 text-sm font-medium text-gray-700">{title}</p>
      <div className="mt-1 text-sm text-gray-500">{description}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export default function SearchResultsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const urlTerm = searchParams.get("q") ?? ""
  const rawType = searchParams.get("type")
  const type: GlobalSearchFilter = isGlobalSearchFilter(rawType) ? rawType : "all"
  const page = parsePage(searchParams.get("page"))

  const [inputValue, setInputValue] = useState(urlTerm)

  // La URL manda: si cambia (Enter en la navbar, botón atrás, link compartido)
  // el input tiene que reflejar lo que se está mostrando.
  useEffect(() => {
    setInputValue(urlTerm)
  }, [urlTerm])

  const { state, results, counts, countsCapped, countsCap, hasNext, pageSize, tookMs, searchedTerm, error, isFetching, refetch } =
    useGlobalSearch({ term: urlTerm, type, page })

  const goTo = (next: { q?: string; type?: GlobalSearchFilter; page?: number }) => {
    navigate(
      buildGlobalSearchPath({
        q: next.q ?? urlTerm,
        type: next.type ?? type,
        page: next.page ?? page,
      }),
    )
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const term = inputValue.trim()
    if (term.length < GLOBAL_SEARCH_MIN_CHARS) return
    // Término nuevo ⇒ vuelve a la primera página: la 3 de la búsqueda anterior
    // no significa nada para esta.
    goTo({ q: term, page: 1 })
  }

  const clearSearch = () => {
    setInputValue("")
    // Sin término la pantalla queda en su estado inicial, pero sigue siendo una
    // URL válida y compartible (por eso se navega en vez de solo limpiar el input).
    setSearchParams({}, { replace: true })
  }

  const columns: Column<GlobalSearchItem>[] = [
    {
      id: "type",
      header: "Tipo",
      className: "w-32 align-top",
      headerClassName: "w-32",
      cell: (item) => {
        const meta = getTypeMeta(item.type)
        const TypeIcon = meta.icon
        return (
          <Badge variant="outline" className={cn("gap-1 font-medium", meta.badge)}>
            <TypeIcon className="h-3 w-3" />
            <span className="truncate">{meta.label}</span>
          </Badge>
        )
      },
    },
    {
      id: "title",
      header: "Resultado",
      // Sin `whitespace-nowrap` (el default de la celda) el texto largo envuelve
      // en vez de estirar la tabla y obligar a scrollear de costado en mobile.
      className: "align-top whitespace-normal",
      cell: (item) => {
        const withPatient = showsPatient(item)
        const dni = withPatient ? formatDniForDisplay(item.patient?.dni) : ""
        return (
          <div className="min-w-0">
            <p className="font-medium text-gray-900">{item.title}</p>
            {(item.subtitle || item.matched_on) && (
              <p className="text-xs text-gray-500">
                {item.subtitle}
                {item.subtitle && item.matched_on && <span className="text-gray-300"> · </span>}
                {item.matched_on && (
                  <span className="text-gray-400">coincide por {item.matched_on}</span>
                )}
              </p>
            )}
            {/* En pantallas chicas no entran las columnas de la derecha: el dato
                no se pierde, se apila acá abajo. */}
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-gray-500 lg:hidden">
              {withPatient && <span className="md:hidden">{item.patient?.name}</span>}
              {dni && <span className="text-gray-400 md:hidden">DNI {dni}</span>}
              {item.status && <span>{item.status}</span>}
              {item.date && <span className="tabular-nums">{formatUtcDate(item.date)}</span>}
            </p>
          </div>
        )
      },
    },
    {
      id: "patient",
      header: "Paciente",
      responsive: "hidden md:table-cell",
      className: "align-top whitespace-normal",
      cell: (item) => {
        if (!showsPatient(item)) return <span className="text-gray-300">—</span>
        const dni = formatDniForDisplay(item.patient?.dni)
        return (
          <div className="min-w-0 text-sm text-gray-600">
            <p>{item.patient?.name}</p>
            {dni && <p className="text-xs text-gray-400">DNI {dni}</p>}
          </div>
        )
      },
    },
    {
      id: "status",
      header: "Estado",
      responsive: "hidden lg:table-cell",
      className: "w-40 align-top",
      headerClassName: "w-40",
      cell: (item) =>
        item.status ? (
          <Badge
            variant="outline"
            className={cn("max-w-full truncate", getProtocolStatusBadgeClassByName(item.status, true))}
          >
            <span className="truncate">{item.status}</span>
          </Badge>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      id: "date",
      header: "Fecha",
      responsive: "hidden lg:table-cell",
      className: "w-28 align-top text-sm text-gray-500 tabular-nums",
      headerClassName: "w-28",
      cell: (item) =>
        item.date ? formatUtcDate(item.date) : <span className="text-gray-300">—</span>,
    },
  ]

  const total = counts[type] ?? 0
  const firstOnPage = (page - 1) * pageSize + 1
  const lastOnPage = (page - 1) * pageSize + results.length

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 py-4">
      <div className="min-w-0 max-w-full rounded-2xl bg-white/95 p-4 shadow-md backdrop-blur-sm md:p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-800 md:text-2xl">Búsqueda</h1>
          <p className="text-sm text-gray-500">
            Pacientes, protocolos, resultados y validaciones, todo junto.
          </p>
        </div>

        <form role="search" onSubmit={handleSubmit} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Buscar por paciente, DNI, N° de protocolo o análisis…"
            aria-label="Buscar"
            autoComplete="off"
            spellCheck={false}
            className="h-11 pl-11 pr-20"
          />
          {isFetching && (
            <Loader2 className="pointer-events-none absolute right-12 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#204983]" />
          )}
          {inputValue && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {GLOBAL_SEARCH_FILTERS.map((filter) => {
            const isActive = filter === type
            return (
              <button
                key={filter}
                type="button"
                // Cambiar de filtro es una búsqueda nueva: arranca en la página 1.
                onClick={() => goTo({ type: filter, page: 1 })}
                aria-pressed={isActive}
                className={cn(CHIP_BASE, isActive ? CHIP_ACTIVE : CHIP_IDLE)}
              >
                {FILTER_LABELS[filter]}
                {/* Solo cuando los conteos son reales: un "0" mientras carga (o
                    si la búsqueda falló) diría que no hay nada, y no lo sabemos. */}
                {(state === "results" || state === "empty") && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[11px] tabular-nums",
                      isActive ? "bg-white/25" : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {formatCount(counts[filter] ?? 0, countsCap, countsCapped)}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-4">
          {state === "idle" && (
            <EmptyState
              icon={Search}
              title="Escribí algo para buscar"
              description={
                <>
                  <span>Mínimo {GLOBAL_SEARCH_MIN_CHARS} caracteres. Después, Enter.</span>
                  <div className="mt-4 grid grid-cols-1 gap-1.5 text-left sm:grid-cols-2">
                    {SEARCH_HINTS.map((hint) => (
                      <div key={hint.label} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">
                          {hint.label}
                        </span>
                        <span className="truncate text-gray-400">ej. {hint.example}</span>
                      </div>
                    ))}
                  </div>
                </>
              }
            />
          )}

          {state === "error" && (
            <EmptyState
              icon={AlertCircle}
              title="La búsqueda falló"
              description={error instanceof Error ? error.message : "No se pudo completar la búsqueda"}
              action={
                <Button variant="outline" onClick={() => refetch()}>
                  Reintentar
                </Button>
              }
            />
          )}

          {state === "empty" && (
            <EmptyState
              icon={Search}
              title={`Sin resultados para «${searchedTerm}»`}
              description={
                page > 1
                  ? "Esta página quedó vacía: puede que la búsqueda tenga menos páginas de las que pediste."
                  : type === "all"
                    ? "Probá con el apellido, el DNI sin puntos o el número de protocolo."
                    : "No hay coincidencias de este tipo. Probá con el filtro «Todo»."
              }
              action={
                page > 1 && (
                  <Button variant="outline" onClick={() => goTo({ page: 1 })}>
                    Volver a la primera página
                  </Button>
                )
              }
            />
          )}

          {(state === "loading" || state === "results") && (
            <>
              <DataTable<GlobalSearchItem>
                columns={columns}
                rows={results}
                getRowId={(item) => `${item.type}-${item.id}`}
                onRowClick={(item) => navigate(item.url)}
                isLoading={state === "loading"}
                skeletonRows={8}
              />

              {state === "results" && (
                <div className="mt-3 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p className="text-xs text-gray-500">
                    {firstOnPage}–{lastOnPage} de {formatCount(total, countsCap, countsCapped)}
                    {typeof tookMs === "number" && ` · ${Math.round(tookMs)} ms`}
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => goTo({ page: page - 1 })}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-xs text-gray-500 tabular-nums">Página {page}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasNext}
                      onClick={() => goTo({ page: page + 1 })}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
