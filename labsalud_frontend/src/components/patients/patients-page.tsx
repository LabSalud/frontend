"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useApi } from "@/hooks/use-api"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Loader2, AlertCircle, X } from "lucide-react"
import { PatientGrid } from "./components/patient-grid"
import { CreatePatientDialog } from "./components/create-patient-dialog"
import DeletePatientDialog from "./components/delete-patient-dialog"
import { PATIENT_ENDPOINTS } from "@/config/api"
import type { Patient } from "@/types"

// Interface para la respuesta paginada de la API
interface PaginatedResponse {
  next: string | null
  results: Patient[]
}

export default function PatientsPage() {
  const { apiRequest } = useApi()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Estados principales
  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [displayedPatients, setDisplayedPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [hasMore, setHasMore] = useState(true)
  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Estados de diálogos
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Debounce para la búsqueda
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Función para construir URL con parámetros
  const buildUrl = useCallback((search = "", offset = 0) => {
    const baseUrl = PATIENT_ENDPOINTS.PATIENTS

    const params = new URLSearchParams({
      limit: "20",
      offset: offset.toString(),
    })

    if (search.trim()) {
      params.append("search", search.trim())
    }

    return `${baseUrl}?${params.toString()}`
  }, [])

  // Función para filtrar pacientes localmente
  const filterPatientsLocally = useCallback((patients: Patient[], searchTerm: string) => {
    if (!searchTerm.trim()) {
      return patients
    }

    const searchLower = searchTerm.toLowerCase().trim()

    return patients
      .filter((patient) => {
        // Búsqueda por DNI (exacta y parcial)
        if (patient.dni && patient.dni.includes(searchTerm)) {
          return true
        }

        // Búsqueda por nombre completo
        const fullName = `${patient.first_name || ""} ${patient.last_name || ""}`.toLowerCase()
        if (fullName.includes(searchLower)) {
          return true
        }

        // Búsqueda por email
        if (patient.email && patient.email.toLowerCase().includes(searchLower)) {
          return true
        }

        // Búsqueda por teléfonos
        if (
          (patient.phone_mobile && patient.phone_mobile.includes(searchTerm)) ||
          (patient.alt_phone && patient.alt_phone.includes(searchTerm))
        ) {
          return true
        }

        return false
      })
      .sort((a, b) => {
        // Ordenar resultados: DNI exacto primero, luego DNI parcial, luego otros
        const aDni = a.dni || ""
        const bDni = b.dni || ""
        const aExactDni = aDni === searchTerm
        const bExactDni = bDni === searchTerm
        const aPartialDni = aDni.includes(searchTerm)
        const bPartialDni = bDni.includes(searchTerm)

        if (aExactDni && !bExactDni) return -1
        if (!aExactDni && bExactDni) return 1
        if (aPartialDni && !bPartialDni) return -1
        if (!aPartialDni && bPartialDni) return 1

        return 0
      })
  }, [])

  // Función para cargar pacientes desde la API
  const fetchPatientsFromAPI = useCallback(
    async (search = "", reset = true) => {
      if (reset) {
        setIsInitialLoading(true)
        setError(null)
      } else {
        setIsLoadingMore(true)
      }

      try {
        const url = reset ? buildUrl(search, 0) : nextUrl
        if (!url) return

        const response = await apiRequest(url)

        if (response.ok) {
          const data: PaginatedResponse = await response.json()

          if (reset) {
            setAllPatients(data.results)
            setTotalCount(data.results.length)
          } else {
            setAllPatients((prev) => [...prev, ...data.results])
          }

          setNextUrl(data.next)
          setHasMore(!!data.next)
        } else {
          setError("Error al cargar los pacientes")
        }
      } catch (err) {
        console.error("Error al cargar datos:", err)
        setError("Error al cargar los datos. Por favor, intenta nuevamente.")
      } finally {
        setIsInitialLoading(false)
        setIsLoadingMore(false)
      }
    },
    [apiRequest, buildUrl, nextUrl],
  )

  // Cargar más pacientes (scroll infinito)
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && nextUrl && !debouncedSearchTerm.trim()) {
      fetchPatientsFromAPI("", false)
    }
  }, [fetchPatientsFromAPI, isLoadingMore, hasMore, nextUrl, debouncedSearchTerm])

  // Hook de scroll infinito
  const sentinelRef = useInfiniteScroll({
    loading: isLoadingMore,
    hasMore: hasMore && !debouncedSearchTerm.trim(),
    onLoadMore: loadMore,
    dependencies: [debouncedSearchTerm],
  })

  // Efecto para carga inicial
  useEffect(() => {
    fetchPatientsFromAPI()
  }, [])

  // Efecto para búsqueda - filtrado local o API según el caso
  useEffect(() => {
    const handleSearch = async () => {
      if (!debouncedSearchTerm.trim()) {
        // Sin búsqueda: mostrar todos los pacientes cargados
        setDisplayedPatients(allPatients)
        setIsSearching(false)
        return
      }

      setIsSearching(true)

      // Primero filtrar localmente
      const localResults = filterPatientsLocally(allPatients, debouncedSearchTerm)
      setDisplayedPatients(localResults)

      // Si tenemos pocos resultados locales y hay más datos en el servidor, buscar en API
      if (localResults.length < 5 && hasMore) {
        try {
          const response = await apiRequest(buildUrl(debouncedSearchTerm, 0))
          if (response.ok) {
            const data: PaginatedResponse = await response.json()

            // Combinar resultados únicos
            const combinedResults = [...localResults]
            data.results.forEach((patient) => {
              if (!combinedResults.find((p) => p.id === patient.id)) {
                combinedResults.push(patient)
              }
            })

            setDisplayedPatients(filterPatientsLocally(combinedResults, debouncedSearchTerm))
          }
        } catch (err) {
          console.error("Error en búsqueda API:", err)
          // Mantener resultados locales en caso de error
        }
      }

      setIsSearching(false)
    }

    handleSearch()
  }, [debouncedSearchTerm, allPatients, filterPatientsLocally, hasMore, apiRequest, buildUrl])

  const updatePatient = useCallback((updatedPatientData: Patient) => {
    setAllPatients((prev) => prev.map((p) => (p.id === updatedPatientData.id ? updatedPatientData : p)))
  }, [])

  const addPatient = useCallback((newPatientData: Patient) => {
    setAllPatients((prev) => [newPatientData, ...prev])
    setTotalCount((prev) => prev + 1)
  }, [])

  const handleSelectPatient = (patient: Patient, action: string) => {
    setSelectedPatient(patient)
    switch (action) {
      case "delete":
        setIsDeleting(true)
        break
    }
  }

  const closeAllDialogs = () => {
    setSelectedPatient(null)
    setIsCreating(false)
    setIsDeleting(false)
  }

  const clearSearch = () => {
    setSearchTerm("")
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  // Estados de carga y error
  if (isInitialLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto py-4 px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-6 flex justify-center items-center min-h-[300px]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-[#204983] animate-spin mb-2" />
            <p className="text-gray-600">Cargando pacientes...</p>
          </div>
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
            <Button onClick={() => fetchPatientsFromAPI("", true)} className="mt-3 bg-[#204983]" size="sm">
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full mx-auto py-4 px-4">
      {/* Header Container */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gestión de Pacientes</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalCount > 0 && `${totalCount} pacientes registrados`}
              {searchTerm && ` • ${displayedPatients.length} resultados`}
            </p>
          </div>
          <Button className="bg-[#204983] w-full sm:w-auto" onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Paciente
          </Button>
        </div>
      </div>

      {/* Search Container */}
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
          {isSearching && (
            <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-4 w-4 text-[#204983] animate-spin" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs md:text-sm text-gray-500">Búsqueda instantánea por DNI o nombre del paciente</p>
          {searchTerm && (
            <p className="text-xs text-[#204983] font-medium">
              {displayedPatients.length} resultado{displayedPatients.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Patients List */}
      <div className="space-y-4">
        <PatientGrid
          patients={displayedPatients}
          onSelectPatient={handleSelectPatient}
          updatePatient={updatePatient}
          apiRequest={apiRequest}
        />

        {/* Infinite Scroll Sentinel - Solo cuando no hay búsqueda */}
        {!searchTerm && hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {isLoadingMore && (
              <div className="flex items-center">
                <Loader2 className="h-6 w-6 text-[#204983] animate-spin mr-2" />
                <span className="text-gray-600">Cargando más pacientes...</span>
              </div>
            )}
          </div>
        )}

        {/* No more results */}
        {!searchTerm && !hasMore && allPatients.length > 0 && (
          <div className="text-center py-4 text-gray-500">
            <p>No hay más pacientes para mostrar</p>
          </div>
        )}
      </div>

      {/* Diálogos */}
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
        setPatients={setAllPatients}
        apiRequest={apiRequest}
      />
    </div>
  )
}
