"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Search,
  Plus,
  Filter,
  Calendar,
  User,
  FileText,
  Loader2,
  AlertCircle,
  X,
  CheckCircle,
  Clock,
  Ban,
  AlertTriangle,
  Receipt,
  CheckSquare,
  Square,
  Download,
  Mail,
  MessageCircle,
} from "lucide-react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Card, CardContent } from "../ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { ProtocolCard } from "./components/protocol-card"
import { useApi } from "../../hooks/use-api"
import { useInfiniteScroll } from "../../hooks/use-infinite-scroll"
import { useDebounce } from "../../hooks/use-debounce"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { PROTOCOL_ENDPOINTS, ANALYTICS_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import type { ProtocolListItem, SendMethod } from "@/types"

interface PaginatedResponse {
  count: number
  next: string | null
  previous: string | null
  results: ProtocolListItem[]
}

interface ProtocolsByStatusResponse {
  total_protocols: number
  states: Array<{
    status_id: number
    status_name: string
    count: number
  }>
}

const STATUS_ID_MAP: Record<number, string> = {
  1: "pendingEntry",
  2: "pendingValidation",
  3: "incompletePayment",
  4: "cancelled",
  5: "completed",
  6: "pendingRetiro",
  7: "sendFailed",
  8: "pendingBilling",
}

const STATUS_FILTER_KEY = "labsalud_protocol_status_filters"

export default function ProtocolosPage() {
  const { apiRequest } = useApi()
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Estados principales
  const [allProtocols, setAllProtocols] = useState<ProtocolListItem[]>([])
  const [sendMethods, setSendMethods] = useState<SendMethod[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STATUS_FILTER_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all")
  const [isPrintedFilter, setIsPrintedFilter] = useState<string>("all")
  const [hasMore, setHasMore] = useState(true)
  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Estados para seleccion batch
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedProtocols, setSelectedProtocols] = useState<Set<number>>(new Set())
  const [batchReportType, setBatchReportType] = useState<"full" | "summary">("full")
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)

  // Estados para estadísticas
  const [stats, setStats] = useState({
    total: 0,
    pendingEntry: 0,
    pendingRetiro: 0,
    incompletePayment: 0,
    pendingValidation: 0,
    completed: 0,
    cancelled: 0,
    sendFailed: 0,
    pendingBilling: 0,
  })

  // Debounce para la búsqueda
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const fetchStateStats = useCallback(async () => {
    try {
      const response = await apiRequest(ANALYTICS_ENDPOINTS.PROTOCOLS_BY_STATUS)

      if (response.ok) {
        const data: ProtocolsByStatusResponse = await response.json()

        // Inicializar stats con todos en 0
        const newStats = {
          total: data.total_protocols,
          pendingEntry: 0,
          pendingRetiro: 0,
          incompletePayment: 0,
          pendingValidation: 0,
          completed: 0,
          cancelled: 0,
          sendFailed: 0,
          pendingBilling: 0,
        }

        // Solo asignar los que vienen en la respuesta (los que tienen 1 o más)
        data.states.forEach((state) => {
          const key = STATUS_ID_MAP[state.status_id]
          if (key && key in newStats) {
            ;(newStats as Record<string, number>)[key] = state.count
          }
        })

        setStats(newStats)
      }
    } catch (error) {
      console.error("Error fetching state stats:", error)
    }
  }, [apiRequest])

  const fetchSendMethods = useCallback(async () => {
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.SEND_METHODS)
      if (response.ok) {
        const data = await response.json()
        setSendMethods(data.results || data)
      }
    } catch (error) {
      console.error("Error fetching send methods:", error)
    }
  }, [apiRequest])

  const buildUrl = useCallback(
    (search = "", offset = 0) => {
      const baseEndpoint = PROTOCOL_ENDPOINTS.PROTOCOLS

      const params = new URLSearchParams({
        limit: "20",
        offset: offset.toString(),
      })

      if (search.trim()) {
        params.append("search", search.trim())
      }

      if (selectedStatuses.length > 0) {
        params.append("status__in", selectedStatuses.join(","))
      }

      if (paymentStatusFilter !== "all") {
        params.append("payment_status", paymentStatusFilter)
      }

      if (isPrintedFilter !== "all") {
        params.append("is_printed", isPrintedFilter)
      }

      return `${baseEndpoint}?${params.toString()}`
    },
    [selectedStatuses, paymentStatusFilter, isPrintedFilter],
  )

  // Función para cargar protocolos desde la API
  const fetchProtocolsFromAPI = useCallback(
    async (search = "", reset = true, showSearching = false) => {
      if (reset && !showSearching && isInitialLoading) return
      if (!reset && isLoadingMore) return
      if (reset && showSearching && isSearching) return

      if (reset && !showSearching) {
        setIsInitialLoading(true)
        setError(null)
      } else if (reset && showSearching) {
        setIsSearching(true)
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
            setAllProtocols(data.results)
            setTotalCount(data.count)
          } else {
            setAllProtocols((prev) => [...prev, ...data.results])
          }

          setNextUrl(data.next)
          setHasMore(!!data.next)
        } else {
          setError("Error al cargar los protocolos")
        }
      } catch (err) {
        console.error("Error al cargar datos:", err)
        setError("Error al cargar los datos. Por favor, intenta nuevamente.")
      } finally {
        setIsInitialLoading(false)
        setIsLoadingMore(false)
        setIsSearching(false)
      }
    },
    [apiRequest, buildUrl, nextUrl, isInitialLoading, isLoadingMore, isSearching],
  )

  // Cargar más protocolos (scroll infinito)
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && nextUrl && !isSearching) {
      fetchProtocolsFromAPI("", false)
    }
  }, [isLoadingMore, hasMore, nextUrl, isSearching, fetchProtocolsFromAPI])

  // Hook de scroll infinito
  const sentinelRef = useInfiniteScroll({
    loading: isLoadingMore || isSearching,
    hasMore: hasMore,
    onLoadMore: loadMore,
    dependencies: [hasMore, nextUrl],
  })

  // Efecto para carga inicial
  useEffect(() => {
    fetchProtocolsFromAPI()
    fetchSendMethods()
    fetchStateStats()
  }, [])

  useEffect(() => {
    setAllProtocols([])
    setNextUrl(null)
    setHasMore(true)
    fetchProtocolsFromAPI()
  }, [selectedStatuses, paymentStatusFilter, isPrintedFilter])

  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return

    fetchProtocolsFromAPI(debouncedSearchTerm, true, true)
  }, [debouncedSearchTerm])

  useEffect(() => {
    localStorage.setItem(STATUS_FILTER_KEY, JSON.stringify(selectedStatuses))
  }, [selectedStatuses])

  const clearSearch = () => {
    setSearchTerm("")
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  const handleNewProtocol = () => {
    navigate("/ingreso")
  }

  const refreshProtocols = useCallback(() => {
    setAllProtocols([])
    setNextUrl(null)
    setHasMore(true)
    fetchProtocolsFromAPI(debouncedSearchTerm, true, true)
    fetchStateStats()
  }, [fetchProtocolsFromAPI, debouncedSearchTerm, fetchStateStats])

  const toggleStatus = (statusId: number) => {
    setSelectedStatuses((prev) =>
      prev.includes(statusId) ? prev.filter((id) => id !== statusId) : [...prev, statusId],
    )
  }

  const toggleSelectionMode = () => {
    setIsSelectionMode((prev) => {
      if (prev) setSelectedProtocols(new Set())
      return !prev
    })
  }

  const toggleProtocolSelection = useCallback((id: number) => {
    setSelectedProtocols((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = () => {
    setSelectedProtocols(new Set(allProtocols.map((p) => p.id)))
  }

  const deselectAll = () => {
    setSelectedProtocols(new Set())
  }

  const handleBatchAction = async (action: "download" | "email" | "whatsapp") => {
    if (selectedProtocols.size === 0) return

    setIsBatchProcessing(true)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.REPORT_BATCH, {
        method: "POST",
        body: {
          protocol_ids: Array.from(selectedProtocols),
          action,
          type: batchReportType,
        },
      })

      if (response.ok) {
        if (action === "download") {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `reportes_${new Date().toISOString().slice(0, 10)}.zip`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)
          toast.success("Reportes descargados exitosamente", { duration: TOAST_DURATION })
        } else {
          const data = await response.json()
          const successCount = data.successes?.length || 0
          const errorCount = data.errors?.length || 0
          if (errorCount > 0) {
            toast.warning(
              `${successCount} enviados, ${errorCount} con error`,
              { duration: TOAST_DURATION },
            )
          } else {
            toast.success(
              `${successCount} reportes enviados por ${action === "email" ? "email" : "WhatsApp"}`,
              { duration: TOAST_DURATION },
            )
          }
        }
        setSelectedProtocols(new Set())
        setIsSelectionMode(false)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "Error al procesar los reportes")
      }
    } catch (error) {
      console.error("Error batch action:", error)
      const message = error instanceof Error ? error.message : "Error al procesar los reportes"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsBatchProcessing(false)
    }
  }

  if (isInitialLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto py-4 px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-6 flex justify-center items-center min-h-[300px]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-[#204983] animate-spin mb-2" />
            <p className="text-gray-600">Cargando protocolos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto py-4 px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Gestión de Protocolos</h1>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p>{error}</p>
            </div>
            <Button onClick={() => fetchProtocolsFromAPI("", true)} className="mt-3 bg-[#204983]" size="sm">
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
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gestión de Protocolos</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalCount > 0 && `${totalCount} protocolos registrados`}
              {searchTerm && ` • ${allProtocols.length} resultados`}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant={isSelectionMode ? "default" : "outline"}
              onClick={toggleSelectionMode}
              className={`flex-1 sm:flex-initial ${isSelectionMode ? "bg-[#204983]" : ""}`}
            >
              {isSelectionMode ? <CheckSquare className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
              {isSelectionMode ? "Cancelar" : "Seleccionar"}
            </Button>
            <Button onClick={handleNewProtocol} className="bg-[#204983] flex-1 sm:flex-initial">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Protocolo
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-yellow-700">Pend. Carga</p>
                  <p className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.pendingEntry}</p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-purple-700">Pend. Retiro</p>
                  <p className="text-lg sm:text-2xl font-bold text-purple-600">{stats.pendingRetiro}</p>
                </div>
                <User className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-orange-700">Pago Incompleto</p>
                  <p className="text-lg sm:text-2xl font-bold text-orange-600">{stats.incompletePayment}</p>
                </div>
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-blue-700">Pend. Validación</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.pendingValidation}</p>
                </div>
                <Filter className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-green-700">Completados</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-red-700">Cancelados</p>
                  <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
                <Ban className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-red-700">Envío Fallido</p>
                  <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.sendFailed}</p>
                </div>
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-teal-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-teal-700">Pend. Facturación</p>
                  <p className="text-lg sm:text-2xl font-bold text-teal-600">{stats.pendingBilling}</p>
                </div>
                <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-teal-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Filters Container */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar por ID, paciente o estado..."
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

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Filtrar por estado:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedStatuses.includes(1) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStatus(1)}
                className={selectedStatuses.includes(1) ? "bg-yellow-500 hover:bg-yellow-600" : ""}
              >
                <Clock className="h-3 w-3 mr-1" />
                Pend. Carga
              </Button>
              <Button
                variant={selectedStatuses.includes(2) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStatus(2)}
                className={selectedStatuses.includes(2) ? "bg-blue-500 hover:bg-blue-600" : ""}
              >
                <Filter className="h-3 w-3 mr-1" />
                Pend. Validación
              </Button>
              <Button
                variant={selectedStatuses.includes(3) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStatus(3)}
                className={selectedStatuses.includes(3) ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <Calendar className="h-3 w-3 mr-1" />
                Pago Incompleto
              </Button>
              <Button
                variant={selectedStatuses.includes(6) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStatus(6)}
                className={selectedStatuses.includes(6) ? "bg-purple-500 hover:bg-purple-600" : ""}
              >
                <User className="h-3 w-3 mr-1" />
                Pend. Retiro
              </Button>
              <Button
                variant={selectedStatuses.includes(5) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStatus(5)}
                className={selectedStatuses.includes(5) ? "bg-green-500 hover:bg-green-600" : ""}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Completado
              </Button>
              <Button
                variant={selectedStatuses.includes(4) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStatus(4)}
                className={selectedStatuses.includes(4) ? "bg-red-500 hover:bg-red-600" : ""}
              >
                <Ban className="h-3 w-3 mr-1" />
                Cancelado
              </Button>
              <Button
                variant={selectedStatuses.includes(7) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStatus(7)}
                className={selectedStatuses.includes(7) ? "bg-rose-600 hover:bg-rose-700" : ""}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Envío Fallido
              </Button>
              <Button
                variant={selectedStatuses.includes(8) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStatus(8)}
                className={selectedStatuses.includes(8) ? "bg-teal-500 hover:bg-teal-600" : ""}
              >
                <Receipt className="h-3 w-3 mr-1" />
                Pend. Facturación
              </Button>
              {selectedStatuses.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedStatuses([])} className="text-gray-500">
                  <X className="h-3 w-3 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-wrap">
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Estado de Pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="1">Saldo en cero</SelectItem>
                <SelectItem value="2">Paciente debe</SelectItem>
                <SelectItem value="3">Laboratorio debe</SelectItem>
              </SelectContent>
            </Select>

            <Select value={isPrintedFilter} onValueChange={setIsPrintedFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Impresión" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Impreso / Enviado</SelectItem>
                <SelectItem value="false">No Impreso / No Enviado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs md:text-sm text-gray-500">Búsqueda por ID, nombre de paciente o estado</p>
            {(searchTerm || selectedStatuses.length > 0) && (
              <p className="text-xs text-[#204983] font-medium">
                {allProtocols.length} resultado{allProtocols.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Protocols List */}
      <div className="space-y-4">
        {allProtocols.length === 0 && !isInitialLoading && !isSearching ? (
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-8 sm:p-12 text-center">
            <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No se encontraron protocolos</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              {searchTerm || selectedStatuses.length > 0 || paymentStatusFilter !== "all" || isPrintedFilter !== "all"
                ? "Intenta ajustar los filtros de búsqueda"
                : "Aún no hay protocolos registrados en el sistema"}
            </p>
            <Button onClick={handleNewProtocol} className="bg-[#204983] hover:bg-[#1a3d6b] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Protocolo
            </Button>
          </div>
        ) : (
          <>
            {isSearching && (
              <div className="flex justify-center py-4">
                <div className="flex items-center">
                  <Loader2 className="h-5 w-5 text-[#204983] animate-spin mr-2" />
                  <span className="text-gray-600">Buscando protocolos...</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-start">
              {allProtocols.map((protocol) => (
                <ProtocolCard
                  key={protocol.id}
                  protocol={protocol}
                  onUpdate={refreshProtocols}
                  sendMethods={sendMethods}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedProtocols.has(protocol.id)}
                  onToggleSelection={toggleProtocolSelection}
                />
              ))}
            </div>
          </>
        )}

        {/* Infinite Scroll Sentinel */}
        {hasMore && !isSearching && !isInitialLoading && allProtocols.length > 0 && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {isLoadingMore && (
              <div className="flex items-center">
                <Loader2 className="h-6 w-6 text-[#204983] animate-spin mr-2" />
                <span className="text-gray-600">Cargando más protocolos...</span>
              </div>
            )}
          </div>
        )}

        {/* No more results */}
        {!hasMore && allProtocols.length > 0 && (
          <div className="text-center py-4 text-gray-500">
            <p>No hay más protocolos para mostrar</p>
          </div>
        )}
      </div>

      {/* Floating Batch Action Bar */}
      {isSelectionMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            {/* Selection info + select/deselect all */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-sm font-medium text-gray-700">
                {selectedProtocols.size} seleccionado{selectedProtocols.size !== 1 ? "s" : ""}
              </span>
              <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
                Todos
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs">
                Ninguno
              </Button>
            </div>

            {/* Report type selector */}
            <Select value={batchReportType} onValueChange={(v: "full" | "summary") => setBatchReportType(v)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Reporte completo</SelectItem>
                <SelectItem value="summary">Resumen</SelectItem>
              </SelectContent>
            </Select>

            {/* Action buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                disabled={selectedProtocols.size === 0 || isBatchProcessing}
                onClick={() => handleBatchAction("download")}
                className="bg-[#204983] flex-1 sm:flex-initial"
              >
                {isBatchProcessing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                Descargar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedProtocols.size === 0 || isBatchProcessing}
                onClick={() => handleBatchAction("email")}
                className="flex-1 sm:flex-initial"
              >
                <Mail className="h-4 w-4 mr-1" />
                Email
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedProtocols.size === 0 || isBatchProcessing}
                onClick={() => handleBatchAction("whatsapp")}
                className="flex-1 sm:flex-initial"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
