"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Loader2,
  Search,
  PackageX,
  Trash,
  Pencil,
  ChevronDown,
  ChevronRight,
  TestTube2,
  Plus,
  History,
} from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/hooks/use-debounce"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { CreateDeterminationDialog } from "./create-determination-dialog"
import { EditDeterminationDialog } from "./edit-determination-dialog"
import { DeleteDeterminationDialog } from "./delete-determination-dialog"
import { DeterminationHistoryDialog } from "./determination-history-dialog"
import { AuditAvatars } from "@/components/common/audit-avatars"
import type { Determination } from "@/types"
import { CATALOG_ENDPOINTS } from "@/config/api"

interface AnalysisCatalog {
  id: number
  name: string | null
  code: number | null
}

interface AnalysisListProps {
  analysis: AnalysisCatalog
  showInactive: boolean
  refreshKey: number
}

const PAGE_LIMIT = 10

export const AnalysisList: React.FC<AnalysisListProps> = ({ analysis, showInactive, refreshKey }) => {
  const { apiRequest } = useApi()
  const toastActions = useToast()

  const [analyses, setAnalyses] = useState<Determination[]>([])
  const [totalAnalyses, setTotalAnalyses] = useState(0)
  const [analysesNextUrl, setAnalysesNextUrl] = useState<string | null>(null)
  const [expandedDeterminations, setExpandedDeterminations] = useState<Set<number>>(new Set())

  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [err, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Determination | null>(null)

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
  const [selectedHistoryAnalysis, setSelectedHistoryAnalysis] = useState<{ id: number; name: string } | null>(null)

  const buildAnalysesUrl = useCallback(
    (offset = 0, search = "") => {
      let url = `${CATALOG_ENDPOINTS.DETERMINATIONS}?analysis=${analysis.id}&limit=${PAGE_LIMIT}&offset=${offset}&is_active=true`
      if (search) url += `&search=${encodeURIComponent(search)}`
      return url
    },
    [analysis.id],
  )

  const fetchAnalyses = useCallback(
    async (isNewSearchOrFilter = false) => {
      let currentUrlToFetch: string

      if (isNewSearchOrFilter) {
        setAnalyses([])
        setAnalysesNextUrl(null)
        setTotalAnalyses(0)
        currentUrlToFetch = buildAnalysesUrl(0, debouncedSearchTerm)
      } else {
        if (!analysesNextUrl) {
          setIsLoadingMore(false)
          return
        }
        currentUrlToFetch = analysesNextUrl
      }

      setIsLoadingInitial(isNewSearchOrFilter)
      setIsLoadingMore(!isNewSearchOrFilter)
      setError(null)

      try {
        const response = await apiRequest(currentUrlToFetch)
        if (response.ok) {
          const data = await response.json()

          const results = Array.isArray(data.results) ? data.results : []

          const filteredResults = results.filter(
            (determination: Determination) => determination.analysis === analysis.id,
          )

          setAnalyses((prev) => (isNewSearchOrFilter ? filteredResults : [...prev, ...filteredResults]))
          setTotalAnalyses(data.count || 0)
          setAnalysesNextUrl(data.next || null)
        } else {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage =
            errorData.detail || errorData.error || errorData.message || "Error al cargar las determinaciones."
          setError(errorMessage)
          toastActions.error("Error", { description: errorMessage })
        }
      } catch (fetchErr) {
        console.error("Error fetching analyses:", fetchErr)
        const errorMessage =
          fetchErr instanceof Error ? fetchErr.message : "Ocurrió un error inesperado al cargar determinaciones."
        setError(errorMessage)
        toastActions.error("Error", { description: errorMessage })
      } finally {
        setIsLoadingInitial(false)
        setIsLoadingMore(false)
      }
    },
    [apiRequest, toastActions, buildAnalysesUrl, analysesNextUrl, debouncedSearchTerm, analysis.id],
  )

  const toggleDetermination = (determinationId: number) => {
    setExpandedDeterminations((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(determinationId)) {
        newSet.delete(determinationId)
      } else {
        newSet.add(determinationId)
      }
      return newSet
    })
  }

  const handleSuccess = () => {
    fetchAnalyses(true)
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsDeleteModalOpen(false)
    setSelectedAnalysis(null)
  }

  useEffect(() => {
    fetchAnalyses(true)
  }, [analysis.id, debouncedSearchTerm, showInactive, refreshKey])

  const hasMoreAnalyses = !!analysesNextUrl && analyses.length < totalAnalyses

  const loadMoreSentinelRef = useInfiniteScroll({
    loading: isLoadingMore,
    hasMore: hasMoreAnalyses,
    onLoadMore: () => {
      if (analysesNextUrl && !isLoadingMore) {
        fetchAnalyses(false)
      }
    },
    dependencies: [analysesNextUrl, isLoadingMore],
  })

  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-col gap-2 px-2 md:px-4 sm:flex-row sm:justify-between sm:items-center">
        <h4 className="text-xs md:text-sm font-semibold text-gray-700 flex-shrink-0">
          Determinaciones ({totalAnalyses})
        </h4>
        <div className="relative w-full sm:w-auto flex-grow sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar determinación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-sm h-8 w-full"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <Button
          variant="outline"
          className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white bg-transparent w-full sm:w-auto"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setIsCreateModalOpen(true)
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Nueva Determinación
        </Button>
      </div>

      {isLoadingInitial && (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Cargando determinaciones...</span>
        </div>
      )}

      {!isLoadingInitial && err && <div className="text-center text-red-500 py-4 text-sm">{err}</div>}

      {!isLoadingInitial && !err && analyses.length === 0 && (
        <div className="text-center text-gray-400 py-4 text-sm">
          <PackageX className="mx-auto h-8 w-8 text-gray-300 mb-1" />
          Este panel no tiene determinaciones
          {searchTerm ? " que coincidan con la búsqueda." : "."}
        </div>
      )}

      {analyses.length > 0 && (
        <div className="space-y-2 px-2 md:px-4">
          {analyses.map((analysisItem) => {
            const isExpanded = expandedDeterminations.has(analysisItem.id)

            return (
              <div
                key={analysisItem.id}
                className={`border rounded-md transition-all duration-300 bg-white border-gray-100 ${
                  isExpanded ? "ring-2 ring-blue-200" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 gap-2">
                  <div
                    className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-gray-50 transition-colors rounded-md p-1 -m-1 min-w-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleDetermination(analysisItem.id)
                    }}
                  >
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-gray-500" />
                      )}
                      <TestTube2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm font-medium text-gray-800 truncate">{analysisItem.name}</p>
                      <p className="text-[10px] md:text-xs text-gray-500">Unidad: {analysisItem.measure_unit}</p>
                      <p className="text-[10px] md:text-xs text-gray-500">
                        Fórmula:{" "}
                        {analysisItem.formula ? (
                          <span className="font-mono text-blue-600">{analysisItem.formula}</span>
                        ) : (
                          <span className="italic text-gray-400">Sin fórmula</span>
                        )}
                      </p>
                      <div className="mt-1">
                        {(analysisItem.creation || analysisItem.last_change) && (
                          <AuditAvatars
                            creation={analysisItem.creation}
                            lastChange={analysisItem.last_change}
                            size="sm"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              setSelectedAnalysis(analysisItem)
                              setIsEditModalOpen(true)
                            }}
                            className="h-7 w-7 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar Determinación</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              setSelectedAnalysis(analysisItem)
                              setIsDeleteModalOpen(true)
                            }}
                            className="h-7 w-7 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar Determinación</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t p-4 bg-gray-50" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setSelectedHistoryAnalysis({ id: analysisItem.id, name: analysisItem.name })
                        setIsHistoryDialogOpen(true)
                      }}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <History className="h-4 w-4" />
                      Ver Historial Completo
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {hasMoreAnalyses && (
        <div ref={loadMoreSentinelRef} className="flex justify-center items-center py-4">
          {isLoadingMore && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
        </div>
      )}
      {!hasMoreAnalyses && analyses.length > 0 && !isLoadingInitial && (
        <p className="text-center text-xs text-gray-400 mt-3">Fin de las determinaciones.</p>
      )}

      <CreateDeterminationDialog
        analysisId={analysis.id}
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open)
        }}
        onSuccess={handleSuccess}
      />

      {selectedAnalysis && (
        <EditDeterminationDialog
          determination={selectedAnalysis}
          open={isEditModalOpen}
          onOpenChange={(open) => {
            setIsEditModalOpen(open)
            if (!open) setSelectedAnalysis(null)
          }}
          onSuccess={handleSuccess}
        />
      )}

      {isDeleteModalOpen && selectedAnalysis && (
        <DeleteDeterminationDialog
          determination={selectedAnalysis}
          open={isDeleteModalOpen}
          onOpenChange={(open) => {
            setIsDeleteModalOpen(open)
            if (!open) setSelectedAnalysis(null)
          }}
          onSuccess={handleSuccess}
        />
      )}

      {isHistoryDialogOpen && selectedHistoryAnalysis && (
        <DeterminationHistoryDialog
          open={isHistoryDialogOpen}
          onOpenChange={setIsHistoryDialogOpen}
          determinationId={selectedHistoryAnalysis.id}
          determinationName={selectedHistoryAnalysis.name}
        />
      )}
    </div>
  )
}
