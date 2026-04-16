"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Loader2, CheckCircle, AlertTriangle, History, Beaker, XCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useApi } from "@/hooks/use-api"
import { RESULTS_ENDPOINTS } from "@/config/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ProtocolWithLoadedResults, Result } from "@/types"
import { Textarea } from "@/components/ui/textarea"

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

interface GroupedAnalysis {
  analysisId: number
  analysisName: string
  results: Result[]
}

interface ValidationProtocolCardProps {
  protocol: ProtocolWithLoadedResults
  onProtocolValidated: (protocolId: number) => void
  isExpanded: boolean
}

const groupResultsByAnalysis = (results: Result[]): GroupedAnalysis[] => {
  const groupMap = new Map<number, GroupedAnalysis>()

  results.forEach((result) => {
    const analysisId = result.analysis.id
    if (!groupMap.has(analysisId)) {
      groupMap.set(analysisId, {
        analysisId: analysisId,
        analysisName: result.analysis.name,
        results: [],
      })
    }
    groupMap.get(analysisId)!.results.push(result)
  })

  return Array.from(groupMap.values())
}

const getValidationStatus = (result: Result) => {
  if (result.is_wrong) return "wrong"
  if (result.is_valid) return "valid"
  return "pending"
}

const mergeUpdatedResultPreservingNotes = (previous: Result, updated: Result): Result => ({
  ...updated,
  notes: updated.notes?.trim() ? updated.notes : previous.notes,
})

