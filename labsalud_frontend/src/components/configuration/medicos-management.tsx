"use client"

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Plus, Eye, Pencil, Trash, Loader2 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useApiInfiniteQuery, flattenPages } from "@/hooks/use-api-infinite-query"
import { MEDICAL_ENDPOINTS } from "@/config/api"
import { toast } from "sonner"
import { CreateMedicoDialog } from "./components/create-medico-dialog"
import { EditMedicoDialog } from "./components/edit-medico-dialog"
import { DeleteMedicoDialog } from "./components/delete-medico-dialog"
import { MedicoDetailsDialog } from "./components/medico-details-dialog"
import { AuditAvatars } from "@/components/common/audit-avatars"
import type { Medico } from "@/types"

const PAGE_LIMIT = 20

export function MedicosManagement() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMedico, setSelectedMedico] = useState<Medico | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const buildUrl = useCallback(
    (offset: number) => {
      const params = new URLSearchParams({
        limit: String(PAGE_LIMIT),
        offset: String(offset),
        search: debouncedSearchTerm,
        is_active: "true",
      })
      return `${MEDICAL_ENDPOINTS.DOCTORS}?${params.toString()}`
    },
    [debouncedSearchTerm],
  )

  const medicosQuery = useApiInfiniteQuery<Medico>({
    queryKey: ["doctors", "list", debouncedSearchTerm],
    buildUrl,
  })

  const medicos = flattenPages<Medico>(medicosQuery.data?.pages)
  const isLoading = medicosQuery.isLoading
  const isLoadingMore = medicosQuery.isFetchingNextPage
  const hasMore = !!medicosQuery.hasNextPage
  const error = medicosQuery.error?.message

  const lastElementRef = useInfiniteScroll({
    loading: isLoadingMore,
    hasMore,
    onLoadMore: () => {
      if (!isLoadingMore && hasMore) medicosQuery.fetchNextPage()
    },
    dependencies: [debouncedSearchTerm, hasMore, isLoadingMore],
  })

  const invalidateDoctors = () => {
    queryClient.invalidateQueries({ queryKey: ["doctors"] })
  }

  const handleCreateSuccess = () => {
    setShowCreateDialog(false)
    invalidateDoctors()
    toast.success("Médico creado exitosamente")
  }

  const handleEditSuccess = () => {
    setShowEditDialog(false)
    setSelectedMedico(null)
    invalidateDoctors()
    toast.success("Médico actualizado exitosamente")
  }

  const handleDeleteSuccess = () => {
    setShowDeleteDialog(false)
    setSelectedMedico(null)
    invalidateDoctors()
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

        {isLoadingMore && (
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
