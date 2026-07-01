"use client"

import { useMemo, useState } from "react"
import { FlaskConical, AlertCircle, Search, X, CheckCheck, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { useProtocolResults } from "@/hooks/use-protocol-results"
import { ValidationResultRow } from "./validation-result-row"

interface ProtocolValidationLoaderProps {
  controller: ReturnType<typeof useProtocolResults>
}

/** Validación de un protocolo (presentacional): agrupa por análisis, con
 * "Validar todos" y búsqueda. Los datos vienen por `controller`. */
export function ProtocolValidationLoader({ controller }: ProtocolValidationLoaderProps) {
  const { loading, error, protocol, results, groups, saving, onValidate, previousResults, loadingPrevious, loadPrevious } = controller
  const patientId = protocol?.patient?.id ?? 0
  const [search, setSearch] = useState("")
  const [validatingAll, setValidatingAll] = useState(false)

  const pendingWithValue = results.filter((r) => !!r.value && !r.is_valid)

  const validateAll = async () => {
    setValidatingAll(true)
    for (const r of pendingWithValue) {
      // eslint-disable-next-line no-await-in-loop
      await onValidate(r.id, true)
    }
    setValidatingAll(false)
  }

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
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
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
    return <p className="py-8 text-center text-sm text-gray-400">Este protocolo no tiene resultados para validar.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Buscar análisis o determinación..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 pl-10 pr-9" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          onClick={validateAll}
          disabled={validatingAll || pendingWithValue.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {validatingAll ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-1.5 h-4 w-4" />}
          Validar todos ({pendingWithValue.length})
        </Button>
      </div>

      {filteredGroups.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Ningún análisis coincide con “{search}”.</p>
      ) : (
        filteredGroups.map((group) => {
          const validated = group.determinations.filter((d) => d.is_valid).length
          return (
            <section key={group.analysis.id}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <FlaskConical className="h-4 w-4 text-[#204983]" />
                  {group.analysis.name}
                </h3>
                <Badge variant="outline" className="text-xs text-gray-500">
                  {validated}/{group.determinations.length} validados
                </Badge>
              </div>
              <div className="space-y-2">
                {group.determinations.map((result) => (
                  <ValidationResultRow
                    key={result.id}
                    result={result}
                    saving={!!saving[result.id]}
                    onValidate={(isValid) => onValidate(result.id, isValid)}
                    onLoadPrevious={() => loadPrevious(result.id, patientId, result.determination.id)}
                    previous={previousResults[result.id] || []}
                    loadingPrevious={loadingPrevious.has(result.id)}
                  />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
