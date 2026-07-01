"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useApi } from "@/hooks/use-api"
import { RESULTS_ENDPOINTS } from "@/config/api"
import { applyFormulaCalculations } from "@/lib/result-formulas"
import { formatApiError } from "@/lib/api-error"
import type { PreviousResult, Result } from "@/types"

export interface ResultValue {
  value: string
  notes: string
}

export interface ResultGroup {
  analysis: Result["analysis"]
  determinations: Result[]
}

export interface ResultsProtocolHeader {
  id: number
  patient: { id: number; dni?: string; first_name: string; last_name: string; age?: number | null; is_anonymous?: boolean } | null
  status: { id: number; name: string } | null
}

/** Agrupa los resultados por análisis, preservando el orden de llegada. */
function groupByAnalysis(results: Result[]): ResultGroup[] {
  const groups: Record<number, ResultGroup> = {}
  const order: number[] = []
  for (const r of results) {
    const aid = r.analysis.id
    if (!groups[aid]) {
      groups[aid] = { analysis: r.analysis, determinations: [] }
      order.push(aid)
    }
    groups[aid].determinations.push(r)
  }
  return order.map((aid) => groups[aid])
}

/**
 * Carga y guardado de los resultados de UN protocolo. Encapsula fetch, valores,
 * recálculo de fórmulas (debounced), guardado por determinación y resultados
 * anteriores del paciente. La navegación por teclado vive en el componente
 * (necesita refs del DOM); acá se expone `orderedIds` y `onSave`.
 */
export function useProtocolResults(protocolId: number) {
  const { apiRequest } = useApi()
  const [results, setResults] = useState<Result[]>([])
  const [protocol, setProtocol] = useState<ResultsProtocolHeader | null>(null)
  const [values, setValues] = useState<Record<number, ResultValue>>({})
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previousResults, setPreviousResults] = useState<Record<number, PreviousResult[]>>({})
  const [loadingPrevious, setLoadingPrevious] = useState<Set<number>>(new Set())

  const fetchResults = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // ?include=protocol trae cabecera (paciente + estado) + resultados en una
      // sola llamada, evitando un fetch aparte del detalle del protocolo.
      const res = await apiRequest(`${RESULTS_ENDPOINTS.BY_PROTOCOL(protocolId)}?include=protocol`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(formatApiError(err, "Error al cargar los resultados"))
      }
      const body = await res.json()
      const data: Result[] = Array.isArray(body) ? body : body.results || []
      if (!Array.isArray(body) && body.protocol) setProtocol(body.protocol as ResultsProtocolHeader)
      setResults(data)
      const initial: Record<number, ResultValue> = {}
      data.forEach((r) => {
        initial[r.id] = { value: r.value || "", notes: r.notes || "" }
      })
      setValues(applyFormulaCalculations(data, initial))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar los resultados")
    } finally {
      setLoading(false)
    }
  }, [apiRequest, protocolId])

  useEffect(() => {
    void fetchResults()
  }, [fetchResults])

  const groups = useMemo(() => groupByAnalysis(results), [results])
  const orderedIds = useMemo(() => groups.flatMap((g) => g.determinations.map((d) => d.id)), [groups])

  // Recálculo de fórmulas diferido: la tecla hace solo el set puntual.
  const formulaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onChange = useCallback(
    (resultId: number, field: "value" | "notes", value: string) => {
      setValues((prev) => ({ ...prev, [resultId]: { ...prev[resultId], [field]: value } }))
      if (field !== "value") return
      if (formulaTimer.current) clearTimeout(formulaTimer.current)
      formulaTimer.current = setTimeout(() => {
        setValues((prev) => applyFormulaCalculations(results, prev))
      }, 250)
    },
    [results],
  )

  const onSave = useCallback(
    async (resultId: number): Promise<boolean> => {
      const v = values[resultId]
      if (!v) return false
      setSaving((prev) => ({ ...prev, [resultId]: true }))
      try {
        const res = await apiRequest(RESULTS_ENDPOINTS.RESULT_DETAIL(resultId), {
          method: "PATCH",
          body: { value: v.value, notes: v.notes },
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(formatApiError(err, "Error al guardar el resultado"))
        }
        const updated: Result = await res.json()
        setResults((prev) => prev.map((r) => (r.id === resultId ? updated : r)))
        setValues((prev) => ({ ...prev, [resultId]: { value: updated.value, notes: updated.notes } }))
        return true
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar el resultado")
        return false
      } finally {
        setSaving((prev) => ({ ...prev, [resultId]: false }))
      }
    },
    [apiRequest, values],
  )

  // Validar / rechazar un resultado (validación, mouse-first).
  const onValidate = useCallback(
    async (resultId: number, isValid: boolean, notes?: string): Promise<boolean> => {
      setSaving((prev) => ({ ...prev, [resultId]: true }))
      try {
        const res = await apiRequest(RESULTS_ENDPOINTS.VALIDATE(resultId), {
          method: "POST",
          body: { is_valid: isValid, tipo: "bioquimica", ...(notes ? { notes } : {}) },
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(formatApiError(err, "Error al validar el resultado"))
        }
        const updated: Result = await res.json()
        setResults((prev) => prev.map((r) => (r.id === resultId ? updated : r)))
        toast.success(isValid ? "Resultado validado" : "Resultado rechazado")
        return true
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al validar el resultado")
        return false
      } finally {
        setSaving((prev) => ({ ...prev, [resultId]: false }))
      }
    },
    [apiRequest],
  )

  const loadPrevious = useCallback(
    async (resultId: number, patientId: number, determinationId: number) => {
      if (previousResults[resultId] || loadingPrevious.has(resultId)) return
      setLoadingPrevious((prev) => new Set(prev).add(resultId))
      try {
        const res = await apiRequest(RESULTS_ENDPOINTS.PREVIOUS_RESULTS(patientId, determinationId))
        if (res.ok) {
          const data: PreviousResult[] = await res.json()
          setPreviousResults((prev) => ({ ...prev, [resultId]: data }))
        }
      } catch {
        /* silencioso: los anteriores son auxiliares */
      } finally {
        setLoadingPrevious((prev) => {
          const next = new Set(prev)
          next.delete(resultId)
          return next
        })
      }
    },
    [apiRequest, previousResults, loadingPrevious],
  )

  return {
    loading,
    error,
    protocol,
    results,
    groups,
    orderedIds,
    values,
    saving,
    onChange,
    onSave,
    onValidate,
    previousResults,
    loadingPrevious,
    loadPrevious,
    refetch: fetchResults,
  }
}
