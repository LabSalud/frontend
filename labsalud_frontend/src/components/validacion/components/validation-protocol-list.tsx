"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Loader2, CheckCircle, AlertCircle, RefreshCcw, Search, Clock, Filter, User, AlertTriangle, Mail, X } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useApi } from "@/hooks/use-api"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { RESULTS_ENDPOINTS } from "@/config/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { ProtocolWithLoadedResults } from "@/types"
import { ValidationProtocolCard } from "./validation-protocol-card"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import { getProtocolStatusBadgeClass, getProtocolStatusButtonClass } from "@/lib/status-styles"

const extractErrorMessage = (error: unknown): string => getErrorMessage(error, "Error desconocido")
const VALIDATION_STATUS_FILTER_KEY = "labsalud_validation_protocol_status_filters"

export function ValidationProtocolList() {
  const { apiRequest } = useApi()
  const [protocols, setProtocols] = useState<ProtocolWithLoadedResults[]>([])
  const [loadingProtocols, setLoadingProtocols] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [expandedProtocolId, setExpandedProtocolId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  type StatusFilterState = { include: number[]; exclude: number[] }
  const [statusFilter, setStatusFilter] = useState<StatusFilterState>(() => {
    try {
      const saved = localStorage.getItem(VALIDATION_STATUS_FILTER_KEY)
      if (!saved) return { include: [], exclude: [] }
      const parsed = JSON.parse(saved)
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

  useEffect(() => {
    localStorage.setItem(VALIDATION_STATUS_FILTER_KEY, JSON.stringify(statusFilter))
  }, [statusFilter])

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({
      limit: "20",
      offset: "0",
    })

    if (statusFilter.include.length > 0) {
      params.append("status", statusFilter.include.join(","))
    }
    if (statusFilter.exclude.length > 0) {
      params.append("exclude_status", statusFilter.exclude.join(","))
    }

    if (searchTerm.trim()) {
      params.append("search", searchTerm.trim())
    }

    return `${RESULTS_ENDPOINTS.PROTOCOLS_WITH_LOADED_RESULTS}?${params.toString()}`
  }, [statusFilter, searchTerm])

  const fetchProtocols = useCallback(async (url: string, reset = true, silent = false) => {
    try {
      setError(null)
      if (!reset) {
        setLoadingMore(true)
      } else if (silent) {
        setRefreshing(true)
      } else {
        setLoadingProtocols(true)
      }

      const response = await apiRequest(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(formatApiError(errorData, `Error ${response.status}`))
      }

      const data = await response.json()
      const protocolsData: ProtocolWithLoadedResults[] = data.results || data
      setProtocols((prev) => (reset ? protocolsData : [...prev, ...protocolsData]))
      setNextUrl(data.next || null)
      if (reset) {
        setExpandedProtocolId(protocolsData[0]?.id ?? null)
      }
    } catch (error) {
      const message = extractErrorMessage(error)
      setError(message)
    } finally {
      setLoadingProtocols(false)
      setLoadingMore(false)
      setRefreshing(false)
    }
  }, [apiRequest])

  // Mount: skeleton entera. Cambios de filtro/búsqueda: silent (mantiene lista visible).
  const hasLoadedOnceRef = useRef(false)
  useEffect(() => {
    setNextUrl(null)
    const silent = hasLoadedOnceRef.current
    if (!silent) hasLoadedOnceRef.current = true
    void fetchProtocols(buildUrl(), true, silent)
  }, [fetchProtocols, buildUrl])

  const loadMoreSentinelRef = useInfiniteScroll({
    loading: loadingMore,
    hasMore: !!nextUrl,
    onLoadMore: () => {
      if (!nextUrl || loadingMore) return
      void fetchProtocols(nextUrl, false)
    },
    dependencies: [nextUrl],
  })

  const handleRefresh = () => {
    setProtocols([])
    setNextUrl(null)
    setRefreshing(true)
    void fetchProtocols(buildUrl(), true)
  }

  const handleProtocolValidated = useCallback((protocolId: number) => {
    setExpandedProtocolId(protocolId)
    setRefreshing(true)
    void fetchProtocols(buildUrl(), true)
  }, [buildUrl, fetchProtocols])

  const toggleProtocol = (protocolId: number) => {
    setExpandedProtocolId((current) => (current === protocolId ? null : protocolId))
  }

  const toggleStatus = (statusId: number) => {
    setStatusFilter((prev) => {
      const inInclude = prev.include.includes(statusId)
      const inExclude = prev.exclude.includes(statusId)
      if (!inInclude && !inExclude) return { ...prev, include: [...prev.include, statusId] }
      if (inInclude) return { include: prev.include.filter((id) => id !== statusId), exclude: [...prev.exclude, statusId] }
      return { ...prev, exclude: prev.exclude.filter((id) => id !== statusId) }
    })
  }
  const getFilterState = (id: number): "neutral" | "include" | "exclude" =>
    statusFilter.include.includes(id) ? "include" : statusFilter.exclude.includes(id) ? "exclude" : "neutral"
  const hasAnyStatusFilter = statusFilter.include.length > 0 || statusFilter.exclude.length > 0

  const STATUS_CHIPS: Array<{ id: number; icon: typeof Clock; long: string; short: string }> = [
    { id: 1, icon: Clock, long: "Pend. Carga", short: "Carga" },
    { id: 2, icon: Filter, long: "Pend. Valid.", short: "Valid." },
    { id: 11, icon: AlertTriangle, long: "Pend. Revisión", short: "Revisión" },
    { id: 3, icon: Clock, long: "Pago Incomp.", short: "Pago" },
    { id: 6, icon: User, long: "Pend. Retiro", short: "Retiro" },
    { id: 10, icon: Mail, long: "Pend. Envío", short: "Envío" },
    { id: 5, icon: CheckCircle, long: "Completado", short: "Compl." },
    { id: 7, icon: AlertTriangle, long: "Envío Fallido", short: "Fallido" },
    { id: 12, icon: AlertCircle, long: "Info Faltante", short: "Info" },
    { id: 4, icon: X, long: "Cancelado", short: "Cancel." },
  ]

  const filtersPanel = (
    <div className="flex flex-col gap-3 sm:gap-4 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar por paciente, protocolo o estado..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-white pl-10"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs sm:text-sm font-medium text-gray-700">
          Filtrar por estado <span className="text-gray-500">(click: incluir → excluir → quitar)</span>:
        </p>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {STATUS_CHIPS.map(({ id, icon: Icon, long, short }) => {
            const fs = getFilterState(id)
            const cls =
              fs === "include"
                ? `${getProtocolStatusButtonClass(id, true)}`
                : fs === "exclude"
                  ? "bg-red-100 text-red-700 border border-red-300 line-through"
                  : "bg-white"
            const title =
              fs === "include"
                ? "Incluido. Click para excluir."
                : fs === "exclude"
                  ? "Excluido. Click para quitar filtro."
                  : "Sin filtro. Click para incluir."
            return (
              <Button
                key={id}
                variant={fs === "include" ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStatus(id)}
                title={title}
                className={`text-xs ${cls}`}
              >
                {fs === "exclude" ? <X className="h-3 w-3 mr-1" /> : <Icon className="h-3 w-3 mr-1" />}
                <span className="hidden sm:inline">{long}</span>
                <span className="sm:hidden">{short}</span>
              </Button>
            )
          })}
          {hasAnyStatusFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter({ include: [], exclude: [] })}
              className="text-gray-500 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  if (loadingProtocols) {
    return (
      <div className="space-y-3">
        {filtersPanel}
        {[...Array(3)].map((_, index) => (
          <div key={index} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48 rounded" />
                <Skeleton className="h-4 w-72 rounded" />
                <Skeleton className="h-4 w-40 rounded" />
              </div>
              <Skeleton className="h-9 w-32 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        {filtersPanel}
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">No se pudieron cargar los protocolos</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <Button className="mt-3 bg-[#204983]" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                Reintentar
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (protocols.length === 0) {
    return (
      <div className="space-y-3">
        {filtersPanel}
        <div className="text-center py-12 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No hay protocolos para mostrar</h3>
          <p className="text-sm text-gray-500">Ajustá los filtros o la búsqueda para ver otros protocolos.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {filtersPanel}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
          Actualizar
        </Button>
      </div>

      {protocols.map((protocol) => {
        const isExpanded = expandedProtocolId === protocol.id

        return (
          <div key={protocol.id} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleProtocol(protocol.id)}
              className="w-full flex items-start justify-between gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">Protocolo #{protocol.id}</span>
                  <Badge variant="outline" className={`text-xs ${getProtocolStatusBadgeClass(protocol.status.id, true)}`}>
                    {protocol.status.name}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {protocol.patient.first_name} {protocol.patient.last_name}
                  {typeof protocol.patient.age === "number" && ` · ${protocol.patient.age} años`}
                  {" · DNI "}{protocol.patient.dni}
                </p>
              </div>
              <span className="text-sm font-medium text-[#204983] whitespace-nowrap">
                {isExpanded ? "Ocultar" : "Ver validación"}
              </span>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-200 bg-gray-50/60 p-3 sm:p-4">
                <ValidationProtocolCard
                  protocol={protocol}
                  onProtocolValidated={handleProtocolValidated}
                  isExpanded={isExpanded}
                />
              </div>
            )}
          </div>
        )
      })}

      {nextUrl && (
        <div ref={loadMoreSentinelRef} className="flex justify-center py-4">
          {loadingMore ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <span className="text-xs text-gray-400">Scroll para cargar más...</span>
          )}
        </div>
      )}
    </div>
  )
}