export function ValidationProtocolCard({ protocol, onProtocolValidated, isExpanded }: ValidationProtocolCardProps) {
  const { apiRequest } = useApi()
  const [results, setResults] = useState<Result[]>([])
  const [groupedResults, setGroupedResults] = useState<GroupedAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedAnalysis, setExpandedAnalysis] = useState<string[]>([])
  const [validatingIds, setValidatingIds] = useState<Set<number>>(new Set())
  const [rejectingIds, setRejectingIds] = useState<Set<number>>(new Set())
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())
  const [previousResults, setPreviousResults] = useState<Record<number, Result[]>>({})
  const [loadingPrevious, setLoadingPrevious] = useState<Set<number>>(new Set())
  const [expandedHistory, setExpandedHistory] = useState<Set<number>>(new Set())
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    if (isExpanded && results.length === 0) {
      loadProtocolResults()
    }
  }, [isExpanded])

  const loadProtocolResults = async () => {
    try {
      setIsLoading(true)
      const response = await apiRequest(RESULTS_ENDPOINTS.BY_PROTOCOL_WITH_VALUE(protocol.id))

      if (!response.ok) {
        const errorMsg = await extractResponseError(response)
        throw new Error(errorMsg)
      }

      const data = await response.json()
      const resultsData: Result[] = data.results || data
      setResults(resultsData)
      const grouped = groupResultsByAnalysis(resultsData)
      setGroupedResults(grouped)

      setExpandedAnalysis(grouped.map((g) => g.analysisId.toString()))
    } catch (err) {
      console.error("Error loading protocol results:", err)
      toast.error(extractErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const toggleHistory = useCallback((resultId: number) => {
    setExpandedHistory((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(resultId)) {
        newSet.delete(resultId)
      } else {
        newSet.add(resultId)
      }
      return newSet
    })
  }, [])

  const loadPreviousResults = useCallback(
    async (resultId: number, determinationId: number) => {
      if (previousResults[resultId] || loadingPrevious.has(resultId)) return

      setLoadingPrevious((prev) => new Set(prev).add(resultId))
      try {
        const response = await apiRequest(RESULTS_ENDPOINTS.PREVIOUS_RESULTS(protocol.patient.id, determinationId))

        if (!response.ok) {
          const errorMsg = await extractResponseError(response)
          throw new Error(errorMsg)
        }

        const data: Result[] = await response.json()
        setPreviousResults((prev) => ({ ...prev, [resultId]: data }))
      } catch (error) {
        console.error("Error loading previous results:", error)
        toast.error(extractErrorMessage(error))
      } finally {
        setLoadingPrevious((prev) => {
          const newSet = new Set(prev)
          newSet.delete(resultId)
          return newSet
        })
      }
    },
    [apiRequest, protocol.patient.id, previousResults, loadingPrevious],
  )

  const handleButtonZoneEnter = useCallback(
    (resultId: number, determinationId: number) => {
      if (!previousResults[resultId] && !loadingPrevious.has(resultId)) {
        loadPreviousResults(resultId, determinationId)
      }
      setExpandedHistory((prev) => new Set(prev).add(resultId))
    },
    [previousResults, loadingPrevious, loadPreviousResults],
  )

  const handleButtonZoneLeave = useCallback((e: React.MouseEvent, resultId: number) => {
    const relatedTarget = e.relatedTarget as Node | null
    const currentTarget = e.currentTarget as Node
    if (relatedTarget && currentTarget.contains(relatedTarget)) {
      return
    }
    setExpandedHistory((prev) => {
      const newSet = new Set(prev)
      newSet.delete(resultId)
      return newSet
    })
  }, [])

  const handleValidateResult = async (resultId: number) => {
    const pendingResults = results.filter((r) => !r.is_valid && !r.is_wrong)
    const isLast = pendingResults.length === 1 && pendingResults[0].id === resultId

    try {
      setValidatingIds((prev) => new Set(prev).add(resultId))

      const response = await apiRequest(RESULTS_ENDPOINTS.VALIDATE(resultId), {
        method: "POST",
        body: { is_valid: true },
      })

      if (!response.ok) {
        const errorMsg = await extractResponseError(response)
        throw new Error(errorMsg)
      }

      const updatedResult: Result = await response.json()

      setResults((prev) => prev.map((r) => (r.id === resultId ? mergeUpdatedResultPreservingNotes(r, updatedResult) : r)))
      setGroupedResults((prev) =>
        prev.map((group) => ({
          ...group,
          results: group.results.map((r) =>
            r.id === resultId ? mergeUpdatedResultPreservingNotes(r, updatedResult) : r,
          ),
        })),
      )

      toast.success("Resultado validado correctamente")

      if (isLast) {
        setShowConfirmModal(true)
      }
    } catch (err) {
      console.error("Error validating result:", err)
      toast.error(extractErrorMessage(err))
    } finally {
      setValidatingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(resultId)
        return newSet
      })
    }
  }

  const handleRejectResult = async (resultId: number) => {
    try {
      setRejectingIds((prev) => new Set(prev).add(resultId))

      const response = await apiRequest(RESULTS_ENDPOINTS.VALIDATE(resultId), {
        method: "POST",
        body: { is_valid: false },
      })

      if (!response.ok) {
        const errorMsg = await extractResponseError(response)
        throw new Error(errorMsg)
      }

      const updatedResult: Result = await response.json()

      setResults((prev) => prev.map((r) => (r.id === resultId ? mergeUpdatedResultPreservingNotes(r, updatedResult) : r)))
      setGroupedResults((prev) =>
        prev.map((group) => ({
          ...group,
          results: group.results.map((r) =>
            r.id === resultId ? mergeUpdatedResultPreservingNotes(r, updatedResult) : r,
          ),
        })),
      )

      toast.success("Resultado marcado como incorrecto")
    } catch (err) {
      console.error("Error rejecting result:", err)
      toast.error(extractErrorMessage(err))
    } finally {
      setRejectingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(resultId)
        return newSet
      })
    }
  }

  const handleToggleValidation = async (resultId: number, currentIsValid: boolean) => {
    try {
      setTogglingIds((prev) => new Set(prev).add(resultId))

      const response = await apiRequest(RESULTS_ENDPOINTS.VALIDATE(resultId), {
        method: "POST",
        body: { is_valid: !currentIsValid },
      })

      if (!response.ok) {
        const errorMsg = await extractResponseError(response)
        throw new Error(errorMsg)
      }

      const updatedResult: Result = await response.json()

      setResults((prev) => prev.map((r) => (r.id === resultId ? mergeUpdatedResultPreservingNotes(r, updatedResult) : r)))
      setGroupedResults((prev) =>
        prev.map((group) => ({
          ...group,
          results: group.results.map((r) =>
            r.id === resultId ? mergeUpdatedResultPreservingNotes(r, updatedResult) : r,
          ),
        })),
      )

      toast.success("Estado de validación actualizado")
    } catch (err) {
      console.error("Error toggling validation:", err)
      toast.error(extractErrorMessage(err))
    } finally {
      setTogglingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(resultId)
        return newSet
      })
    }
  }

  const handleConfirmComplete = () => {
    setShowConfirmModal(false)
    onProtocolValidated(protocol.id)
    toast.success("Protocolo completamente validado")
  }

  const handleContinueEditing = () => {
    setShowConfirmModal(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
              <Skeleton className="h-8 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (groupedResults.length === 0) {
    return <p className="text-center text-gray-500 py-4">No hay resultados cargados para validar.</p>
  }

  return (
    <>
      <Accordion type="multiple" value={expandedAnalysis} onValueChange={setExpandedAnalysis} className="space-y-3">
        {groupedResults.map((group) => (
          <AccordionItem
            key={group.analysisId}
            value={group.analysisId.toString()}
            className="border rounded-lg bg-white relative"
          >
            <AccordionTrigger className="px-3 sm:px-4 py-3 hover:no-underline hover:bg-gray-50">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <Beaker className="h-4 w-4 sm:h-5 sm:w-5 text-[#204983]" />
                <span className="font-semibold text-gray-900 text-sm sm:text-base">{group.analysisName}</span>
                <Badge variant="outline" className="text-xs">
                  {group.results.length} det.
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 pb-4">
              <div className="space-y-4">
                {group.results.map((result) => {
                  const validationStatus = getValidationStatus(result)
                  const isValidating = validatingIds.has(result.id)
                  const isRejecting = rejectingIds.has(result.id)
                  const isToggling = togglingIds.has(result.id)
                  const prevResults = previousResults[result.id] || []
                  const isLoadingHistory = loadingPrevious.has(result.id)
                  const isHistoryExpanded = expandedHistory.has(result.id)

                  return (
                    <div
                      key={result.id}
                      className={`relative border rounded-lg shadow-sm overflow-hidden ${validationStatus === "wrong"
                          ? "border-red-300 bg-red-50"
                          : validationStatus === "valid"
                            ? "border-green-300 bg-green-50"
                            : "border-blue-300 bg-white"
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* Contenido principal */}
                        <div className="flex-1 p-3 sm:p-4">
                          {/* Header con nombre y badges */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                              {result.determination.name}
                            </h4>
                            {validationStatus === "valid" && (
                              <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Validado
                              </Badge>
                            )}
                            {validationStatus === "wrong" && (
                              <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700 text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Revisión
                              </Badge>
                            )}
                            {validationStatus === "pending" && (
                              <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 text-xs">
                                Pendiente
                              </Badge>
                            )}
                          </div>

                          {/* Valor */}
                          <p className="text-base sm:text-lg text-[#204983] font-medium mb-2">
                            {result.value || "Sin valor"} {result.determination.measure_unit}
                          </p>

                          <div className="mt-2">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Observaciones</p>
                            <Textarea
                              readOnly
                              placeholder="Sin observaciones cargadas"
                              className="min-h-[52px] resize-none w-full border-0 bg-gray-50/80 px-3 py-2 text-sm font-serif text-gray-700 shadow-none focus-visible:ring-0"
                              rows={2}
                              value={result.notes || ""}
                            />
                          </div>

                          {/* Validado por */}
                          {validationStatus === "valid" && result.validated_by && (
                            <div className="text-xs text-gray-500">
                              Validado por: {result.validated_by.first_name} {result.validated_by.last_name}
                            </div>
                          )}
                        </div>

                        {/* Panel de resultados previos en desktop: columna lateral de alto completo */}
                        {validationStatus === "pending" && (
                          <div
                            style={{
                              maxWidth: isHistoryExpanded ? "176px" : "0px",
                              opacity: isHistoryExpanded ? 1 : 0,
                            }}
                            className="hidden sm:flex flex-col overflow-hidden transition-[max-width,opacity] duration-300 ease-out border-l border-gray-200 bg-gray-50"
                            onMouseEnter={() => handleButtonZoneEnter(result.id, result.determination.id)}
                            onMouseLeave={(e) => handleButtonZoneLeave(e, result.id)}
                          >
                            <div className="w-44 h-[190px] p-3 flex flex-col">
                              <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-2 whitespace-nowrap">
                                <History className="h-3 w-3 flex-shrink-0" />
                                Resultados previos
                              </div>
                              {isLoadingHistory ? (
                                <div className="space-y-1 overflow-y-auto">
                                  {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-6 w-full rounded" />
                                  ))}
                                </div>
                              ) : prevResults.length > 0 ? (
                                <div className="space-y-1 flex-1 overflow-y-auto pr-1">
                                  {prevResults.map((prev, idx) => (
                                    <div key={idx} className="flex justify-between text-xs p-1.5 bg-white rounded border">
                                      <span className="font-medium text-[#204983] truncate">
                                        {prev.value} {prev.determination?.measure_unit}
                                      </span>
                                      <span className="text-gray-400 ml-1 flex-shrink-0">#{prev.id}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 italic whitespace-nowrap">Sin resultados previos</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Zona de botones */}
                        <div
                          className="flex flex-col border-t sm:border-t-0 sm:border-l border-gray-200 bg-gray-50"
                          onMouseEnter={() => handleButtonZoneEnter(result.id, result.determination.id)}
                          onMouseLeave={(e) => handleButtonZoneLeave(e, result.id)}
                          onFocus={() => handleButtonZoneEnter(result.id, result.determination.id)}
                          onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                              handleButtonZoneLeave(e as unknown as React.MouseEvent, result.id)
                            }
                          }}
                        >
                          {/* Botones de acción */}
                          <div className="flex flex-col p-3 sm:p-4 w-full sm:w-48 md:w-56 flex-shrink-0 h-full">
                            <div className="flex flex-col gap-3 h-full">
                              {validationStatus === "pending" ? (
                                <>
                                  <Button
                                    size="default"
                                    className="bg-green-600 hover:bg-green-700 text-white w-full font-semibold min-h-[50px] flex-1"
                                    onClick={() => handleValidateResult(result.id)}
                                    disabled={isValidating || isRejecting || isToggling}
                                  >
                                    {isValidating ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Validar Resultado
                                      </>
                                    )}
                                  </Button>

                                  <div className="pt-2 border-t border-red-200/70 flex-1 min-h-[50px]">
                                    <Button
                                      size="default"
                                      variant="outline"
                                      className="h-full border-red-300 text-red-700 hover:bg-red-50 bg-white w-full font-semibold"
                                      onClick={() => handleRejectResult(result.id)}
                                      disabled={isValidating || isRejecting || isToggling}
                                    >
                                      {isRejecting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Rechazar Resultado
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-white w-full h-full min-h-[50px]"
                                  onClick={() => handleToggleValidation(result.id, result.is_valid)}
                                  disabled={isToggling}
                                >
                                  {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cambiar estado"}
                                </Button>
                              )}
                            </div>

                            {/* Botón y panel de resultados previos — solo móvil */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-gray-500 hover:text-[#204983] sm:hidden mt-2"
                              onClick={() => {
                                toggleHistory(result.id)
                                if (!previousResults[result.id]) {
                                  loadPreviousResults(result.id, result.determination.id)
                                }
                              }}
                            >
                              <History className="h-3 w-3 mr-1" />
                              {isHistoryExpanded ? "Ocultar resultados previos" : "Ver resultados previos"}
                            </Button>
                            {isHistoryExpanded && (
                              <div className="mt-3 pt-3 border-t border-gray-200 sm:hidden">
                                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                  <History className="h-3 w-3" />
                                  Resultados previos
                                </div>
                                {isLoadingHistory ? (
                                  <div className="space-y-1">
                                    {[...Array(3)].map((_, i) => (
                                      <Skeleton key={i} className="h-6 w-full rounded" />
                                    ))}
                                  </div>
                                ) : prevResults.length > 0 ? (
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {prevResults.slice(0, 5).map((prev, idx) => (
                                      <div key={idx} className="flex justify-between text-xs p-1.5 bg-white rounded border">
                                        <span className="font-medium text-[#204983]">
                                          {prev.value} {prev.determination?.measure_unit}
                                        </span>
                                        <span className="text-gray-400">#{prev.id}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 italic">Sin resultados previos</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Modal de confirmación */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Validación Completada</DialogTitle>
            <DialogDescription>
              Has validado todos los resultados de este protocolo. ¿Deseas realizar algún cambio adicional o finalizar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleContinueEditing} className="w-full sm:w-auto bg-transparent">
              Seguir editando
            </Button>
            <Button className="bg-[#204983] hover:bg-[#204983]/90 w-full sm:w-auto" onClick={handleConfirmComplete}>
              Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
