"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, CheckCircle, AlertCircle, RefreshCcw, Search, Clock, Filter, User, AlertTriangle, Mail, X } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useApi } from "@/hooks/use-api"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { PROTOCOL_ENDPOINTS } from "@/config/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { ProtocolWithLoadedResults } from "@/types"
import { ValidationProtocolCard } from "./validation-protocol-card"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

const extractErrorMessage = (error: unknown): string => getErrorMessage(error, "Error desconocido")
const VALIDATION_STATUS_FILTER_KEY = "labsalud_validation_protocol_status_filters"

const getStatusColor = (statusId: number): string => {
  switch (statusId) {
    case 1:
      return "bg-yellow-100 text-yellow-800 border-yellow-300"
    case 2:
      return "bg-sky-100 text-sky-800 border-sky-300"
    case 3:
      return "bg-orange-100 text-orange-800 border-orange-300"
    case 4:
      return "bg-red-100 text-red-800 border-red-300"
    case 5:
      return "bg-green-100 text-green-800 border-green-300"
    case 6:
      return "bg-purple-100 text-purple-800 border-purple-300"
    case 7:
      return "bg-pink-100 text-pink-800 border-pink-300"
    case 8:
      return "bg-teal-100 text-teal-800 border-teal-300"
    case 10:
      return "bg-indigo-100 text-indigo-800 border-indigo-300"
    case 11:
      return "bg-[#f8e8ee] text-[#800020] border-[#800020]"
    case 12:
      return "bg-amber-100 text-amber-800 border-amber-300"
    default:
      return "bg-gray-100 text-gray-800 border-gray-300"
  }
}

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
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(VALIDATION_STATUS_FILTER_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(VALIDATION_STATUS_FILTER_KEY, JSON.stringify(selectedStatuses))
  }, [selectedStatuses])

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({
      limit: "20",
      offset: "0",
    })

    if (selectedStatuses.length > 0) {
      params.append("status__in", selectedStatuses.join(","))
    }

    if (searchTerm.trim()) {
      params.append("search", searchTerm.trim())
    }

    return `${PROTOCOL_ENDPOINTS.PROTOCOLS}?${params.toString()}`
  }, [selectedStatuses, searchTerm])

  const fetchProtocols = useCallback(async (url: string, reset = true) => {
    try {
      setError(null)
      if (reset) {
        setLoadingProtocols(true)
      } else {
        setLoadingMore(true)
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

  useEffect(() => {
    setProtocols([])
    setNextUrl(null)
    void fetchProtocols(buildUrl(), true)
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
    setSelectedStatuses((prev) =>
      prev.includes(statusId) ? prev.filter((id) => id !== statusId) : [...prev, statusId],
    )
  }

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
        <p className="text-xs sm:text-sm font-medium text-gray-700">Filtrar por estado:</p>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Button
            variant={selectedStatuses.includes(1) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleStatus(1)}
            className={`text-xs ${selectedStatuses.includes(1) ? "bg-yellow-500 hover:bg-yellow-600" : ""}`}
          >
            <Clock className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Pend.</span> Carga
          </Button>
          <Button
            variant={selectedStatuses.includes(2) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleStatus(2)}
            className={`text-xs ${selectedStatuses.includes(2) ? "bg-sky-500 hover:bg-sky-600" : ""}`}
          >
            <Filter className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Pend.</span> Valid.
          </Button>
          <Button
            variant={selectedStatuses.includes(11) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleStatus(11)}
            className={`text-xs ${selectedStatuses.includes(11) ? "bg-[#800020] hover:bg-[#670019]" : ""}`}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Pend.</span> Revisión
          </Button>
          <Button
            variant={selectedStatuses.includes(3) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleStatus(3)}
            className={`text-xs ${selectedStatuses.includes(3) ? "bg-orange-500 hover:bg-orange-600" : ""}`}
          >
            <Clock className="h-3 w-3 mr-1" />
            Pago <span className="hidden sm:inline">Incomp.</span>
          </Button>
          <Button
            variant={selectedStatuses.includes(6) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleStatus(6)}
            className={`text-xs ${selectedStatuses.includes(6) ? "bg-purple-500 hover:bg-purple-600" : ""}`}
          >
            <User className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Pend.</span> Retiro
          </Button>
          <Button
            variant={selectedStatuses.includes(10) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleStatus(10)}
            className={`text-xs ${selectedStatuses.includes(10) ? "bg-indigo-500 hover:bg-indigo-600" : ""}`}
          >
            <Mail className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Pend.</span> Envío
          </Button>
          <Button
            variant={selectedStatuses.includes(5) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleStatus(5)}
            className={`text-xs ${selectedStatuses.includes(5) ? "bg-green-500 hover:bg-green-600" : ""}`}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Completado</span>
            <span className="sm:hidden">Compl.</span>
          </Button>
          <Button
            variant={selectedStatuses.includes(7) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleStatus(7)}
            className={`text-xs ${selectedStatuses.includes(7) ? "bg-pink-500 hover:bg-pink-600" : ""}`}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Envío Fallido</span>
            <span className="sm:hidden">Fallido</span>
          </Button>
          <Button
            variant={selectedStatuses.includes(4) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleStatus(4)}
            className={`text-xs ${selectedStatuses.includes(4) ? "bg-red-500 hover:bg-red-600" : ""}`}
          >
            <X className="h-3 w-3 mr-1" />
            Cancelado
          </Button>
          {selectedStatuses.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedStatuses([])} className="text-gray-500 text-xs">
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
                  <Badge variant="outline" className={`text-xs ${getStatusColor(protocol.status.id)}`}>
                    {protocol.status.name}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {protocol.patient.first_name} {protocol.patient.last_name} · CUIL {protocol.patient.cuil}
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
