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
import { DataTable, type Column } from "@/components/common/data-table"
import {
  Loader2,
  Search,
  TestTube,
  Plus,
  Trash,
  Download,
  Settings2,
  Save,
} from "lucide-react"
import { AnalysisDetailDialog } from "./components/analysis-detail-dialog"
import { CreateAnalysisCatalogDialog } from "./components/create-analysis-catalog-dialog"
import { EditAnalysisCatalogDialog } from "./components/edit-analysis-catalog-dialog"
import { DeleteAnalysisCatalogDialog } from "./components/delete-analysis-catalog-dialog"
import { ImportDataDialog } from "./components/import-data-dialog"
import { AnalysisHistoryDialog } from "./components/analysis-history-dialog"
import { ClearCatalogDialog } from "./components/clear-catalog-dialog"
import type { Analysis, PricingConfig } from "@/types"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

export function AnalysisManagement() {
  const { apiRequest } = useApi()
  const toastActions = useToast()

  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [totalAnalyses, setTotalAnalyses] = useState(0)
  const [analysesNextUrl, setAnalysesNextUrl] = useState<string | null>(null)
  const [sheetAnalysis, setSheetAnalysis] = useState<Analysis | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

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
  const [isClearCatalogDialogOpen, setIsClearCatalogDialogOpen] = useState(false)
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
  const [selectedAnalysisForHistory, setSelectedAnalysisForHistory] = useState<Analysis | null>(null)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null)
  const [pricingForm, setPricingForm] = useState({
    material_descartable_amount: "",
    derivacion_amount: "",
  })
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [savingPricing, setSavingPricing] = useState(false)
  const showDevCatalogTools = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_CATALOG_TOOLS === "true"

  const fetchPricingConfig = useCallback(async () => {
    try {
      setLoadingPricing(true)
      const response = await apiRequest(CATALOG_ENDPOINTS.PRICING_CONFIG)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(formatApiError(data, "No se pudo cargar la configuración de precios."))
      }
      const data: PricingConfig = await response.json()
      setPricingConfig(data)
      setPricingForm({
        material_descartable_amount: data.material_descartable_amount || "0.00",
        derivacion_amount: data.derivacion_amount || "0.00",
      })
    } catch (err) {
      toastActions.error("Error", { description: getErrorMessage(err, "No se pudieron cargar los montos extra.") })
    } finally {
      setLoadingPricing(false)
    }
  }, [apiRequest, toastActions])

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
          const errorMessage = formatApiError(errorData, "Error al cargar los análisis.")
          setError(errorMessage)
          toastActions.error("Error", { description: errorMessage })
        }
      } catch (err) {
        console.error("Error fetching analyses:", err)
        const errorMessage = getErrorMessage(err, "Ocurrió un error inesperado al cargar análisis.")
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
    fetchPricingConfig()
  }, [fetchPricingConfig])

  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return
    fetchAnalyses(debouncedSearchTerm, true, true)
  }, [debouncedSearchTerm])

  const openSheet = (analysis: Analysis) => {
    setSheetAnalysis(analysis)
    setSheetOpen(true)
  }

  const handleEditFromSheet = (analysis: Analysis) => {
    setSheetOpen(false)
    setSelectedAnalysis(analysis)
    setIsEditAnalysisModalOpen(true)
  }

  const handleDeleteFromSheet = (analysis: Analysis) => {
    setSheetOpen(false)
    setSelectedAnalysis(analysis)
    setIsDeleteAnalysisModalOpen(true)
  }

  const handleShowHistoryFromSheet = (analysis: Analysis) => {
    setSelectedAnalysisForHistory(analysis)
    setIsHistoryDialogOpen(true)
  }

  const handleCreateAnalysisSuccess = () => {
    setIsCreateAnalysisModalOpen(false)
    setRefreshKey((prev) => prev + 1)
    fetchAnalyses(searchTerm, true, true)
    toastActions.success("Éxito", { description: "Análisis creado correctamente." })
  }

  const handleImportDataSuccess = () => {
    setIsImportModalOpen(false)
    setRefreshKey((prev) => prev + 1)
    fetchAnalyses(searchTerm, true, true)
  }

  const handleClearCatalogSuccess = () => {
    setIsClearCatalogDialogOpen(false)
    setRefreshKey((prev) => prev + 1)
    fetchAnalyses(searchTerm, true, true)
  }

  const handleEditAnalysisSuccess = () => {
    setIsEditAnalysisModalOpen(false)
    setSelectedAnalysis(null)
    setRefreshKey((prev) => prev + 1)
    fetchAnalyses(searchTerm, true, true)
    toastActions.success("Éxito", { description: "Análisis actualizado correctamente." })
  }

  const handleDeleteAnalysisSuccess = () => {
    setIsDeleteAnalysisModalOpen(false)
    setSelectedAnalysis(null)
    setRefreshKey((prev) => prev + 1)
    fetchAnalyses(searchTerm, true, true)
    toastActions.success("Éxito", { description: "Análisis desactivado correctamente." })
  }

  const handleSavePricing = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setSavingPricing(true)
      const response = await apiRequest(CATALOG_ENDPOINTS.PRICING_CONFIG, {
        method: "PATCH",
        body: {
          material_descartable_amount: pricingForm.material_descartable_amount || "0.00",
          derivacion_amount: pricingForm.derivacion_amount || "0.00",
        },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(formatApiError(data, "No se pudieron guardar los montos."))
      }
      const data: PricingConfig = await response.json()
      setPricingConfig(data)
      setPricingForm({
        material_descartable_amount: data.material_descartable_amount || "0.00",
        derivacion_amount: data.derivacion_amount || "0.00",
      })
      toastActions.success("Éxito", { description: "Montos extra actualizados correctamente." })
    } catch (err) {
      toastActions.error("Error", { description: getErrorMessage(err, "No se pudieron guardar los montos.") })
    } finally {
      setSavingPricing(false)
    }
  }

  const columns: Column<Analysis>[] = [
    {
      id: "name",
      header: "Análisis",
      cell: (a) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <TestTube className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium text-gray-900">{a.name || "Sin nombre"}</span>
              {a.is_urgent && <Badge variant="destructive" className="text-[10px]">U</Badge>}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "code",
      header: "Código",
      responsive: "hidden sm:table-cell",
      cell: (a) => (
        <Badge variant="outline" className="border-blue-300 bg-blue-100 font-mono text-[10px] font-semibold text-blue-800">
          {a.code || "N/A"}
        </Badge>
      ),
    },
    {
      id: "ub",
      header: "UB",
      responsive: "hidden md:table-cell",
      cell: (a) => <span className="text-sm text-gray-600">{a.bio_unit || "N/A"}</span>,
    },
    {
      id: "audit",
      header: "Auditoría",
      responsive: "hidden lg:table-cell",
      cell: (a) =>
        a.creation || a.last_change ? (
          <AuditAvatars creation={a.creation} lastChange={a.last_change} size="sm" />
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <h3 className="text-base font-semibold text-gray-800">Análisis ({totalAnalyses})</h3>
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
          {showDevCatalogTools && (
            <Button
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white bg-transparent w-full sm:w-auto"
              onClick={() => setIsClearCatalogDialogOpen(true)}
            >
              <Trash className="mr-2 h-4 w-4" />
              Eliminar catálogo completo
            </Button>
          )}
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

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-[#204983]" />
          <h4 className="text-sm font-semibold text-gray-800">Montos de material y derivación</h4>
        </div>
        {loadingPricing && !pricingConfig ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
          </div>
        ) : (
          <form onSubmit={handleSavePricing} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1.5">
              <label htmlFor="analysis-material-descartable" className="text-sm font-medium text-gray-700">
                Material descartable
              </label>
              <Input
                id="analysis-material-descartable"
                type="number"
                min="0"
                step="0.01"
                value={pricingForm.material_descartable_amount}
                onChange={(event) =>
                  setPricingForm((prev) => ({ ...prev, material_descartable_amount: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="analysis-derivacion-amount" className="text-sm font-medium text-gray-700">
                Derivación
              </label>
              <Input
                id="analysis-derivacion-amount"
                type="number"
                min="0"
                step="0.01"
                value={pricingForm.derivacion_amount}
                onChange={(event) => setPricingForm((prev) => ({ ...prev, derivacion_amount: event.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full bg-[#204983] hover:bg-[#1a3d6f]" disabled={savingPricing}>
                {savingPricing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar
              </Button>
            </div>
          </form>
        )}
      </div>

      {!isLoadingInitial && error && <div className="text-center text-red-500 py-8">{error}</div>}

      <DataTable
        columns={columns}
        rows={analyses}
        getRowId={(a) => a.id}
        onRowClick={openSheet}
        isLoading={isLoadingInitial || isSearching}
        emptyMessage={searchTerm ? "No se encontraron análisis que coincidan con la búsqueda." : "No se encontraron análisis."}
        footer={
          hasMore ? (
            <div ref={loadMoreSentinelRef} className="flex items-center justify-center py-4 text-xs text-gray-400">
              {isLoadingMore ? <Loader2 className="h-5 w-5 animate-spin" /> : <span>Scroll para cargar más…</span>}
            </div>
          ) : analyses.length > 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">No hay más análisis para mostrar.</p>
          ) : null
        }
      />

      <AnalysisDetailDialog
        analysis={sheetAnalysis}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        refreshKey={refreshKey}
        onEdit={handleEditFromSheet}
        onDelete={handleDeleteFromSheet}
        onShowHistory={handleShowHistoryFromSheet}
      />

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

      <ClearCatalogDialog
        open={isClearCatalogDialogOpen}
        onOpenChange={setIsClearCatalogDialogOpen}
        onSuccess={handleClearCatalogSuccess}
      />
    </div>
  )
}
