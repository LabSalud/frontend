"use client"

import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { TestTube, Search, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiInfiniteQuery, flattenPages } from "@/hooks/use-api-infinite-query"
import { useApiQuery } from "@/hooks/use-api-query"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useDebounce } from "@/hooks/use-debounce"
import { usePersistedState } from "@/hooks/use-persisted-state"
import { ResultsQueueTable } from "./components/results-queue-table"
import { RESULTS_ENDPOINTS, ANALYTICS_ENDPOINTS } from "@/config/api"
import { getProtocolStatusStyle, normalizeProtocolStatusName } from "@/lib/status-styles"
import { cn } from "@/lib/utils"
import type { SortState } from "@/components/common/data-table"
import type { ProtocolListItem } from "@/types"

const PAGE_LIMIT = 20
const HIDDEN_STATUS = new Set(["pendiente de facturacion", "facturado"])

interface StatusStatsResponse {
  total_protocols: number
  states: Array<{ status_id: number; status_name: string; count: number }>
}

export default function ResultadosPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearch = useDebounce(searchTerm, 300)
  const [statusIds, setStatusIds] = usePersistedState<number[]>("labsalud_results_status", [1, 2])
  const [sort, setSort] = useState<SortState>(null)

  // Cantidad de protocolos por estado, para las chips (mismo dato que Protocolos).
  const statsQuery = useApiQuery<StatusStatsResponse>({
    queryKey: ["analytics", "protocols-by-status"],
    url: ANALYTICS_ENDPOINTS.PROTOCOLS_BY_STATUS,
    staleTime: 30 * 1000,
  })
  const states = (statsQuery.data?.states || []).filter(
    (s) => !HIDDEN_STATUS.has(normalizeProtocolStatusName(s.status_name)),
  )

  const orderingParam = sort ? `${sort.dir === "desc" ? "-" : ""}${sort.field}` : undefined
  const statusKey = statusIds.slice().sort((a, b) => a - b).join(",")
  const queryKey = ["results", "queue", statusKey, debouncedSearch.trim(), orderingParam ?? ""] as const

  const buildUrl = useCallback(
    (offset: number) => {
      const params = new URLSearchParams({ limit: String(PAGE_LIMIT), offset: String(offset) })
      if (statusIds.length > 0) params.append("status", statusIds.join(","))
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim())
      if (orderingParam) params.append("ordering", orderingParam)
      return `${RESULTS_ENDPOINTS.QUEUE}?${params.toString()}`
    },
    [statusIds, debouncedSearch, orderingParam],
  )

  const query = useApiInfiniteQuery<ProtocolListItem>({ queryKey, buildUrl })
  const protocols = flattenPages<ProtocolListItem>(query.data?.pages)
  const isLoadingMore = query.isFetchingNextPage
  const hasMore = !!query.hasNextPage

  const sentinelRef = useInfiniteScroll({
    loading: isLoadingMore,
    hasMore,
    onLoadMore: () => {
      if (!isLoadingMore && hasMore) query.fetchNextPage()
    },
    dependencies: [statusKey, debouncedSearch, orderingParam, hasMore, isLoadingMore],
  })

  const toggleStatus = (id: number) =>
    setStatusIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))

  return (
    <div className="mx-auto w-full max-w-full px-4 py-4">
      <div className="rounded-2xl bg-white/95 p-4 shadow-md backdrop-blur-sm md:p-6">
        {/* Fila superior: título (izq) · búsqueda (centro) */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex items-center gap-2 lg:w-56 lg:shrink-0">
            <TestTube className="h-6 w-6 text-[#204983]" />
            <h1 className="text-xl font-bold text-gray-800 md:text-2xl">Carga de Resultados</h1>
          </div>
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por ID o paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pl-11 pr-10"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            )}
            {query.isFetching && !isLoadingMore && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-[#204983]" />
              </div>
            )}
          </div>
          <div className="hidden lg:block lg:w-56 lg:shrink-0" aria-hidden />
        </div>

        {/* Toggles de todos los estados, con cantidad */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {statsQuery.isLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-28 rounded-full" />)
            : states.map((s) => {
                const active = statusIds.includes(s.status_id)
                const style = getProtocolStatusStyle(s.status_id)
                return (
                  <button
                    key={s.status_id}
                    type="button"
                    onClick={() => toggleStatus(s.status_id)}
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                      active ? `${style.solid} border-transparent text-white` : style.badgeOutline,
                    )}
                  >
                    {s.status_name}
                    <span className={cn("rounded-full px-1.5 text-[11px]", active ? "bg-white/25" : "bg-white/70 text-gray-700")}>
                      {s.count}
                    </span>
                  </button>
                )
              })}
        </div>

        {/* Cola */}
        <div className="mt-4 space-y-4">
          <ResultsQueueTable
            protocols={protocols}
            onRowClick={(id) => navigate(`/resultados/${id}`)}
            sort={sort}
            onSortChange={setSort}
            isLoading={query.isLoading}
          />
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-2">
              {isLoadingMore && <Skeleton className="h-8 w-40 rounded" />}
            </div>
          )}
          {!hasMore && protocols.length > 0 && (
            <p className="py-2 text-center text-sm text-gray-400">No hay más protocolos</p>
          )}
        </div>
      </div>
    </div>
  )
}
