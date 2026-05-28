"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
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
  Download,
  Printer,
  Mail,
  MessageCircle,
  PenLine,
  GitMerge,
} from "lucide-react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Skeleton } from "../ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { ProtocolCard } from "./components/protocol-card"
import { useApi } from "../../hooks/use-api"
import { useApiQuery } from "@/hooks/use-api-query"
import { useInfiniteScroll } from "../../hooks/use-infinite-scroll"
import { useDebounce } from "../../hooks/use-debounce"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { PROTOCOL_ENDPOINTS, ANALYTICS_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import type { ProtocolListItem, SendMethod } from "@/types"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import {
  getProtocolStatusStyleByName,
  normalizeProtocolStatusName,
} from "@/lib/status-styles"

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

const STATUS_FILTER_KEY = "labsalud_protocol_status_filters"
const HIDDEN_PROTOCOL_STATUS_NAMES = new Set(["pendiente de facturacion", "facturado"])
type ReportAction = "download" | "email" | "whatsapp"
type MergeReportAction = "print" | ReportAction

const getStatusIcon = (statusName: string) => {
  switch (normalizeProtocolStatusName(statusName)) {
    case "pendiente de validacion":
      return Filter
    case "pendiente de revision":
      return PenLine
    case "pago incompleto":
      return Calendar
    case "pendiente de retiro":
      return User
    case "completado":
      return CheckCircle
    case "cancelado":
      return Ban
    case "envio fallido":
      return AlertTriangle
    case "pendiente de envio":
      return Mail
    case "informacion faltante":
      return AlertCircle
    default:
      return Clock
  }
}

export default function ProtocolosPage() {
  const { apiRequest } = useApi()
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Estados principales
  const [allProtocols, setAllProtocols] = useState<ProtocolListItem[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STATUS_FILTER_KEY)
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) ? parsed.filter((status) => Number.isInteger(status)) : []
    } catch {
      return []
    }
  })
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all")
  const [isPrintedFilter, setIsPrintedFilter] = useState<string>("all")
  const [hasMore, setHasMore] = useState(true)
  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Selección batch (el checkbox está siempre visible; el modo se infiere de la selección)
  const [selectedProtocols, setSelectedProtocols] = useState<Set<number>>(new Set())
  const isSelectionMode = selectedProtocols.size > 0
  const [batchReportType, setBatchReportType] = useState<"full" | "summary">("full")
  const [batchSigned, setBatchSigned] = useState(false)
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)

  // Debounce para la búsqueda
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Estadísticas por estado vía React Query — cache 30s, refetch en window focus.
  const stateStatsQuery = useApiQuery<ProtocolsByStatusResponse>({
    queryKey: ["analytics", "protocols-by-status"],
    url: ANALYTICS_ENDPOINTS.PROTOCOLS_BY_STATUS,
    staleTime: 30 * 1000,
  })
  const rawStatusItems = useMemo(
    () =>
      (stateStatsQuery.data?.states || [])
        .filter((state) => !HIDDEN_PROTOCOL_STATUS_NAMES.has(normalizeProtocolStatusName(state.status_name)))
        .map((state) => ({
          id: state.status_id,
          name: state.status_name,
          count: state.count,
          icon: getStatusIcon(state.status_name),
        })),
    [stateStatsQuery.data],
  )
  const cancelledStatusId = rawStatusItems.find((item) => normalizeProtocolStatusName(item.name) === "cancelado")?.id
  const cancelledCountQuery = useApiQuery<{ count: number }>({
    queryKey: ["protocols", "status-count", "cancelado", cancelledStatusId],
    url: `${PROTOCOL_ENDPOINTS.PROTOCOLS}?limit=1&status=${cancelledStatusId || ""}`,
    enabled: Boolean(cancelledStatusId),
    staleTime: 30 * 1000,
  })
  const statusItems = useMemo(
    () =>
      rawStatusItems.map((item) =>
        normalizeProtocolStatusName(item.name) === "cancelado"
          ? { ...item, count: cancelledCountQuery.data?.count ?? item.count }
          : item,
      ),
    [rawStatusItems, cancelledCountQuery.data],
  )
  const availableStatusIds = useMemo(() => statusItems.map((item) => item.id), [statusItems])
  const activeProtocolsCount = useMemo(() => {
    const total = stateStatsQuery.data?.total_protocols
    if (typeof total !== "number") return null
    const cancelledFromAnalytics =
      rawStatusItems.find((item) => normalizeProtocolStatusName(item.name) === "cancelado")?.count ?? 0
    return Math.max(0, total - cancelledFromAnalytics)
  }, [stateStatsQuery.data, rawStatusItems])

  const fetchStateStats = useCallback(() => {
    stateStatsQuery.refetch()
    if (cancelledStatusId) cancelledCountQuery.refetch()
  }, [stateStatsQuery, cancelledCountQuery, cancelledStatusId])

  // Send methods raramente cambia → cache de 30 minutos
  const sendMethodsQuery = useApiQuery<{ results?: SendMethod[] } | SendMethod[]>({
    queryKey: ["protocols", "send-methods"],
    url: PROTOCOL_ENDPOINTS.SEND_METHODS,
    staleTime: 30 * 60 * 1000,
  })
  const sendMethods: SendMethod[] = Array.isArray(sendMethodsQuery.data)
    ? sendMethodsQuery.data
    : sendMethodsQuery.data?.results || []

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

  useEffect(() => {
    if (availableStatusIds.length === 0) return
    setSelectedStatuses((prev) => prev.filter((statusId) => availableStatusIds.includes(statusId)))
  }, [availableStatusIds])

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
    if (availableStatusIds.length > 0 && !availableStatusIds.includes(statusId)) return
    setSelectedStatuses((prev) =>
      prev.includes(statusId) ? prev.filter((id) => id !== statusId) : [...prev, statusId],
    )
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

  const handleMergeReport = async (action: MergeReportAction) => {
    if (selectedProtocols.size < 2) {
      toast.error("Seleccioná al menos 2 protocolos del mismo paciente.", { duration: TOAST_DURATION })
      return
    }
    const ids = Array.from(selectedProtocols)
    const patientIds = new Set(
      allProtocols.filter((p) => ids.includes(p.id)).map((p) => p.patient?.id).filter((id): id is number => typeof id === "number"),
    )
    if (patientIds.size > 1) {
      toast.error("Todos los protocolos deben ser del mismo paciente para unificar el reporte.", { duration: TOAST_DURATION })
      return
    }

    setIsBatchProcessing(true)
    try {
      const endpointAction: ReportAction = action === "print" ? "download" : action
      const response = await apiRequest(PROTOCOL_ENDPOINTS.MERGE_REPORT, {
        method: "POST",
        body: {
          protocol_ids: ids,
          action: endpointAction,
          type: batchReportType,
          signed: batchSigned,
        },
      })

      if (response.ok) {
        if (action === "print" || action === "download") {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)

          if (action === "print") {
            const previewLink = document.createElement("a")
            previewLink.href = url
            previewLink.target = "_blank"
            previewLink.rel = "noopener noreferrer"
            document.body.appendChild(previewLink)
            previewLink.click()
            previewLink.remove()
            setTimeout(() => {
              window.URL.revokeObjectURL(url)
            }, 30000)
            toast.success("Reporte unificado listo para imprimir", { duration: TOAST_DURATION })
          } else {
            const a = document.createElement("a")
            a.href = url
            const signedSuffix = batchSigned ? "firmado" : "sin_firma"
            a.download = `reporte_unificado_${batchReportType}_${signedSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
            toast.success("Reporte unificado descargado", { duration: TOAST_DURATION })
          }
        } else {
          const data = await response.json().catch(() => ({}))
          toast.success(data.detail || "Reporte unificado enviado", { duration: TOAST_DURATION })
        }
        setSelectedProtocols(new Set())
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(formatApiError(errorData, "No se pudo generar el reporte unificado"))
      }
    } catch (error) {
      console.error("Error merge report:", error)
      toast.error(getErrorMessage(error, "Error al generar el reporte unificado"), { duration: TOAST_DURATION })
    } finally {
      setIsBatchProcessing(false)
    }
  }

  const handleBatchAction = async (action: ReportAction) => {
    if (selectedProtocols.size === 0) return

    setIsBatchProcessing(true)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.REPORT_BATCH, {
        method: "POST",
        body: {
          protocol_ids: Array.from(selectedProtocols),
          action,
          type: batchReportType,
          signed: batchSigned,
        },
      })

      if (response.ok) {
        if (action === "download") {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          const signedSuffix = batchSigned ? "firmado" : "sin_firma"
          a.download = `protocolos_${batchReportType}_${signedSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`
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
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(formatApiError(errorData, "Error al procesar los reportes"))
      }
    } catch (error) {
      console.error("Error batch action:", error)
      const message = getErrorMessage(error, "Error al procesar los reportes")
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsBatchProcessing(false)
    }
  }

  if (isInitialLoading) {
    return (
      <div className="w-full max-w-full mx-auto py-4 px-4">
        {/* Header skeleton */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex-1">
              <Skeleton className="h-8 w-64 rounded mb-2" />
              <Skeleton className="h-4 w-96 rounded" />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Skeleton className="h-10 flex-1 sm:flex-initial rounded" />
              <Skeleton className="h-10 flex-1 sm:flex-initial rounded" />
            </div>
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-10 gap-3 sm:gap-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Search and filters skeleton */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
          <Skeleton className="h-12 w-full rounded mb-4" />
          <div className="flex flex-wrap gap-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-32 rounded" />
            ))}
          </div>
        </div>

        {/* Protocol cards skeleton */}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
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
            <Button onClick={handleNewProtocol} className="bg-[#204983] flex-1 sm:flex-initial">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Protocolo
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="rounded-lg bg-white/95 p-3 shadow-md">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-[11px] font-medium text-gray-500">Protocolos activos</p>
              <p className="text-lg font-bold text-gray-900">{activeProtocolsCount ?? "-"}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {stateStatsQuery.isLoading ? (
              <div className="flex gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-32 rounded-full" />
                ))}
              </div>
            ) : (
              statusItems.map((item) => {
              const style = getProtocolStatusStyleByName(item.name)
              const selected = selectedStatuses.includes(item.id)
              const Icon = item.icon

              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleStatus(item.id)}
                  className={`h-8 shrink-0 rounded-full border px-3 text-xs ${
                    selected ? `${style.solid} text-white` : `${style.badgeOutline} hover:bg-white`
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 mr-1" />
                  {style.shortLabel}
                  <span className="ml-1 rounded-full bg-white/70 px-1.5 text-[11px] text-gray-700">{item.count}</span>
                </Button>
              )
            })
            )}
            {selectedStatuses.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedStatuses([])} className="h-8 shrink-0 rounded-full text-gray-500">
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
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
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
            )}
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
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-start">
              {allProtocols.map((protocol) => (
                <ProtocolCard
                  key={protocol.id}
                  protocol={protocol}
                  onUpdate={refreshProtocols}
                  sendMethods={sendMethods}
                  isSelected={selectedProtocols.has(protocol.id)}
                  onToggleSelection={toggleProtocolSelection}
                />
              ))}
            </div>
          </>
        )}

        {/* Infinite Scroll Sentinel */}
        {hasMore && !isSearching && !isInitialLoading && allProtocols.length > 0 && (
          <div ref={sentinelRef} className="py-2">
            {isLoadingMore && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
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

            {/* Signed toggle */}
            <button
              type="button"
              onClick={() => setBatchSigned(!batchSigned)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors whitespace-nowrap ${
                batchSigned
                  ? "border-[#204983] bg-blue-50 text-[#204983]"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <PenLine className="h-4 w-4 shrink-0" />
              <span className="font-medium">{batchSigned ? "Firma digital" : "Sin firma digital"}</span>
            </button>

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedProtocols.size < 2 || isBatchProcessing}
                    className="flex-1 sm:flex-initial border-[#204983] text-[#204983] hover:bg-[#204983] hover:text-white"
                    title="Combinar varios protocolos del mismo paciente en un único reporte"
                  >
                    {isBatchProcessing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <GitMerge className="h-4 w-4 mr-1" />
                    )}
                    Unificar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Reporte unificado</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleMergeReport("print")}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMergeReport("download")}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMergeReport("email")}>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar por email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMergeReport("whatsapp")}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Enviar por WhatsApp
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
