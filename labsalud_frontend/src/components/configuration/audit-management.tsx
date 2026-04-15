"use client"

import { useState, useEffect, useCallback } from "react"
import { useApi } from "@/hooks/use-api"
import { AUDIT_ENDPOINTS } from "@/config/api"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebounce } from "@/hooks/use-debounce"
import type { AuditEntry } from "@/types"
import { AuditCard } from "./components/audit-card"

export function AuditManagement() {
  const { apiRequest } = useApi()
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const fetchAuditEntries = useCallback(
    async (url?: string, reset = false) => {
      if (reset) {
        setLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      try {
        let endpoint = url || AUDIT_ENDPOINTS.AUDIT

        if (reset && debouncedSearchTerm.trim()) {
          const searchParams = new URLSearchParams()
          searchParams.append("search", debouncedSearchTerm.trim())
          endpoint = `${AUDIT_ENDPOINTS.AUDIT}?${searchParams.toString()}`
        }

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
    [apiRequest, debouncedSearchTerm],
  )

  useEffect(() => {
    fetchAuditEntries(undefined, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm])

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

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Search skeleton */}
        <Skeleton className="h-10 w-full rounded" />

        {/* Audit cards skeleton */}
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
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar en auditoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {auditEntries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No se encontraron registros de auditoría</div>
      ) : (
        <div className="space-y-2">
          {auditEntries.map((entry, index) => (
            <AuditCard key={`${entry.version}-${index}`} entry={entry} />
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
