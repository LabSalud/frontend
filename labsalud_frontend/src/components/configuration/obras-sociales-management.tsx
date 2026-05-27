"use client"

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/hooks/use-api"
import { useApiInfiniteQuery, flattenPages } from "@/hooks/use-api-infinite-query"
import { MEDICAL_ENDPOINTS } from "@/config/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Search, ShieldCheckIcon, Plus } from "lucide-react"
import type { ObraSocial } from "@/types"
import { CreateObraSocialDialog } from "./components/create-obra-social-dialog"
import { EditObraSocialDialog } from "./components/edit-obra-social-dialog"
import { ObraSocialCard } from "./components/obra-social-card"
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
  const errorState = insurancesQuery.error?.message ?? null

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
          <h3 className="text-base md:text-lg font-medium text-gray-900">Obras Sociales</h3>
          <p className="text-xs md:text-sm text-gray-500">Gestiona las obras sociales del sistema</p>
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

      {isLoadingInitial ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 items-start">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
              <Skeleton className="h-4 w-48 rounded" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16 rounded" />
                <Skeleton className="h-8 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : obrasSociales.length === 0 && !errorState ? (
        <div className="text-center py-8 md:py-12">
          <ShieldCheckIcon className="mx-auto h-10 w-10 md:h-12 md:w-12 text-gray-400 mb-3" />
          <h3 className="text-base md:text-lg font-medium text-gray-900">No se encontraron Obras Sociales</h3>
          <p className="mt-1 text-xs md:text-sm text-gray-500">
            {searchTerm ? "Ninguna obra social coincide con tu búsqueda." : "No hay obras sociales registradas."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 items-start">
          {obrasSociales.map((os) => (
            <ObraSocialCard
              key={os.id}
              obraSocial={os}
              nbus={nbus}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              isToggling={switchLoading === os.id}
            />
          ))}
        </div>
      )}

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
