"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Package, Plus, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useApi } from "@/hooks/use-api"
import { useDebounce } from "@/hooks/use-debounce"
import { CATALOG_ENDPOINTS } from "@/config/api"
import { formatApiError } from "@/lib/api-error"
import type { Analysis, AnalysisComponent, AnalysisRelationType } from "@/types"

const RELATION_LABELS: Record<AnalysisRelationType, string> = {
  includes: "Incluye",
  not_includes: "No incluye",
  included_in: "Incluida en",
}

const relationBadgeClass = (relation: AnalysisRelationType): string =>
  relation === "includes"
    ? "bg-emerald-50 text-emerald-700"
    : relation === "not_includes"
      ? "bg-rose-50 text-rose-700"
      : "bg-blue-50 text-blue-700"

interface AnalysisCompositionManagerProps {
  /** Análisis "padre" del que se administra la composición. */
  analysis: Analysis
}

interface PaginatedResponse<T> {
  results: T[]
}

/**
 * Administra la composición de un análisis (módulo): qué prácticas incluye,
 * excluye o en cuáles está incluido. `includes` = el componente no se cobra
 * por separado cuando se pide el módulo (la cotización lo pone en $0).
 */
export function AnalysisCompositionManager({ analysis }: AnalysisCompositionManagerProps) {
  const { apiRequest } = useApi()
  const [components, setComponents] = useState<AnalysisComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [relationType, setRelationType] = useState<AnalysisRelationType>("includes")

  const [search, setSearch] = useState("")
  const [results, setResults] = useState<Analysis[]>([])
  const [searching, setSearching] = useState(false)
  const [addingChildId, setAddingChildId] = useState<number | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const debouncedSearch = useDebounce(search, 300)
  const boxRef = useRef<HTMLDivElement>(null)
  const [showResults, setShowResults] = useState(false)

  const fetchComponents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiRequest(`${CATALOG_ENDPOINTS.ANALYSIS_COMPOSITION}?parent=${analysis.id}&is_active=true`)
      if (res.ok) {
        const data = await res.json()
        const list: AnalysisComponent[] = Array.isArray(data) ? data : (data as PaginatedResponse<AnalysisComponent>).results ?? []
        setComponents(list)
      }
    } catch (err) {
      console.error("Error fetching composition:", err)
    } finally {
      setLoading(false)
    }
  }, [apiRequest, analysis.id])

  useEffect(() => {
    void fetchComponents()
  }, [fetchComponents])

  useEffect(() => {
    const term = debouncedSearch.trim()
    if (!term) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    apiRequest(`${CATALOG_ENDPOINTS.ANALYSIS}?search=${encodeURIComponent(term)}&is_active=true&limit=8`)
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        const list: Analysis[] = Array.isArray(data) ? data : data.results ?? []
        // No ofrecer el propio análisis ni los ya agregados.
        const existingChildIds = new Set(components.map((c) => c.child))
        setResults(list.filter((a) => a.id !== analysis.id && !existingChildIds.has(a.id)))
        setShowResults(true)
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedSearch, apiRequest, analysis.id, components])

  // Cerrar el dropdown al click afuera.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const addChild = async (child: Analysis) => {
    setAddingChildId(child.id)
    try {
      const res = await apiRequest(CATALOG_ENDPOINTS.ANALYSIS_COMPOSITION, {
        method: "POST",
        body: { parent: analysis.id, child: child.id, relation_type: relationType },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(formatApiError(err, "No se pudo agregar el componente."))
      }
      setSearch("")
      setResults([])
      setShowResults(false)
      await fetchComponents()
      toast.success(`"${child.name}" agregado a la composición`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al agregar el componente")
    } finally {
      setAddingChildId(null)
    }
  }

  const removeComponent = async (component: AnalysisComponent) => {
    setRemovingId(component.id)
    try {
      const res = await apiRequest(CATALOG_ENDPOINTS.ANALYSIS_COMPOSITION_DETAIL(component.id), { method: "DELETE" })
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}))
        throw new Error(formatApiError(err, "No se pudo quitar el componente."))
      }
      setComponents((prev) => prev.filter((c) => c.id !== component.id))
      toast.success(`"${component.child_name}" quitado de la composición`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al quitar el componente")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-[#204983]" />
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Composición (módulo)</p>
      </div>
      <p className="text-xs text-gray-400">
        Las prácticas marcadas como <span className="font-medium text-emerald-700">Incluye</span> no se cobran por
        separado cuando se pide este análisis (la cotización las pone en $0).
      </p>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando composición…</p>
      ) : components.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-200 py-3 text-center text-sm text-gray-400">
          Este análisis no compone otras prácticas.
        </p>
      ) : (
        <div className="space-y-1.5">
          {components.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-gray-100 px-3 py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">
                  {c.child_code}
                </Badge>
                <span className="truncate text-sm text-gray-700">{c.child_name}</span>
                <Badge className={`text-[10px] ${relationBadgeClass(c.relation_type)}`}>
                  {c.relation_type_display || RELATION_LABELS[c.relation_type]}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 shrink-0 p-0 text-gray-400 hover:text-red-600"
                disabled={removingId === c.id}
                onClick={() => removeComponent(c)}
                aria-label={`Quitar ${c.child_name}`}
              >
                {removingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row" ref={boxRef}>
        <Select value={relationType} onValueChange={(v) => setRelationType(v as AnalysisRelationType)}>
          <SelectTrigger className="h-9 sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="includes">Incluye</SelectItem>
            <SelectItem value="not_includes">No incluye</SelectItem>
            <SelectItem value="included_in">Incluida en</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="h-9 pl-8"
            placeholder="Buscar práctica por código o nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
          />
          {showResults && (searching || results.length > 0) && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
              {searching && <p className="px-3 py-2 text-sm text-gray-400">Buscando…</p>}
              {!searching &&
                results.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    disabled={addingChildId != null}
                    onClick={() => addChild(a)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {addingChildId === a.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#204983]" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-[#204983]" />
                    )}
                    <span className="font-mono text-[10px] text-gray-500">{a.code}</span>
                    <span className="truncate">{a.name}</span>
                  </button>
                ))}
              {!searching && results.length === 0 && debouncedSearch.trim() && (
                <p className="px-3 py-2 text-sm text-gray-400">Sin resultados.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
