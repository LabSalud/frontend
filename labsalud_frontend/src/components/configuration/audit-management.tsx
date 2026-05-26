"use client"

import { useState, useEffect, useCallback } from "react"
import { useApi } from "@/hooks/use-api"
import { AUDIT_ENDPOINTS } from "@/config/api"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { Loader2, Search, Filter, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebounce } from "@/hooks/use-debounce"
import type { AuditEntry, AuditCategory, AuditActionType } from "@/types"
import { AuditCard } from "./components/audit-card"
import { CATEGORY_META } from "@/components/common/history-list"

const CATEGORY_OPTIONS: Array<{ value: AuditCategory; label: string }> = [
  { value: "protocol", label: CATEGORY_META.protocol.label },
  { value: "result", label: CATEGORY_META.result.label },
  { value: "validation", label: CATEGORY_META.validation.label },
  { value: "payment", label: CATEGORY_META.payment.label },
  { value: "state", label: CATEGORY_META.state.label },
  { value: "doctor", label: CATEGORY_META.doctor.label },
  { value: "insurance", label: CATEGORY_META.insurance.label },
  { value: "analysis", label: CATEGORY_META.analysis.label },
  { value: "user", label: CATEGORY_META.user.label },
  { value: "patient", label: CATEGORY_META.patient.label },
  { value: "system", label: CATEGORY_META.system.label },
]

const ACTION_TYPE_OPTIONS: Array<{ value: AuditActionType; label: string }> = [
  { value: "create", label: "Creación" },
  { value: "update", label: "Actualización" },
  { value: "delete", label: "Eliminación" },
  { value: "business", label: "Negocio" },
  { value: "auth", label: "Autenticación" },
  { value: "system", label: "Sistema" },
]

export function AuditManagement() {
  const { apiRequest } = useApi()
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const [category, setCategory] = useState<AuditCategory | "all">("all")
  const [actionType, setActionType] = useState<AuditActionType | "all">("all")
  const [actionName, setActionName] = useState("")
  const debouncedActionName = useDebounce(actionName, 500)
  const [relatedProtocolId, setRelatedProtocolId] = useState("")
  const debouncedRelatedProtocolId = useDebounce(relatedProtocolId, 500)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const debouncedDateFrom = useDebounce(dateFrom, 500)
  const debouncedDateTo = useDebounce(dateTo, 500)

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (debouncedSearchTerm.trim()) params.set("search", debouncedSearchTerm.trim())
    if (category !== "all") params.set("category", category)
    if (actionType !== "all") params.set("action_type", actionType)
    if (debouncedActionName.trim()) params.set("action_name", debouncedActionName.trim())
    if (debouncedRelatedProtocolId.trim()) params.set("related_protocol_id", debouncedRelatedProtocolId.trim())
    if (debouncedDateFrom) params.set("created_at__gte", debouncedDateFrom)
    if (debouncedDateTo) params.set("created_at__lte", debouncedDateTo)
    const qs = params.toString()
    return qs ? `${AUDIT_ENDPOINTS.AUDIT}?${qs}` : AUDIT_ENDPOINTS.AUDIT
  }, [
    debouncedSearchTerm,
    category,
    actionType,
    debouncedActionName,
    debouncedRelatedProtocolId,
    debouncedDateFrom,
    debouncedDateTo,
  ])

  const fetchAuditEntries = useCallback(
    async (url?: string, reset = false) => {
      if (reset) {
        setLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      try {
        const endpoint = url || buildUrl()
        const response = await apiRequest(endpoint)

        if (response.ok) {
          const data = await response.json()
          if (reset) {
            setAuditEntries(data.results || [])
          } else {
            setAuditEntries((prev) => [...prev, ...(data.results || [])])
          }
          setNextUrl(data.next || null)
        }
      } catch (error) {
        console.error("Error al cargar auditoría:", error)
      } finally {
        setLoading(false)
        setIsLoadingMore(false)
      }
    },
    [apiRequest, buildUrl],
  )

  useEffect(() => {
    fetchAuditEntries(undefined, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearchTerm,
    category,
    actionType,
    debouncedActionName,
    debouncedRelatedProtocolId,
    debouncedDateFrom,
    debouncedDateTo,
  ])

  const loadMore = useCallback(() => {
    if (nextUrl && !isLoadingMore) {
      fetchAuditEntries(nextUrl, false)
    }
  }, [nextUrl, isLoadingMore, fetchAuditEntries])

  const hasMore = !!nextUrl
  const loadMoreSentinelRef = useInfiniteScroll({
    loading: isLoadingMore,
    hasMore,
    onLoadMore: loadMore,
  })

  const activeFilters = [
    debouncedSearchTerm && { label: `Búsqueda: ${debouncedSearchTerm}`, clear: () => setSearchTerm("") },
    category !== "all" && { label: `Categoría: ${CATEGORY_META[category].label}`, clear: () => setCategory("all") },
    actionType !== "all" && {
      label: `Tipo: ${ACTION_TYPE_OPTIONS.find((o) => o.value === actionType)?.label}`,
      clear: () => setActionType("all"),
    },
    debouncedActionName && { label: `Acción: ${debouncedActionName}`, clear: () => setActionName("") },
    debouncedRelatedProtocolId && {
      label: `Protocolo #${debouncedRelatedProtocolId}`,
      clear: () => setRelatedProtocolId(""),
    },
    debouncedDateFrom && { label: `Desde: ${debouncedDateFrom}`, clear: () => setDateFrom("") },
    debouncedDateTo && { label: `Hasta: ${debouncedDateTo}`, clear: () => setDateTo("") },
  ].filter(Boolean) as Array<{ label: string; clear: () => void }>

  const clearAllFilters = () => {
    setSearchTerm("")
    setCategory("all")
    setActionType("all")
    setActionName("")
    setRelatedProtocolId("")
    setDateFrom("")
    setDateTo("")
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Filter className="h-4 w-4 text-[#204983]" />
            Filtros de auditoría
          </div>
          {activeFilters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs">
              Limpiar todos
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar (objeto, usuario, mensaje)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={category} onValueChange={(v) => setCategory(v as AuditCategory | "all")}>
            <SelectTrigger>
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actionType} onValueChange={(v) => setActionType(v as AuditActionType | "all")}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de acción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {ACTION_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="action_name (ej: laboratory.protocol.cancel)"
            value={actionName}
            onChange={(e) => setActionName(e.target.value)}
          />

          <Input
            type="number"
            placeholder="ID de protocolo relacionado"
            value={relatedProtocolId}
            onChange={(e) => setRelatedProtocolId(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              placeholder="Desde"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="Desde"
            />
            <Input
              type="date"
              placeholder="Hasta"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="Hasta"
            />
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeFilters.map((filter, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-xs gap-1 pl-2 pr-1 py-1"
              >
                {filter.label}
                <button
                  type="button"
                  onClick={filter.clear}
                  className="hover:bg-slate-300 rounded p-0.5"
                  aria-label={`Quitar filtro ${filter.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full max-w-md rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : auditEntries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No se encontraron registros de auditoría con los filtros aplicados
        </div>
      ) : (
        <div className="space-y-2">
          {auditEntries.map((entry, index) => (
            <AuditCard key={entry.event_id || `${entry.version}-${index}`} entry={entry} />
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={loadMoreSentinelRef} className="flex justify-center py-4">
          {isLoadingMore && <Loader2 className="h-6 w-6 animate-spin text-gray-400" />}
        </div>
      )}
    </div>
  )
}
