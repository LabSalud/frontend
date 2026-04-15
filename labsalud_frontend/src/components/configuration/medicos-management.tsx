"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Plus, Eye, Pencil, Trash, Loader2 } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { useDebounce } from "@/hooks/use-debounce"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { MEDICAL_ENDPOINTS } from "@/config/api"
import { toast } from "sonner"
import { CreateMedicoDialog } from "./components/create-medico-dialog"
import { EditMedicoDialog } from "./components/edit-medico-dialog"
import { DeleteMedicoDialog } from "./components/delete-medico-dialog"
import { MedicoDetailsDialog } from "./components/medico-details-dialog"
import { AuditAvatars } from "@/components/common/audit-avatars"
import type { Medico } from "@/types"

interface ApiResponse {
  results: Medico[]
  count: number
  next: string | null
  previous: string | null
}

export function MedicosManagement() {
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [selectedMedico, setSelectedMedico] = useState<Medico | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  const { apiRequest } = useApi()
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const buildUrl = useCallback((searchTerm: string, offset: number) => {
    const params = new URLSearchParams({
      limit: "20",
      offset: offset.toString(),
      search: searchTerm,
      is_active: "true",
    })
    return `${MEDICAL_ENDPOINTS.DOCTORS}?${params.toString()}`
  }, [])

  const fetchMedicos = useCallback(
    async (reset = false) => {
      if (isLoading) return

      setIsLoading(true)
      setError(null)

      try {
        const currentOffset = reset ? 0 : offset
        const url = buildUrl(debouncedSearchTerm, currentOffset)
        const response = await apiRequest(url)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage =
            errorData.detail ||
            errorData.error ||
            errorData.message ||
            `Error ${response.status}: ${response.statusText}`
          throw new Error(errorMessage)
        }

        const data: ApiResponse = await response.json()

        if (reset) {
          setMedicos(data.results)
          setOffset(20)
        } else {
          setMedicos((prev) => [...prev, ...data.results])
          setOffset((prev) => prev + 20)
        }

        setHasMore(data.next !== null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido"
        setError(errorMessage)
        toast.error(`Error al cargar médicos: ${errorMessage}`)
      } finally {
        setIsLoading(false)
      }
    },
    [apiRequest, buildUrl, debouncedSearchTerm, offset, isLoading],
  )

  const lastElementRef = useInfiniteScroll({
    loading: isLoading,
    hasMore,
    onLoadMore: () => fetchMedicos(false),
  })

  useEffect(() => {
    fetchMedicos(true)
  }, [debouncedSearchTerm])

  const handleCreateSuccess = () => {
    setShowCreateDialog(false)
    fetchMedicos(true)
    toast.success("Médico creado exitosamente")
  }

  const handleEditSuccess = () => {
    setShowEditDialog(false)
    setSelectedMedico(null)
    fetchMedicos(true)
    toast.success("Médico actualizado exitosamente")
  }

  const handleDeleteSuccess = () => {
    setShowDeleteDialog(false)
    setSelectedMedico(null)
    fetchMedicos(true)
    toast.success("Médico eliminado exitosamente")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Gestión de Médicos</h2>
        <p className="text-sm md:text-base text-gray-600">Administra los médicos del sistema</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar médicos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-[#204983] hover:bg-[#1a3d6f] w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Médico
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre y Apellido
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Matrícula
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Auditoría
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading && medicos.length === 0 ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 md:px-6 py-4">
                      <Skeleton className="h-5 w-40 rounded" />
                    </td>
                    <td className="px-4 md:px-6 py-4 hidden sm:table-cell">
                      <Skeleton className="h-5 w-20 rounded" />
                    </td>
                    <td className="px-4 md:px-6 py-4 hidden md:table-cell">
                      <div className="flex -space-x-1">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex space-x-1 md:space-x-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : medicos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 md:px-6 py-8 text-center text-gray-500">
                    No se encontraron médicos
                  </td>
                </tr>
              ) : (
              medicos.map((medicoItem, index) => (
                <tr
                  key={medicoItem.id}
                  ref={index === medicos.length - 1 ? lastElementRef : null}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {medicoItem.first_name} {medicoItem.last_name}
                    </div>
                    <div className="text-xs text-gray-500 sm:hidden">Mat: {medicoItem.license}</div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                    {medicoItem.license}
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    {(medicoItem.creation || medicoItem.last_change) && (
                      <AuditAvatars creation={medicoItem.creation} lastChange={medicoItem.last_change} size="sm" />
                    )}
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-1 md:space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMedico(medicoItem)
                          setShowDetailsDialog(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMedico(medicoItem)
                          setShowEditDialog(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 hover:bg-red-50 bg-transparent"
                        onClick={() => {
                          setSelectedMedico(medicoItem)
                          setShowDeleteDialog(true)
                        }}
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>

        {isLoading && medicos.length > 0 && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-[#204983]" />
          </div>
        )}
      </div>

      <CreateMedicoDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleCreateSuccess}
        onOpenChange={(isOpen: boolean) => setShowCreateDialog(isOpen)}
      />

      {selectedMedico && (
        <>
          <EditMedicoDialog
            isOpen={showEditDialog}
            medico={selectedMedico}
            onClose={() => {
              setShowEditDialog(false)
              setSelectedMedico(null)
            }}
            onSuccess={handleEditSuccess}
          />

          <DeleteMedicoDialog
            isOpen={showDeleteDialog}
            medico={selectedMedico}
            onClose={() => {
              setShowDeleteDialog(false)
              setSelectedMedico(null)
            }}
            onSuccess={handleDeleteSuccess}
            onOpenChange={() => setShowDeleteDialog(false)}
          />

          <MedicoDetailsDialog
            isOpen={showDetailsDialog}
            medico={selectedMedico}
            onClose={() => {
              setShowDetailsDialog(false)
              setSelectedMedico(null)
            }}
          />
        </>
      )}
    </div>
  )
}
