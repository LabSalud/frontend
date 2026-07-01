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
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { ProtocolsTable } from "./components/protocols-table"
import { useProtocolQuickActions } from "./components/use-protocol-quick-actions"
import { useAuth } from "@/contexts/auth-context"
import { usePersistedState } from "@/hooks/use-persisted-state"
import { PERMISSIONS } from "@/config/permissions"
import type { SortState } from "@/components/common/data-table"
import { useApi } from "../../hooks/use-api"
import { useApiQuery } from "@/hooks/use-api-query"
import { useInfiniteScroll } from "../../hooks/use-infinite-scroll"
import { useDebounce } from "../../hooks/use-debounce"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { PROTOCOL_ENDPOINTS, ANALYTICS_ENDPOINTS, REPORTING_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import type { ProtocolListItem, ReportSignature } from "@/types"
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
type BatchReportAction = "print" | ReportAction

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
  type StatusFilterState = { include: number[]; exclude: number[] }
  const [statusFilter, setStatusFilter] = useState<StatusFilterState>(() => {
    try {
      const saved = localStorage.getItem(STATUS_FILTER_KEY)
      if (!saved) return { include: [], exclude: [] }
      const parsed = JSON.parse(saved)
      // Compat: previously stored as number[] (only includes)
      if (Array.isArray(parsed)) {
        return { include: parsed.filter((s) => Number.isInteger(s)), exclude: [] }
      }
      const include = Array.isArray(parsed.include) ? parsed.include.filter((s: unknown) => Number.isInteger(s)) : []
      const exclude = Array.isArray(parsed.exclude) ? parsed.exclude.filter((s: unknown) => Number.isInteger(s)) : []
      return { include, exclude }
    } catch {
      return { include: [], exclude: [] }
    }
  })
  const [isPrintedFilter, setIsPrintedFilter] = usePersistedState<string>("labsalud_protocols_printed_filter", "all")
  const [paymentStatusFilter, setPaymentStatusFilter] = usePersistedState<string>("labsalud_protocols_payment_filter", "all")
  const [hasMore, setHasMore] = useState(true)
  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [sort, setSort] = useState<SortState>(null)

  // Selección batch (el checkbox está siempre visible; el modo se infiere de la selección)
  const [selectedProtocols, setSelectedProtocols] = useState<Set<number>>(new Set())
  const isSelectionMode = selectedProtocols.size > 0
  const [batchReportType, setBatchReportType] = useState<"full" | "summary">("full")
  const [batchSigned, setBatchSigned] = useState(true)
  const [batchSignatureId, setBatchSignatureId] = useState("default")
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

  const signaturesQuery = useApiQuery<{ results?: ReportSignature[] } | ReportSignature[]>({
    queryKey: ["reporting", "signatures"],
    url: REPORTING_ENDPOINTS.SIGNATURES,
    staleTime: 5 * 60 * 1000,
  })
  const reportSignatures: ReportSignature[] = Array.isArray(signaturesQuery.data)
    ? signaturesQuery.data
    : signaturesQuery.data?.results || []

  const buildUrl = useCallback(
    (search = "", offset = 0) => {
      const baseEndpoint = PROTOCOL_ENDPOINTS.PROTOCOLS

      const params = new URLSearchParams({
        limit: "20",
        offset: offset.toString(),
        // Vista tabla densa: serializer slim del backend (sin breakdown de pago,
        // sin auditoría, sin unplanned). Mucho más liviano por fila.
        view: "table",
      })

      if (search.trim()) {
        params.append("search", search.trim())
      }

      if (sort) {
        params.append("ordering", `${sort.dir === "desc" ? "-" : ""}${sort.field}`)
      }

      if (statusFilter.include.length > 0) {
        params.append("status", statusFilter.include.join(","))
      }
      if (statusFilter.exclude.length > 0) {
        params.append("exclude_status", statusFilter.exclude.join(","))
      }

      if (isPrintedFilter !== "all") {
        params.append("is_printed", isPrintedFilter)
      }

      if (paymentStatusFilter !== "all") {
        params.append("payment_status", paymentStatusFilter)
      }

      return `${baseEndpoint}?${params.toString()}`
    },
    [statusFilter, isPrintedFilter, paymentStatusFilter, sort],
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

  // Acciones rápidas de fila (pago / imprimir / enviar). Tras cada una,
  // recargamos el listado para reflejar el nuevo estado.
  const quickActions = useProtocolQuickActions(() =>
    fetchProtocolsFromAPI(debouncedSearchTerm, true, true),
  )

  const { user, hasPermission } = useAuth()
  const canUncancel = Boolean(user?.is_superuser || hasPermission(PERMISSIONS.UNCANCEL_PROTOCOLS.codename))

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
    setNextUrl(null)
    setHasMore(true)
    // No vaciar `allProtocols` ni mostrar skeleton de página completa.
    // Refetch con `showSearching=true` -> isSearching=true muestra spinner sutil sin
    // resetear toda la UI; al llegar la respuesta, `setAllProtocols(data.results)`
    // reemplaza la lista atómicamente.
    fetchProtocolsFromAPI(debouncedSearchTerm, true, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, isPrintedFilter, paymentStatusFilter, sort])

  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return

    fetchProtocolsFromAPI(debouncedSearchTerm, true, true)
  }, [debouncedSearchTerm])

  useEffect(() => {
    localStorage.setItem(STATUS_FILTER_KEY, JSON.stringify(statusFilter))
  }, [statusFilter])

  useEffect(() => {
    if (availableStatusIds.length === 0) return
    setStatusFilter((prev) => ({
      include: prev.include.filter((id) => availableStatusIds.includes(id)),
      exclude: prev.exclude.filter((id) => availableStatusIds.includes(id)),
    }))
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

  const toggleStatus = (statusId: number) => {
    if (availableStatusIds.length > 0 && !availableStatusIds.includes(statusId)) return
    setStatusFilter((prev) => {
      const inInclude = prev.include.includes(statusId)
      const inExclude = prev.exclude.includes(statusId)
      // neutral → include → exclude → neutral
      if (!inInclude && !inExclude) {
        return { ...prev, include: [...prev.include, statusId] }
      }
      if (inInclude) {
        return {
          include: prev.include.filter((id) => id !== statusId),
          exclude: [...prev.exclude, statusId],
        }
      }
      // inExclude
      return { ...prev, exclude: prev.exclude.filter((id) => id !== statusId) }
    })
  }
  const getStatusFilterState = (statusId: number): "neutral" | "include" | "exclude" => {
    if (statusFilter.include.includes(statusId)) return "include"
    if (statusFilter.exclude.includes(statusId)) return "exclude"
    return "neutral"
  }
  const hasAnyStatusFilter = statusFilter.include.length > 0 || statusFilter.exclude.length > 0

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

  const handleBatchReportTypeChange = (type: "full" | "summary") => {
    setBatchReportType(type)
    setBatchSigned(type === "full")
  }

  const getBatchSignaturePayload = () =>
    batchSigned && batchSignatureId !== "default" ? { signature_id: Number(batchSignatureId) } : {}

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
          ...getBatchSignaturePayload(),
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

  const handleBatchAction = async (action: BatchReportAction) => {
    if (selectedProtocols.size === 0) return

    setIsBatchProcessing(true)
    try {
      const endpointAction: ReportAction = action === "print" ? "download" : action
      const response = await apiRequest(PROTOCOL_ENDPOINTS.REPORT_BATCH, {
        method: "POST",
        body: {
          protocol_ids: Array.from(selectedProtocols),
          action: endpointAction,
          type: batchReportType,
          signed: batchSigned,
          ...getBatchSignaturePayload(),
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
            toast.success("Reportes listos para imprimir", { duration: TOAST_DURATION })
          } else {
            const a = document.createElement("a")
            a.href = url
            const signedSuffix = batchSigned ? "firmado" : "sin_firma"
            a.download = `protocolos_${batchReportType}_${signedSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
            toast.success("Reportes descargados exitosamente", { duration: TOAST_DURATION })
          }
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
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-md p-4 md:p-6">
        {/* Fila superior: título (izq) · búsqueda (centro) · filtros (der).
            Título y Filtros con el mismo ancho para quedar balanceados. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="lg:w-52 lg:shrink-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Protocolos</h1>
            <p className="text-sm text-gray-500">
              {activeProtocolsCount != null ? `${activeProtocolsCount} activos` : `${allProtocols.length} protocolos`}
              {searchTerm && ` · ${allProtocols.length} resultados`}
            </p>
          </div>
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar por ID, paciente o estado..."
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
            {isSearching && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-[#204983]" />
              </div>
            )}
          </div>
          <div className="lg:w-52 lg:shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 w-full justify-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                  {(isPrintedFilter !== "all" || paymentStatusFilter !== "all") && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-[#204983]" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Informe</p>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { value: "all", label: "Todos" },
                      { value: "true", label: "Enviado" },
                      { value: "false", label: "No env." },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setIsPrintedFilter(opt.value)}
                        className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                          isPrintedFilter === opt.value
                            ? "border-[#204983] bg-[#204983] text-white"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pago</p>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { value: "all", label: "Todos" },
                      { value: "1", label: "Saldo en cero" },
                      { value: "2", label: "Paciente debe" },
                      { value: "3", label: "Lab. debe" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPaymentStatusFilter(opt.value)}
                        className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                          paymentStatusFilter === opt.value
                            ? "border-[#204983] bg-[#204983] text-white"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(isPrintedFilter !== "all" || paymentStatusFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintedFilter("all")
                      setPaymentStatusFilter("all")
                    }}
                    className="w-full rounded-md py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Limpiar filtros
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Filtros de estado, centrados */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
            {stateStatsQuery.isLoading ? (
              <div className="flex gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-32 rounded-full" />
                ))}
              </div>
            ) : (
              statusItems.map((item) => {
              const style = getProtocolStatusStyleByName(item.name)
              const filterState = getStatusFilterState(item.id)
              const Icon = item.icon
              const stateClass =
                filterState === "include"
                  ? `${style.solid} text-white`
                  : filterState === "exclude"
                    ? "bg-red-100 text-red-700 border-red-300 line-through"
                    : `${style.badgeOutline} hover:bg-white`
              const titleByState =
                filterState === "include"
                  ? "Incluido. Click para excluir."
                  : filterState === "exclude"
                    ? "Excluido. Click para quitar filtro."
                    : "Sin filtro. Click para incluir."

              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleStatus(item.id)}
                  title={titleByState}
                  className={`h-8 shrink-0 rounded-full border px-3 text-xs ${stateClass}`}
                >
                  {filterState === "exclude" ? (
                    <X className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <Icon className="h-3.5 w-3.5 mr-1" />
                  )}
                  {style.shortLabel}
                  <span className="ml-1 rounded-full bg-white/70 px-1.5 text-[11px] text-gray-700">{item.count}</span>
                </Button>
              )
            })
            )}
            {hasAnyStatusFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter({ include: [], exclude: [] })}
                className="h-8 shrink-0 rounded-full text-gray-500"
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}
        </div>

        {/* Tabla */}
        <div className="mt-4 space-y-4">
        {allProtocols.length === 0 && !isInitialLoading && !isSearching ? (
          <div className="p-8 sm:p-12 text-center">
            <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No se encontraron protocolos</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              {searchTerm || hasAnyStatusFilter || isPrintedFilter !== "all" || paymentStatusFilter !== "all"
                ? "Intenta ajustar los filtros de búsqueda"
                : "Aún no hay protocolos registrados en el sistema"}
            </p>
            <Button onClick={handleNewProtocol} className="bg-[#204983] hover:bg-[#1a3d6b] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Protocolo
            </Button>
          </div>
        ) : (
          <ProtocolsTable
            protocols={allProtocols}
            selectedIds={selectedProtocols}
            onToggleSelect={toggleProtocolSelection}
            onRowClick={(id) => navigate(`/protocolos/${id}`)}
            sort={sort}
            onSortChange={setSort}
            isLoading={(isInitialLoading || isSearching) && allProtocols.length === 0}
            onQuickPayment={quickActions.openPayment}
            onReport={(p) => navigate(`/protocolos/${p.id}?report=1`)}
            onUncancel={quickActions.uncancel}
            canUncancel={canUncancel}
            busyId={quickActions.busyId}
          />
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
      </div>

      {/* Floating Batch Action Bar */}
      {isSelectionMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-3 py-3 shadow-lg sm:px-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            {/* Fila 1: selección + opciones (tipo, firma) */}
            <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {selectedProtocols.size} sel.
              </span>
              <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
                Todos
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs">
                Ninguno
              </Button>

              <Select value={batchReportType} onValueChange={handleBatchReportTypeChange}>
                <SelectTrigger className="h-9 w-[140px] sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Reporte completo</SelectItem>
                  <SelectItem value="summary">Resumen</SelectItem>
                </SelectContent>
              </Select>

              <button
                type="button"
                onClick={() => setBatchSigned(!batchSigned)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors sm:text-sm ${
                  batchSigned
                    ? "border-[#204983] bg-blue-50 text-[#204983]"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <PenLine className="h-4 w-4 shrink-0" />
                <span className="font-medium whitespace-nowrap">
                  <span className="hidden sm:inline">{batchSigned ? "Firma digital" : "Sin firma digital"}</span>
                  <span className="sm:hidden">{batchSigned ? "Firmado" : "Sin firma"}</span>
                </span>
              </button>

              {batchSigned && (
                <Select value={batchSignatureId} onValueChange={setBatchSignatureId}>
                  <SelectTrigger className="h-9 w-[170px] sm:w-[210px]">
                    <SelectValue placeholder="Firma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Firma predeterminada</SelectItem>
                    {reportSignatures.map((signature) => (
                      <SelectItem key={signature.id} value={signature.id.toString()}>
                        {signature.name}
                        {signature.is_default ? " (predeterminada)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Fila 2: acciones */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:ml-auto lg:flex lg:w-auto lg:items-center">
              <Button
                size="sm"
                variant="outline"
                disabled={selectedProtocols.size === 0 || isBatchProcessing}
                onClick={() => handleBatchAction("print")}
              >
                {isBatchProcessing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4 mr-1" />
                )}
                <span className="truncate">Imprimir</span>
              </Button>
              <Button
                size="sm"
                disabled={selectedProtocols.size === 0 || isBatchProcessing}
                onClick={() => handleBatchAction("download")}
                className="bg-[#204983]"
              >
                {isBatchProcessing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                <span className="truncate">Descargar</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedProtocols.size === 0 || isBatchProcessing}
                onClick={() => handleBatchAction("email")}
              >
                <Mail className="h-4 w-4 mr-1" />
                Email
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedProtocols.size === 0 || isBatchProcessing}
                onClick={() => handleBatchAction("whatsapp")}
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
                    className="border-[#204983] text-[#204983] hover:bg-[#204983] hover:text-white"
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

      {quickActions.dialogs}
    </div>
  )
}
