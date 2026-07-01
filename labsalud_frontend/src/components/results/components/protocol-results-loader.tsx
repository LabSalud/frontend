"use client"

import type React from "react"
import { useCallback, useRef } from "react"
import { FlaskConical, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useProtocolResults } from "@/hooks/use-protocol-results"
import { calculateFormulaValue } from "@/lib/result-formulas"
import { ResultDeterminationRow } from "./result-determination-row"

interface ProtocolResultsLoaderProps {
  protocolId: number
  patientId: number
}

/**
 * Carga de resultados de un protocolo: agrupa por análisis y orquesta la
 * navegación por teclado (Enter guarda y baja; ↑↓ mueven; → va a notas). La
 * lógica de datos vive en `useProtocolResults`; acá viven los refs del DOM.
 */
export function ProtocolResultsLoader({ protocolId, patientId }: ProtocolResultsLoaderProps) {
  const { loading, error, results, groups, orderedIds, values, saving, onChange, onSave, previousResults, loadingPrevious, loadPrevious } =
    useProtocolResults(protocolId)

  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({})

  const focusInput = (id?: number) => {
    if (id == null) return
    const el = inputRefs.current[id]
    if (el && !el.disabled) {
      el.focus()
      el.select()
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

  const onTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, resultId: number) => {
      if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) {
        e.preventDefault()
        focusInput(resultId)
      }
    },
    [],
  )

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
    <div className="space-y-5">
      {groups.map((group) => {
        const loaded = group.determinations.filter((d) => !!d.value).length
        return (
          <section key={group.analysis.id}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <FlaskConical className="h-4 w-4 text-[#204983]" />
                {group.analysis.name}
              </h3>
              <Badge variant="outline" className="text-xs text-gray-500">
                {loaded}/{group.determinations.length} cargados
              </Badge>
            </div>
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
                    readOnly={formulaResolved}
                    isFormula={isFormula}
                    formulaResolved={formulaResolved}
                    onChange={(field, val) => onChange(result.id, field, val)}
                    onSave={() => onSave(result.id)}
                    onFocus={() => loadPrevious(result.id, patientId, result.determination.id)}
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
          </section>
        )
      })}
    </div>
  )
}
