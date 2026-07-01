"use client"

import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { TestTube, Search, X, Loader2, Clock, ListChecks, FlaskConical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useApiInfiniteQuery, flattenPages } from "@/hooks/use-api-infinite-query"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useDebounce } from "@/hooks/use-debounce"
import { ResultsQueueTable } from "./components/results-queue-table"
import { AnalysisAccordionView } from "./components/analysis-accordion-view"
import { RESULTS_ENDPOINTS } from "@/config/api"
import { getProtocolStatusStyle } from "@/lib/status-styles"
import type { SortState } from "@/components/common/data-table"
import type { ProtocolListItem } from "@/types"

const PAGE_LIMIT = 20

// Estados relevantes para la cola de resultados (mismo look que Protocolos).
const STATUS_CHIPS = [
  { id: 1, icon: Clock, label: "Pend. carga" },
  { id: 2, icon: ListChecks, label: "Pend. validación" },
  { id: 11, icon: FlaskConical, label: "Pend. revisión" },
] as const

export default function ResultadosPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState("por-protocolo")
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearch = useDebounce(searchTerm, 300)
  const [statusIds, setStatusIds] = useState<number[]>([1, 2])
  const [sort, setSort] = useState<SortState>(null)

  const orderingParam = sort ? `${sort.dir === "desc" ? "-" : ""}${sort.field}` : undefined
  const statusKey = statusIds.slice().sort().join(",")
  const queryKey = ["results", "queue", statusKey, debouncedSearch.trim(), orderingParam ?? ""] as const

  const buildUrl = useCallback(
    (offset: number) => {
      const params = new URLSearchParams({ limit: String(PAGE_LIMIT), offset: String(offset) })
      if (statusIds.length > 0) params.append("status", statusIds.join(","))
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim())
      if (orderingParam) params.append("ordering", orderingParam)
      return `${RESULTS_ENDPOINTS.PROTOCOLS_WITH_LOADED_RESULTS}?${params.toString()}`
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

  const hasAnyChip = useMemo(() => statusIds.length > 0, [statusIds])

  return (
    <div className="mx-auto w-full max-w-full px-4 py-4">
      <div className="rounded-2xl bg-white/95 p-4 shadow-md backdrop-blur-sm md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <TestTube className="h-6 w-6 text-[#204983]" />
          <h1 className="text-xl font-bold text-gray-800 md:text-2xl">Carga de Resultados</h1>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-4 bg-gray-100">
            <TabsTrigger value="por-protocolo" className="data-[state=active]:bg-white data-[state=active]:text-[#204983]">
              Por protocolo
            </TabsTrigger>
            <TabsTrigger value="por-analisis" className="data-[state=active]:bg-white data-[state=active]:text-[#204983]">
              Por análisis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="por-protocolo">
            {/* Búsqueda al medio + toggles de estado centrados (estilo Protocolos) */}
            <div className="flex flex-col gap-3">
              <div className="relative mx-auto w-full lg:max-w-xl">
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

              <div className="flex flex-wrap justify-center gap-2">
                {STATUS_CHIPS.map((chip) => {
                  const active = statusIds.includes(chip.id)
                  const style = getProtocolStatusStyle(chip.id)
                  const Icon = chip.icon
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => toggleStatus(chip.id)}
                      className={`flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors ${
                        active ? `${style.solid} border-transparent text-white` : style.badgeOutline
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {chip.label}
                    </button>
                  )
                })}
                {!hasAnyChip && <span className="text-xs text-gray-400">Elegí al menos un estado</span>}
              </div>
            </div>

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
          </TabsContent>

          <TabsContent value="por-analisis">
            <AnalysisAccordionView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
