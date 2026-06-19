"use client"

import { useCallback, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/hooks/use-api"
import { useApiInfiniteQuery, flattenPages } from "@/hooks/use-api-infinite-query"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, Loader2, AlertCircle, X } from "lucide-react"
import { PatientGrid } from "./components/patient-grid"
import { CreatePatientDialog } from "./components/create-patient-dialog"
import DeletePatientDialog from "./components/delete-patient-dialog"
import { MergePatientDialog } from "./components/merge-patient-dialog"
import { PATIENT_ENDPOINTS } from "@/config/api"
import type { Patient } from "@/types"

const PAGE_LIMIT = 20

export default function PatientsPage() {
  const { apiRequest } = useApi()
  const queryClient = useQueryClient()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isMerging, setIsMerging] = useState(false)

  const queryKey = ["patients", "list", debouncedSearchTerm.trim()] as const

  const buildUrl = useCallback(
    (offset: number) => {
      const params = new URLSearchParams({
        limit: String(PAGE_LIMIT),
        offset: String(offset),
      })
      if (debouncedSearchTerm.trim()) {
        params.append("search", debouncedSearchTerm.trim())
      }
      return `${PATIENT_ENDPOINTS.PATIENTS}?${params.toString()}`
    },
    [debouncedSearchTerm],
  )

  const patientsQuery = useApiInfiniteQuery<Patient>({
    queryKey,
    buildUrl,
  })

  const patients = flattenPages<Patient>(patientsQuery.data?.pages)
  const totalCount = patientsQuery.data?.pages[0]?.count ?? patients.length
  const isInitialLoading = patientsQuery.isLoading
  const isLoadingMore = patientsQuery.isFetchingNextPage
  const hasMore = !!patientsQuery.hasNextPage
  const error = patientsQuery.error?.message

  const sentinelRef = useInfiniteScroll({
    loading: isLoadingMore,
    hasMore,
    onLoadMore: () => {
      if (!isLoadingMore && hasMore) patientsQuery.fetchNextPage()
    },
    dependencies: [debouncedSearchTerm, hasMore, isLoadingMore],
  })

  // Mutaciones en cache: tras crear/editar/borrar/unificar reusamos invalidateQueries.
  const invalidatePatients = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["patients"] })
  }, [queryClient])

  const updatePatient = useCallback(
    () => {
      // Editar un paciente desde la card → invalidate full list para refetch limpio.
      invalidatePatients()
    },
    [invalidatePatients],
  )

  const addPatient = useCallback(
    () => {
      invalidatePatients()
    },
    [invalidatePatients],
  )

  const handleSelectPatient = (patient: Patient, action: string) => {
    setSelectedPatient(patient)
    switch (action) {
      case "delete":
        setIsDeleting(true)
        break
      case "merge":
        setIsMerging(true)
        break
    }
  }

  const closeAllDialogs = () => {
    setSelectedPatient(null)
    setIsCreating(false)
    setIsDeleting(false)
    setIsMerging(false)
  }

  const handleMerged = () => {
    invalidatePatients()
    closeAllDialogs()
  }

  // DeletePatientDialog notifica con el paciente eliminado → invalidamos.
  const legacySetPatients = useCallback(
    () => {
      invalidatePatients()
    },
    [invalidatePatients],
  )

  const clearSearch = () => {
    setSearchTerm("")
    if (searchInputRef.current) searchInputRef.current.focus()
  }

  if (isInitialLoading) {
    return (
      <div className="w-full max-w-full mx-auto py-4 px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex-1">
              <Skeleton className="h-8 w-64 rounded mb-2" />
              <Skeleton className="h-4 w-96 rounded" />
            </div>
            <Skeleton className="h-10 w-full sm:w-auto rounded" />
          </div>
        </div>
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
          <Skeleton className="h-12 w-full rounded mb-4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto py-4 px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Gestión de Pacientes</h1>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p>{error}</p>
            </div>
            <Button onClick={() => patientsQuery.refetch()} className="mt-3 bg-[#204983]" size="sm">
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full mx-auto py-4 px-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gestión de Pacientes</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalCount > 0 && `${totalCount} pacientes registrados`}
              {searchTerm && ` • ${patients.length} resultados`}
            </p>
          </div>
          <Button className="bg-[#204983] w-full sm:w-auto" onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Paciente
          </Button>
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            ref={searchInputRef}
            placeholder="Buscar por DNI o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-10 h-10 md:h-12 text-base md:text-lg"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          {patientsQuery.isFetching && !isLoadingMore && (
            <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-4 w-4 text-[#204983] animate-spin" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs md:text-sm text-gray-500">Búsqueda instantánea por DNI o nombre del paciente</p>
          {searchTerm && (
            <p className="text-xs text-[#204983] font-medium">
              {patients.length} resultado{patients.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <PatientGrid
          patients={patients}
          onSelectPatient={handleSelectPatient}
          updatePatient={updatePatient}
          apiRequest={apiRequest}
        />

        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {isLoadingMore && (
              <div className="flex items-center">
                <Loader2 className="h-6 w-6 text-[#204983] animate-spin mr-2" />
                <span className="text-gray-600">Cargando más pacientes...</span>
              </div>
            )}
          </div>
        )}

        {!hasMore && patients.length > 0 && (
          <div className="text-center py-4 text-gray-500">
            <p>No hay más pacientes para mostrar</p>
          </div>
        )}
      </div>

      <CreatePatientDialog
        isOpen={isCreating}
        onClose={closeAllDialogs}
        addPatient={addPatient}
        apiRequest={apiRequest}
      />

      <DeletePatientDialog
        isOpen={isDeleting}
        onClose={closeAllDialogs}
        patient={selectedPatient}
        setPatients={legacySetPatients}
        apiRequest={apiRequest}
      />

      <MergePatientDialog
        open={isMerging}
        onOpenChange={(open) => {
          if (!open) closeAllDialogs()
          else setIsMerging(true)
        }}
        source={selectedPatient}
        onMerged={handleMerged}
      />
    </div>
  )
}
