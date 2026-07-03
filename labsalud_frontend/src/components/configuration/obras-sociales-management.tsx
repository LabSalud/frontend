"use client"

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/hooks/use-api"
import { useApiInfiniteQuery, flattenPages } from "@/hooks/use-api-infinite-query"
import { MEDICAL_ENDPOINTS } from "@/config/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { DataTable, type Column } from "@/components/common/data-table"
import { AuditAvatars } from "@/components/common/audit-avatars"
import { Loader2, Search, Plus, DollarSign } from "lucide-react"
import { getNbuDisplayName } from "@/hooks/use-nbu-options"
import type { ObraSocial } from "@/types"
import { CreateObraSocialDialog } from "./components/create-obra-social-dialog"
import { EditObraSocialDialog } from "./components/edit-obra-social-dialog"
import { ObraSocialDetailDialog } from "./components/obra-social-detail-dialog"
import { ObraSocialHistoryDialog } from "./components/obra-social-history-dialog"
import { useToast } from "@/hooks/use-toast"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useDebounce } from "@/hooks/use-debounce"
import { useNbuOptions } from "@/hooks/use-nbu-options"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

const PAGE_LIMIT = 20

export function ObrasSocialesManagement() {
  const { apiRequest } = useApi()
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const [switchLoading, setSwitchLoading] = useState<number | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedObraSocial, setSelectedObraSocial] = useState<ObraSocial | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetObraSocial, setSheetObraSocial] = useState<ObraSocial | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyObraSocial, setHistoryObraSocial] = useState<ObraSocial | null>(null)
  const { nbus } = useNbuOptions()

  const buildUrl = useCallback(
    (offset: number) => {
      const params = new URLSearchParams({
        limit: String(PAGE_LIMIT),
        offset: String(offset),
      })
      if (debouncedSearchTerm) params.append("search", debouncedSearchTerm)
      return `${MEDICAL_ENDPOINTS.INSURANCES}?${params.toString()}`
    },
    [debouncedSearchTerm],
  )

  const insurancesQuery = useApiInfiniteQuery<ObraSocial>({
    queryKey: ["insurances", "list", debouncedSearchTerm],
    buildUrl,
  })

  const obrasSociales = flattenPages<ObraSocial>(insurancesQuery.data?.pages)
  const totalObrasSociales = insurancesQuery.data?.pages[0]?.count ?? obrasSociales.length
  const isLoadingInitial = insurancesQuery.isLoading
  const isLoadingMore = insurancesQuery.isFetchingNextPage
  const hasMore = !!insurancesQuery.hasNextPage

  const loadMoreSentinelRef = useInfiniteScroll({
    loading: isLoadingMore,
    hasMore,
    onLoadMore: () => {
      if (!isLoadingMore && hasMore) insurancesQuery.fetchNextPage()
    },
    dependencies: [debouncedSearchTerm, hasMore, isLoadingMore],
  })

  const invalidateInsurances = () => {
    queryClient.invalidateQueries({ queryKey: ["insurances"] })
  }

  const handleCreateSuccess = () => {
    invalidateInsurances()
    setIsCreateModalOpen(false)
  }

  const handleEditSuccess = () => {
    invalidateInsurances()
    setIsEditModalOpen(false)
    setSelectedObraSocial(null)
  }

  const handleEdit = (obraSocial: ObraSocial) => {
    setSelectedObraSocial(obraSocial)
    setIsEditModalOpen(true)
  }

  const openSheet = (obraSocial: ObraSocial) => {
    setSheetObraSocial(obraSocial)
    setSheetOpen(true)
  }

  const handleEditFromSheet = (obraSocial: ObraSocial) => {
    setSheetOpen(false)
    handleEdit(obraSocial)
  }

  const handleShowHistory = (obraSocial: ObraSocial) => {
    setSheetOpen(false)
    setHistoryObraSocial(obraSocial)
    setHistoryOpen(true)
  }

  const columns: Column<ObraSocial>[] = [
    {
      id: "name",
      header: "Obra social",
      cell: (os) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#204983] text-[10px] font-bold text-white">
            OS
          </span>
          <span className={`font-medium ${os.is_active ? "text-gray-900" : "text-gray-400"}`}>{os.name}</span>
        </div>
      ),
    },
    {
      id: "ub",
      header: "Valor UB",
      responsive: "hidden md:table-cell",
      cell: (os) =>
        os.ub_value ? (
          <span className="inline-flex items-center gap-1 text-sm text-gray-700">
            <DollarSign className="h-3.5 w-3.5 text-green-600" />
            {os.ub_value}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
    {
      id: "nbu",
      header: "Nomenclador",
      responsive: "hidden lg:table-cell",
      cell: (os) => <span className="text-sm text-gray-500">{getNbuDisplayName(os.nbu, nbus) || "—"}</span>,
    },
    {
      id: "audit",
      header: "Auditoría",
      responsive: "hidden xl:table-cell",
      cell: (os) => <AuditAvatars creation={os.creation} lastChange={os.last_change} size="sm" />,
    },
    {
      id: "active",
      header: "Estado",
      align: "right",
      cell: (os) => (
        <span className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {switchLoading === os.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#204983]" />}
          <Badge variant={os.is_active ? "default" : "secondary"} className="text-[10px]">
            {os.is_active ? "Activa" : "Inactiva"}
          </Badge>
          <Switch
            checked={os.is_active}
            onCheckedChange={(v) => handleToggleActive(os, v)}
            disabled={switchLoading === os.id}
            className="data-[state=checked]:bg-[#204983]"
          />
        </span>
      ),
    },
  ]

  const handleToggleActive = async (obraSocialToToggle: ObraSocial, newStatus: boolean) => {
    setSwitchLoading(obraSocialToToggle.id)
    try {
      let response: Response
      if (newStatus) {
        response = await apiRequest(MEDICAL_ENDPOINTS.INSURANCE_DETAIL(obraSocialToToggle.id), {
          method: "PATCH",
          body: { is_active: true },
        })
      } else {
        response = await apiRequest(MEDICAL_ENDPOINTS.INSURANCE_DETAIL(obraSocialToToggle.id), {
          method: "DELETE",
        })
      }

      if ((newStatus && response.ok) || (!newStatus && response.status === 204)) {
        success("Estado actualizado", {
          description: `Obra Social ${obraSocialToToggle.name} ${newStatus ? "activada" : "desactivada"}.`,
        })
        invalidateInsurances()
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Error al actualizar." }))
        const errorMessage = formatApiError(errorData, "No se pudo cambiar el estado.")
        error("Error al actualizar", { description: errorMessage })
      }
    } catch (errorCatch) {
      const errorMessage = getErrorMessage(errorCatch, "No se pudo conectar con el servidor.")
      error("Error de red", { description: errorMessage })
      console.error("Error toggling active state:", errorCatch)
    } finally {
      setSwitchLoading(null)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Obras Sociales</h3>
          <p className="text-sm text-gray-500">Gestiona las obras sociales del sistema</p>
        </div>
        <Button className="bg-[#204983] hover:bg-[#1a3d6f] w-full sm:w-auto" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Obra Social
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar obra social..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={obrasSociales}
        getRowId={(os) => os.id}
        onRowClick={openSheet}
        isLoading={isLoadingInitial}
        emptyMessage={
          searchTerm ? "Ninguna obra social coincide con tu búsqueda." : "No hay obras sociales registradas."
        }
        rowClassName={(os) => (os.is_active ? "" : "opacity-60")}
      />

      {hasMore && (
        <div ref={loadMoreSentinelRef} className="flex justify-center items-center py-6">
          {isLoadingMore && <Loader2 className="h-6 w-6 animate-spin text-[#204983]" />}
        </div>
      )}

      {!hasMore && obrasSociales.length > 0 && !isLoadingInitial && (
        <p className="text-center text-xs md:text-sm text-gray-500 py-4">
          Fin de los resultados. ({totalObrasSociales} en total)
        </p>
      )}

      <ObraSocialDetailDialog
        obraSocial={sheetObraSocial}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        nbus={nbus}
        onEdit={handleEditFromSheet}
        onToggleActive={handleToggleActive}
        isToggling={sheetObraSocial ? switchLoading === sheetObraSocial.id : false}
        onShowHistory={handleShowHistory}
      />

      {historyObraSocial && (
        <ObraSocialHistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          obraSocialId={historyObraSocial.id}
          obraSocialName={historyObraSocial.name}
        />
      )}

      {isCreateModalOpen && (
        <CreateObraSocialDialog
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSuccess={handleCreateSuccess}
        />
      )}
      {isEditModalOpen && selectedObraSocial && (
        <EditObraSocialDialog
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSuccess={handleEditSuccess}
          obraSocial={selectedObraSocial}
        />
      )}
    </div>
  )
}
