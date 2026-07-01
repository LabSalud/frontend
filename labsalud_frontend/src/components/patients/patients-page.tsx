"use client"

import { useCallback, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/hooks/use-api"
import { useApiInfiniteQuery, flattenPages } from "@/hooks/use-api-infinite-query"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, Loader2, AlertCircle, X } from "lucide-react"
import { PatientsTable } from "./components/patients-table"
import { CreatePatientDialog } from "./components/create-patient-dialog"
import DeletePatientDialog from "./components/delete-patient-dialog"
import { MergePatientDialog } from "./components/merge-patient-dialog"
import { PATIENT_ENDPOINTS } from "@/config/api"
import type { SortState } from "@/components/common/data-table"
import type { Patient } from "@/types"

const PAGE_LIMIT = 20

export default function PatientsPage() {
  const { apiRequest } = useApi()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [sort, setSort] = useState<SortState>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null)
  const [mergeTarget, setMergeTarget] = useState<Patient | null>(null)

  const orderingParam = sort ? `${sort.dir === "desc" ? "-" : ""}${sort.field}` : undefined
  const queryKey = ["patients", "list", debouncedSearchTerm.trim(), orderingParam ?? ""] as const

  const buildUrl = useCallback(
    (offset: number) => {
      const params = new URLSearchParams({ limit: String(PAGE_LIMIT), offset: String(offset) })
      if (debouncedSearchTerm.trim()) params.append("search", debouncedSearchTerm.trim())
      if (orderingParam) params.append("ordering", orderingParam)
      return `${PATIENT_ENDPOINTS.PATIENTS}?${params.toString()}`
    },
    [debouncedSearchTerm, orderingParam],
  )

  const patientsQuery = useApiInfiniteQuery<Patient>({ queryKey, buildUrl })

  const patients = flattenPages<Patient>(patientsQuery.data?.pages)
  const totalCount = patientsQuery.data?.pages[0]?.count ?? patients.length
  const isLoadingMore = patientsQuery.isFetchingNextPage
  const hasMore = !!patientsQuery.hasNextPage
  const error = patientsQuery.error?.message

  const sentinelRef = useInfiniteScroll({
    loading: isLoadingMore,
    hasMore,
    onLoadMore: () => {
      if (!isLoadingMore && hasMore) patientsQuery.fetchNextPage()
    },
    dependencies: [debouncedSearchTerm, orderingParam, hasMore, isLoadingMore],
  })

  const invalidatePatients = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["patients"] })
  }, [queryClient])

  const clearSearch = () => {
    setSearchTerm("")
    searchInputRef.current?.focus()
  }

  return (
    <div className="mx-auto w-full max-w-full px-4 py-4">
      <div className="rounded-2xl bg-white/95 p-4 shadow-md backdrop-blur-sm md:p-6">
        {/* Fila superior: título · búsqueda · nuevo paciente */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="lg:w-52 lg:shrink-0">
            <h1 className="text-xl font-bold text-gray-800 md:text-2xl">Pacientes</h1>
            <p className="text-sm text-gray-500">
              {`${totalCount} registrados`}
              {searchTerm && ` · ${patients.length} resultados`}
            </p>
          </div>
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar por DNI o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pl-11 pr-10"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            {patientsQuery.isFetching && !isLoadingMore && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-[#204983]" />
              </div>
            )}
          </div>
          <div className="lg:w-52 lg:shrink-0 lg:text-right">
            <Button className="w-full bg-[#204983] lg:w-auto" onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Paciente
            </Button>
          </div>
        </div>

        {/* Tabla */}
        <div className="mt-4 space-y-4">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
              <Button size="sm" className="ml-auto bg-[#204983]" onClick={() => patientsQuery.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <PatientsTable
              patients={patients}
              onRowClick={(id) => navigate(`/pacientes/${id}`)}
              onMerge={setMergeTarget}
              onDelete={setDeleteTarget}
              sort={sort}
              onSortChange={setSort}
              isLoading={patientsQuery.isLoading}
            />
          )}

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-2">
              {isLoadingMore && <Skeleton className="h-8 w-40 rounded" />}
            </div>
          )}
          {!hasMore && patients.length > 0 && (
            <p className="py-2 text-center text-sm text-gray-400">No hay más pacientes para mostrar</p>
          )}
        </div>
      </div>

      <CreatePatientDialog
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        addPatient={() => invalidatePatients()}
        apiRequest={apiRequest}
      />

      <DeletePatientDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        patient={deleteTarget}
        setPatients={() => invalidatePatients()}
        apiRequest={apiRequest}
      />

      <MergePatientDialog
        open={mergeTarget !== null}
        onOpenChange={(open) => !open && setMergeTarget(null)}
        source={mergeTarget}
        onMerged={() => {
          invalidatePatients()
          setMergeTarget(null)
        }}
      />
    </div>
  )
}
