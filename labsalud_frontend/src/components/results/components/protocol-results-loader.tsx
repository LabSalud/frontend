"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FlaskConical, AlertCircle, ChevronDown, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { useProtocolResults } from "@/hooks/use-protocol-results"
import { calculateFormulaValue } from "@/lib/result-formulas"
import { ResultDeterminationRow } from "./result-determination-row"

interface ProtocolResultsLoaderProps {
  controller: ReturnType<typeof useProtocolResults>
}

/**
 * Carga de resultados de un protocolo (presentacional): búsqueda de análisis,
 * agrupación y navegación por teclado (Enter guarda y baja; ↑↓ mueven; → notas).
 * Los datos llegan por `controller` (hook useProtocolResults en la página).
 */
export function ProtocolResultsLoader({ controller }: ProtocolResultsLoaderProps) {
  const { loading, error, protocol, results, groups, orderedIds, values, saving, onChange, onSave, previousResults, loadingPrevious, loadPrevious } =
    controller
  const patientId = protocol?.patient?.id ?? 0
  // Protocolo cancelado: se muestra la info pero en SOLO LECTURA (hay que
  // descancelarlo para editar). El backend además bloquea la escritura.
  const isCancelled = (protocol?.status?.name || "").trim().toLowerCase() === "cancelado"

  const [search, setSearch] = useState("")
  // Análisis colapsables: por defecto colapsados si ya tienen todos los
  // resultados cargados; expandidos si les falta cargar (para reducir ruido).
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set())
  const [collapseInit, setCollapseInit] = useState(false)
  useEffect(() => {
    if (collapseInit || groups.length === 0) return
    const collapsed = new Set<number>()
    groups.forEach((g) => {
      const allLoaded =
        g.determinations.length > 0 && g.determinations.every((d) => !!d.value)
      if (allLoaded) collapsed.add(g.analysis.id)
    })
    setCollapsedIds(collapsed)
    setCollapseInit(true)
  }, [groups, collapseInit])
  const toggleCollapse = (id: number) =>
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({})

  const focusInput = (id?: number) => {
    if (id == null) return
    const el = inputRefs.current[id]
    if (el && !el.disabled) {
      // preventScroll: hacemos el desplazamiento nosotros, centrando la fila
      // para que el siguiente resultado quede completamente visible.
      el.focus({ preventScroll: true })
      el.select()
      const row = (el.closest("[data-result-row]") as HTMLElement | null) ?? el
      row.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const onInputKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>, resultId: number) => {
      const i = orderedIds.indexOf(resultId)
      if (e.key === "Enter") {
        e.preventDefault()
        await onSave(resultId)
        focusInput(orderedIds[i + 1])
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        focusInput(orderedIds[i + 1])
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        focusInput(orderedIds[i - 1])
      } else if (e.key === "ArrowRight") {
        const ta = textareaRefs.current[resultId]
        if (ta && !ta.disabled) {
          e.preventDefault()
          ta.focus()
        }
      }
    },
    [orderedIds, onSave],
  )

  const onTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, resultId: number) => {
    if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) {
      e.preventDefault()
      focusInput(resultId)
    }
  }, [])

  // Filtro por nombre de análisis o de determinación.
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map((g) => {
        if (g.analysis.name.toLowerCase().includes(q)) return g
        const dets = g.determinations.filter((d) => d.determination.name.toLowerCase().includes(q))
        return dets.length ? { ...g, determinations: dets } : null
      })
      .filter((g): g is NonNullable<typeof g> => g !== null)
  }, [groups, search])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    )
  }

  if (groups.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Este protocolo no tiene determinaciones para cargar.</p>
  }

  return (
    <div className="space-y-4">
      {isCancelled && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Protocolo cancelado: se muestra en solo lectura. Descancelalo para poder editar los resultados.
        </div>
      )}
      {/* Búsqueda de análisis */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar análisis o determinación..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pl-10 pr-9"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filteredGroups.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Ningún análisis coincide con “{search}”.</p>
      ) : (
        filteredGroups.map((group) => {
          const loaded = group.determinations.filter((d) => !!d.value).length
          return (
            <section key={group.analysis.id}>
              <button
                type="button"
                onClick={() => toggleCollapse(group.analysis.id)}
                className="mb-2 flex w-full items-center justify-between gap-2 text-left"
              >
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${collapsedIds.has(group.analysis.id) ? "-rotate-90" : ""}`}
                  />
                  <FlaskConical className="h-4 w-4 text-[#204983]" />
                  {group.analysis.name}
                </h3>
                <Badge variant="outline" className="text-xs text-gray-500">
                  {loaded}/{group.determinations.length} cargados
                </Badge>
              </button>
              {!collapsedIds.has(group.analysis.id) && (
              <div className="space-y-2">
                {group.determinations.map((result) => {
                  const calc = calculateFormulaValue(result, results, values)
                  const isFormula = !!result.determination.formula?.trim()
                  const formulaResolved = !!calc && calc.missingCodes.length === 0
                  return (
                    <ResultDeterminationRow
                      key={result.id}
                      result={result}
                      value={values[result.id] || { value: "", notes: "" }}
                      saving={!!saving[result.id]}
                      readOnly={formulaResolved || isCancelled}
                      isFormula={isFormula}
                      formulaResolved={formulaResolved}
                      onChange={(field, val) => onChange(result.id, field, val)}
                      onSave={() => onSave(result.id)}
                      onLoadPrevious={() => loadPrevious(result.id, patientId, result.determination.id)}
                      registerInput={(el) => {
                        inputRefs.current[result.id] = el
                      }}
                      registerTextarea={(el) => {
                        textareaRefs.current[result.id] = el
                      }}
                      onInputKeyDown={(e) => onInputKeyDown(e, result.id)}
                      onTextareaKeyDown={(e) => onTextareaKeyDown(e, result.id)}
                      previous={previousResults[result.id] || []}
                      loadingPrevious={loadingPrevious.has(result.id)}
                    />
                  )
                })}
              </div>
              )}
            </section>
          )
        })
      )}
    </div>
  )
}
