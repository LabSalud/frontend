"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { Loader2, AlertCircle, Search, FileText, User } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { RESULTS_ENDPOINTS } from "@/config/api"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ValidationProtocolCard } from "./validation-protocol-card"
import type { ProtocolWithLoadedResults } from "@/types"
import { toast } from "sonner"

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

const extractResponseError = async (response: Response): Promise<string> => {
  try {
    const data = await response.json()
    if (data.detail) return data.detail
    if (data.error) return data.error
    if (data.message) return data.message
    const firstKey = Object.keys(data)[0]
    if (firstKey && Array.isArray(data[firstKey])) {
      return `${firstKey}: ${data[firstKey][0]}`
    }
    return JSON.stringify(data)
  } catch {
    return `Error ${response.status}: ${response.statusText}`
  }
}

interface PaginatedResponse<T> {
  count?: number
  next: string | null
  previous?: string | null
  results: T[]
}

const getStatusLabel = (statusId: number): string => {
  const statusMap: Record<number, string> = {
    1: "Carga Pendiente",
    2: "Validación Pendiente",
    3: "Pago Incompleto",
    4: "Cancelado",
    5: "Completado",
    6: "Pendiente de Retiro",
    7: "Envío Fallido",
  }
  return statusMap[statusId] || "Desconocido"
}

const getStatusBadgeClasses = (statusId: number): string => {
  switch (statusId) {
    case 1:
      return "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200"
    case 2:
      return "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
    case 3:
      return "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200"
    case 4:
      return "bg-red-100 text-red-700 border-red-300 hover:bg-red-200"
    case 5:
      return "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
    case 6:
      return "bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200"
    case 7:
      return "bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200"
    default:
      return "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
  }
}

export function ValidationProtocolList() {
  const { apiRequest } = useApi()
  const [protocols, setProtocols] = useState<ProtocolWithLoadedResults[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [expandedProtocols, setExpandedProtocols] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const sentinelRef = useRef<HTMLDivElement>(null)

  const buildUrl = useCallback((search = "", offset = 0) => {
    const params = new URLSearchParams({
      limit: "20",
      offset: offset.toString(),
    })

    if (search.trim()) {
      params.append("search", search.trim())
    }

    return `${RESULTS_ENDPOINTS.PROTOCOLS_WITH_LOADED_RESULTS}?${params.toString()}`
  }, [])

  const fetchProtocols = useCallback(
    async (reset = true) => {
      if (reset) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }
      setError(null)

      try {
        const url = reset ? buildUrl(searchTerm, 0) : nextUrl
        if (!url) return

        const response = await apiRequest(url)

        if (!response.ok) {
          const errorMsg = await extractResponseError(response)
          throw new Error(errorMsg)
        }

        const data: PaginatedResponse<ProtocolWithLoadedResults> = await response.json()

        if (reset) {
          setProtocols(data.results)
        } else {
          setProtocols((prev) => [...prev, ...data.results])
        }

        setNextUrl(data.next)
        setHasMore(!!data.next)
      } catch (err) {
        console.error("Error loading protocols:", err)
        const errorMsg = extractErrorMessage(err)
        setError(errorMsg)
        toast.error(errorMsg)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [apiRequest, buildUrl, searchTerm, nextUrl],
  )

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          fetchProtocols(false)
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, isLoading, fetchProtocols])

  const filteredProtocols = useMemo(() => {
    if (!searchTerm) return protocols
    return protocols.filter((protocol) => {
      const matchesSearch =
        protocol.patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        protocol.patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        protocol.patient.dni?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(protocol.id).includes(searchTerm)
      return matchesSearch
    })
  }, [protocols, searchTerm])

  useEffect(() => {
    fetchProtocols()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setProtocols([])
      setNextUrl(null)
      setHasMore(true)
      fetchProtocols()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleProtocolValidated = (protocolId: number) => {
    setProtocols((prev) => prev.filter((p) => p.id !== protocolId))
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Search skeleton */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <Skeleton className="h-10 w-full rounded" />
        </div>

        {/* Protocol cards skeleton */}
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm p-3 sm:p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-5 w-48 rounded" />
                <Skeleton className="h-5 w-32 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p className="text-sm sm:text-base">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar paciente, DNI o protocolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white text-sm sm:text-base"
          />
        </div>
      </div>

      {filteredProtocols.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 mb-3 text-gray-400" />
          <p className="text-base sm:text-lg font-medium">No se encontraron protocolos</p>
          <p className="text-xs sm:text-sm">Intenta ajustar los filtros de búsqueda</p>
        </div>
      ) : (
        <>
          <Accordion
            type="multiple"
            value={expandedProtocols}
            onValueChange={setExpandedProtocols}
            className="w-full space-y-2"
          >
            {filteredProtocols.map((protocol) => (
              <AccordionItem
                key={protocol.id}
                value={`protocol-${protocol.id}`}
                className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <AccordionTrigger className="px-3 sm:px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-colors hover:no-underline">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full text-left">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-[#204983] flex-shrink-0" />
                      <span className="font-semibold text-[#204983] text-sm sm:text-base">#{protocol.id}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
                      <span className="font-medium text-gray-900 text-sm sm:text-base">
                        {protocol.patient.first_name} {protocol.patient.last_name}
                      </span>
                      {protocol.patient.dni && (
                        <span className="text-xs sm:text-sm text-gray-500">(DNI: {protocol.patient.dni})</span>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`font-medium text-xs ${getStatusBadgeClasses(protocol.status.id)}`}
                    >
                      {protocol.status.name || getStatusLabel(protocol.status.id)}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 sm:px-4 py-4 bg-gray-50">
                  <ValidationProtocolCard
                    protocol={protocol}
                    onProtocolValidated={handleProtocolValidated}
                    isExpanded={expandedProtocols.includes(`protocol-${protocol.id}`)}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div ref={sentinelRef} className="flex justify-center py-4">
            {isLoadingMore && (
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-[#204983] animate-spin mr-2" />
                <span className="text-gray-600 text-sm sm:text-base">Cargando más protocolos...</span>
              </div>
            )}
          </div>

          {!hasMore && filteredProtocols.length > 0 && (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm sm:text-base">No hay más protocolos para mostrar</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
