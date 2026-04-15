"use client"
import { useState, useEffect, useCallback } from "react"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useDebounce } from "@/hooks/use-debounce"
import { CATALOG_ENDPOINTS } from "@/config/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AuditAvatars } from "@/components/common/audit-avatars"
import {
  Loader2,
  Search,
  ChevronDown,
  ChevronRight,
  TestTube,
  Pencil,
  Trash,
  PackageX,
  Plus,
  History,
  Download,
} from "lucide-react"
import { AnalysisList } from "./components/analysis-list"
import { CreateAnalysisCatalogDialog } from "./components/create-analysis-catalog-dialog"
import { EditAnalysisCatalogDialog } from "./components/edit-analysis-catalog-dialog"
import { DeleteAnalysisCatalogDialog } from "./components/delete-analysis-catalog-dialog"
import { ImportDataDialog } from "./components/import-data-dialog"
import { AnalysisHistoryDialog } from "./components/analysis-history-dialog"
import type { Analysis } from "@/types"

export function AnalysisManagement() {
  const { apiRequest } = useApi()
  const toastActions = useToast()

  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [totalAnalyses, setTotalAnalyses] = useState(0)
  const [analysesNextUrl, setAnalysesNextUrl] = useState<string | null>(null)
  const [expandedAnalyses, setExpandedAnalyses] = useState<Set<number>>(new Set())

  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const [refreshKey, setRefreshKey] = useState(0)

  const [isCreateAnalysisModalOpen, setIsCreateAnalysisModalOpen] = useState(false)
  const [isEditAnalysisModalOpen, setIsEditAnalysisModalOpen] = useState(false)
  const [isDeleteAnalysisModalOpen, setIsDeleteAnalysisModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
  const [selectedAnalysisForHistory, setSelectedAnalysisForHistory] = useState<Analysis | null>(null)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)

  const fetchAnalyses = useCallback(
    async (search = "", reset = true, showSearching = false) => {
      if (reset && !showSearching && isLoadingInitial) return
      if (!reset && isLoadingMore) return
      if (reset && showSearching && isSearching) return

      if (reset && !showSearching) {
        setIsLoadingInitial(true)
        setError(null)
      } else if (reset && showSearching) {
        setIsSearching(true)
      } else {
        setIsLoadingMore(true)
      }

      try {
        let url: string
        if (reset) {
          const params = new URLSearchParams({
            limit: "20",
            is_active: "true",
          })
          if (search.trim()) {
            params.append("search", search.trim())
          }
          url = `${CATALOG_ENDPOINTS.ANALYSIS}?${params.toString()}`
        } else {
          url = analysesNextUrl!
        }

        if (!url) return

        const response = await apiRequest(url)
        if (response.ok) {
          const data = await response.json()

          if (reset) {
            setAnalyses(data.results)
            setTotalAnalyses(data.count)
          } else {
            setAnalyses((prev) => [...prev, ...data.results])
          }

          setAnalysesNextUrl(data.next)
        } else {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage =
            errorData.detail || errorData.error || errorData.message || "Error al cargar los análisis."
          setError(errorMessage)
          toastActions.error("Error", { description: errorMessage })
        }
      } catch (err) {
        console.error("Error fetching analyses:", err)
        const errorMessage = err instanceof Error ? err.message : "Ocurrió un error inesperado al cargar análisis."
        setError(errorMessage)
        toastActions.error("Error", { description: errorMessage })
      } finally {
        setIsLoadingInitial(false)
        setIsLoadingMore(false)
        setIsSearching(false)
      }
    },
    [apiRequest, toastActions, analysesNextUrl, isLoadingInitial, isLoadingMore, isSearching],
  )

  const hasMore = !!analysesNextUrl

  const loadMore = useCallback(() => {
    if (!isLoadingMore && analysesNextUrl && !isSearching) {
      fetchAnalyses("", false)
    }
  }, [isLoadingMore, analysesNextUrl, isSearching, fetchAnalyses])

  const loadMoreSentinelRef = useInfiniteScroll({
    loading: isLoadingMore,
    hasMore: hasMore && !isSearching,
    onLoadMore: loadMore,
  })

  useEffect(() => {
    fetchAnalyses()
  }, [])

  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return
    fetchAnalyses(debouncedSearchTerm, true, true)
  }, [debouncedSearchTerm])

  const toggleAnalysis = (analysisId: number) => {
    setExpandedAnalyses((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(analysisId)) {
        newSet.delete(analysisId)
      } else {
        newSet.add(analysisId)
      }
      return newSet
    })
  }

  const handleCreateAnalysisSuccess = () => {
    setIsCreateAnalysisModalOpen(false)
    setRefreshKey((prev) => prev + 1)
    toastActions.success("Éxito", { description: "Análisis creado correctamente." })
  }

  const handleImportDataSuccess = () => {
    setIsImportModalOpen(false)
    setRefreshKey((prev) => prev + 1)
  }

  const handleEditAnalysisSuccess = () => {
    setIsEditAnalysisModalOpen(false)
    setSelectedAnalysis(null)
    setRefreshKey((prev) => prev + 1)
    toastActions.success("Éxito", { description: "Análisis actualizado correctamente." })
  }

  const handleDeleteAnalysisSuccess = () => {
    setIsDeleteAnalysisModalOpen(false)
    setSelectedAnalysis(null)
    setRefreshKey((prev) => prev + 1)
    toastActions.success("Éxito", { description: "Análisis desactivado correctamente." })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 flex items-center gap-2">
            <TestTube className="h-4 w-4 md:h-5 md:w-5" />
            Análisis ({totalAnalyses})
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar análisis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white bg-transparent w-full sm:w-auto"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Download className="mr-2 h-4 w-4" />
            Importar Datos
          </Button>
          <Button
            className="bg-[#204983] hover:bg-[#1a3d6f] w-full sm:w-auto"
            onClick={() => setIsCreateAnalysisModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Análisis
          </Button>
        </div>
      </div>

      {isLoadingInitial && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3 md:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 md:gap-3 flex-1">
                  <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48 rounded" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-20 rounded" />
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isSearching && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3 md:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 md:gap-3 flex-1">
                  <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48 rounded" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-20 rounded" />
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoadingInitial && error && <div className="text-center text-red-500 py-8">{error}</div>}

      {!isLoadingInitial && !error && analyses.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <PackageX className="mx-auto h-10 w-10 md:h-12 md:w-12 text-gray-300 mb-4" />
          <p>No se encontraron análisis</p>
          {searchTerm && <p className="text-sm">que coincidan con la búsqueda.</p>}
        </div>
      )}

      {analyses.length > 0 && (
        <div className="space-y-3">
          {analyses.map((analysis) => {
            const isExpanded = expandedAnalyses.has(analysis.id)

            return (
              <div
                key={analysis.id}
                className={`border rounded-lg bg-white shadow-sm transition-all duration-300 ${
                  isExpanded ? "ring-2 ring-blue-200" : ""
                }`}
              >
                <div
                  className="p-3 md:p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleAnalysis(analysis.id)}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                        <TestTube className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm md:text-base font-medium text-gray-900 truncate">
                            {analysis.name || "Sin nombre"}
                          </h4>
                          {analysis.is_urgent && (
                            <Badge variant="destructive" className="text-[10px] md:text-xs flex-shrink-0">
                              U
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 flex-shrink-0">
                            Código:
                            <Badge
                              variant="outline"
                              className="text-[10px] md:text-xs font-mono bg-blue-100 text-blue-800 border-blue-300 font-semibold ml-1"
                            >
                              {analysis.code || "N/A"}
                            </Badge>
                          </span>
                          <span className="truncate hidden sm:inline">UB: {analysis.bio_unit || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2 md:gap-3 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="hidden md:block">
                        {(analysis.creation || analysis.last_change) && (
                          <AuditAvatars creation={analysis.creation} lastChange={analysis.last_change} size="sm" />
                        )}
                      </div>
                      <div className="flex space-x-1 md:space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            setSelectedAnalysis(analysis)
                            setIsEditAnalysisModalOpen(true)
                          }}
                          className="h-7 w-7 md:h-8 md:w-8 p-0 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                        >
                          <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 hover:bg-red-50 bg-transparent h-7 w-7 md:h-8 md:w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            setSelectedAnalysis(analysis)
                            setIsDeleteAnalysisModalOpen(true)
                          }}
                        >
                          <Trash className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      className="border-t bg-gray-50 mt-3 -mx-3 md:-mx-4 -mb-3 md:-mb-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-3 md:p-4 bg-blue-50 border-b">
                        <Button
                          variant="outline"
                          className="w-full bg-transparent text-xs md:text-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            setSelectedAnalysisForHistory(analysis)
                            setIsHistoryDialogOpen(true)
                          }}
                        >
                          <History className="h-4 w-4 mr-2" />
                          Ver Historial Completo
                        </Button>
                      </div>

                      <AnalysisList analysis={analysis} showInactive={false} refreshKey={refreshKey} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasMore && (
        <div ref={loadMoreSentinelRef} className="flex justify-center items-center py-4">
          <div className="text-xs text-gray-400">
            {isLoadingMore ? <Loader2 className="h-5 w-5 animate-spin" /> : <span>Scroll para cargar más...</span>}
          </div>
        </div>
      )}

      {!hasMore && analyses.length > 0 && !isLoadingInitial && (
        <p className="text-center text-xs md:text-sm text-gray-400 mt-4">No hay más análisis para mostrar.</p>
      )}

      <CreateAnalysisCatalogDialog
        open={isCreateAnalysisModalOpen}
        onOpenChange={setIsCreateAnalysisModalOpen}
        onSuccess={handleCreateAnalysisSuccess}
      />

      {selectedAnalysis && (
        <>
          <EditAnalysisCatalogDialog
            open={isEditAnalysisModalOpen}
            onOpenChange={setIsEditAnalysisModalOpen}
            onSuccess={handleEditAnalysisSuccess}
            analysis={selectedAnalysis}
          />
          <DeleteAnalysisCatalogDialog
            open={isDeleteAnalysisModalOpen}
            onOpenChange={setIsDeleteAnalysisModalOpen}
            onSuccess={handleDeleteAnalysisSuccess}
            analysis={selectedAnalysis}
          />
        </>
      )}

      {selectedAnalysisForHistory && (
        <AnalysisHistoryDialog
          open={isHistoryDialogOpen}
          onOpenChange={setIsHistoryDialogOpen}
          analysisId={selectedAnalysisForHistory?.id || null}
          analysisName={selectedAnalysisForHistory?.name || ""}
        />
      )}

      <ImportDataDialog
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={handleImportDataSuccess}
      />
    </div>
  )
}
