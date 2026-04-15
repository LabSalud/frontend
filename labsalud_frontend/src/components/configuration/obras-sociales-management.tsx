"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useApi } from "@/hooks/use-api"
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

type ObrasSocialesManagementProps = {}

const PAGE_LIMIT = 20

export const ObrasSocialesManagement: React.FC<ObrasSocialesManagementProps> = () => {
  const { apiRequest } = useApi()
  const { success, error } = useToast()

  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([])
  const [totalObrasSociales, setTotalObrasSociales] = useState(0)
  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [switchLoading, setSwitchLoading] = useState<number | null>(null)
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedObraSocial, setSelectedObraSocial] = useState<ObraSocial | null>(null)

  const buildUrl = useCallback(
    (offset = 0, search = debouncedSearchTerm) => {
      let url = `${MEDICAL_ENDPOINTS.INSURANCES}?limit=${PAGE_LIMIT}&offset=${offset}`
      if (search) {
        url += `&search=${encodeURIComponent(search)}`
      }
      return url
    },
    [debouncedSearchTerm],
  )

  const fetchObrasSociales = useCallback(
    async (isNewSearchOrFilter = false) => {
      let currentUrlToFetch: string
      if (isNewSearchOrFilter) {
        setObrasSociales([])
        setNextUrl(null)
        setTotalObrasSociales(0)
        currentUrlToFetch = buildUrl(0)
      } else {
        if (!nextUrl) {
          setIsLoadingMore(false)
          return
        }
        currentUrlToFetch = nextUrl
      }

      setIsLoadingInitial(isNewSearchOrFilter && obrasSociales.length === 0)
      setIsLoadingMore(!isNewSearchOrFilter)
      setErrorState(null)

      try {
        const response = await apiRequest(currentUrlToFetch)
        if (response.ok) {
          const data = await response.json()
          setObrasSociales((prev) => (isNewSearchOrFilter ? data.results : [...prev, ...data.results]))
          setTotalObrasSociales(data.count)
          setNextUrl(data.next)
        } else {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage =
            errorData.detail || errorData.error || errorData.message || "Error al cargar las obras sociales."
          setErrorState(errorMessage)
          error("Error", { description: errorMessage })
        }
      } catch (err) {
        console.error("Error fetching OOSS:", err)
        const errorMessage =
          err instanceof Error ? err.message : "Ocurrió un error inesperado al cargar las obras sociales."
        setErrorState(errorMessage)
        error("Error", { description: errorMessage })
      } finally {
        setIsLoadingInitial(false)
        setIsLoadingMore(false)
      }
    },
    [apiRequest, error, buildUrl, nextUrl, obrasSociales.length],
  )

  useEffect(() => {
    fetchObrasSociales(true)
  }, [debouncedSearchTerm])

  const hasMore = !!nextUrl && obrasSociales.length < totalObrasSociales

  const loadMoreSentinelRef = useInfiniteScroll({
    loading: isLoadingMore,
    hasMore,
    onLoadMore: () => {
      if (nextUrl && !isLoadingMore) {
        fetchObrasSociales(false)
      }
    },
    dependencies: [nextUrl, isLoadingMore, hasMore],
  })

  const handleCreateSuccess = () => {
    fetchObrasSociales(true)
    setIsCreateModalOpen(false)
  }

  const handleEditSuccess = () => {
    fetchObrasSociales(true)
    setIsEditModalOpen(false)
    setSelectedObraSocial(null)
  }

  const handleEdit = (obraSocial: ObraSocial) => {
    setSelectedObraSocial(obraSocial)
    setIsEditModalOpen(true)
  }

  const handleToggleActive = async (obraSocialToToggle: ObraSocial, newStatus: boolean) => {
    setSwitchLoading(obraSocialToToggle.id)
    const originalStatus = obraSocialToToggle.is_active

    setObrasSociales((prevObrasSociales) =>
      prevObrasSociales.map((os) => (os.id === obraSocialToToggle.id ? { ...os, is_active: newStatus } : os)),
    )

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

        if (response.ok && newStatus) {
          try {
            const updatedOS = await response.json()
            setObrasSociales((prevObrasSociales) =>
              prevObrasSociales.map((os) => (os.id === updatedOS.id ? updatedOS : os)),
            )
          } catch {
            // Si no hay JSON, mantenemos el optimistic update
          }
        }
      } else {
        setObrasSociales((prevObrasSociales) =>
          prevObrasSociales.map((os) => (os.id === obraSocialToToggle.id ? { ...os, is_active: originalStatus } : os)),
        )
        const errorData = await response.json().catch(() => ({ detail: "Error al actualizar." }))
        const errorMessage = errorData.detail || errorData.error || errorData.message || "No se pudo cambiar el estado."
        error("Error al actualizar", { description: errorMessage })
      }
    } catch (errorCatch) {
      setObrasSociales((prevObrasSociales) =>
        prevObrasSociales.map((os) => (os.id === obraSocialToToggle.id ? { ...os, is_active: originalStatus } : os)),
      )
      const errorMessage = errorCatch instanceof Error ? errorCatch.message : "No se pudo conectar con el servidor."
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
        <p className="text-center text-xs md:text-sm text-gray-500 py-4">Fin de los resultados.</p>
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
