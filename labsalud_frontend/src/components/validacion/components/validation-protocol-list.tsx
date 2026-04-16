"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, CheckCircle, AlertCircle, RefreshCcw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useApi } from "@/hooks/use-api"
import { RESULTS_ENDPOINTS } from "@/config/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ProtocolWithLoadedResults } from "@/types"
import { ValidationProtocolCard } from "./validation-protocol-card"

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message)
      if (parsed.detail) return parsed.detail
      if (parsed.error) return parsed.error
      if (parsed.message) return parsed.message
      const firstKey = Object.keys(parsed)[0]
      if (firstKey && Array.isArray(parsed[firstKey])) {
        return `${firstKey}: ${parsed[firstKey][0]}`
      }
    } catch {
      return error.message
    }
  }
  return "Error desconocido"
}

const getStatusColor = (statusId: number): string => {
  switch (statusId) {
    case 1:
      return "bg-yellow-100 text-yellow-800 border-yellow-300"
    case 2:
      return "bg-blue-100 text-blue-800 border-blue-300"
    case 3:
      return "bg-orange-100 text-orange-800 border-orange-300"
    case 4:
      return "bg-red-100 text-red-800 border-red-300"
    case 5:
      return "bg-green-100 text-green-800 border-green-300"
    case 6:
      return "bg-purple-100 text-purple-800 border-purple-300"
    case 7:
      return "bg-rose-100 text-rose-800 border-rose-300"
    case 8:
      return "bg-teal-100 text-teal-800 border-teal-300"
    default:
      return "bg-gray-100 text-gray-800 border-gray-300"
  }
}

export function ValidationProtocolList() {
  const { apiRequest } = useApi()
  const [protocols, setProtocols] = useState<ProtocolWithLoadedResults[]>([])
  const [loadingProtocols, setLoadingProtocols] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedProtocolId, setExpandedProtocolId] = useState<number | null>(null)

  const fetchProtocols = useCallback(async () => {
    try {
      setError(null)
      const response = await apiRequest(RESULTS_ENDPOINTS.PROTOCOLS_WITH_LOADED_RESULTS)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || `Error ${response.status}`)
      }

      const data = await response.json()
      const protocolsData: ProtocolWithLoadedResults[] = data.results || data
      setProtocols(protocolsData)
      setExpandedProtocolId((current) => current ?? protocolsData[0]?.id ?? null)
    } catch (error) {
      const message = extractErrorMessage(error)
      setError(message)
    } finally {
      setLoadingProtocols(false)
      setRefreshing(false)
    }
  }, [apiRequest])

  useEffect(() => {
    void fetchProtocols()
  }, [fetchProtocols])

  const handleRefresh = () => {
    setLoadingProtocols(true)
    setRefreshing(true)
    void fetchProtocols()
  }

  const handleProtocolValidated = useCallback((protocolId: number) => {
    setProtocols((prev) => prev.filter((protocol) => protocol.id !== protocolId))
    setExpandedProtocolId((current) => (current === protocolId ? null : current))
  }, [])

  const toggleProtocol = (protocolId: number) => {
    setExpandedProtocolId((current) => (current === protocolId ? null : protocolId))
  }

  if (loadingProtocols) {
    return (
      <div className="space-y-3">
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
    )
  }

  if (protocols.length === 0) {
    return (
      <div className="text-center py-12 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-700 mb-1">No hay protocolos pendientes de validación</h3>
        <p className="text-sm text-gray-500">Cuando existan resultados cargados para validar, aparecerán aquí.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
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
                  {protocol.patient.first_name} {protocol.patient.last_name} · DNI {protocol.patient.dni}
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
    </div>
  )
}
