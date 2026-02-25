"use client"

import type React from "react"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../ui/accordion"
import { Badge } from "../../ui/badge"
import { Input } from "../../ui/input"
import { Textarea } from "../../ui/textarea"
import { Button } from "../../ui/button"
import {
  Loader2,
  FileText,
  User,
  AlertCircle,
  Search,
  FlaskConical,
  ArrowLeft,
  Beaker,
  Save,
  Clock,
  CheckCircle,
  Filter,
  X,
  History,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"
import { useApi } from "../../../hooks/use-api"
import { RESULTS_ENDPOINTS } from "../../../config/api"
import { useToast } from "../../../hooks/use-toast"

const RESULTS_ANALYSIS_STATUS_FILTER_KEY = "labsalud_results_analysis_status_filters"

interface AvailableAnalysis {
  id: number
  code: number
  name: string
  bio_unit: string
  is_urgent: boolean
  is_active: boolean
}

interface Determination {
  id: number
  name: string
  measure_unit: string
  formula: string
}

interface AnalysisInfo {
  id: number
  name: string
  code: number
  is_urgent: boolean
  ub: string
}

interface ValidatedBy {
  id: number
  username: string
  first_name: string
  last_name: string
}

interface Result {
  id: number
  determination: Determination
  value: string
  is_valid: boolean
  notes: string
  is_wrong: boolean
  is_active: boolean
  analysis: AnalysisInfo
  validated_by?: ValidatedBy | null
}

interface ProtocolWithResults {
  id: number
  patient: {
    id: number
    first_name: string
    last_name: string
  }
  status: {
    id: number
    name: string
  }
  results: Result[]
}

interface ResultValue {
  value: string
  notes: string
}

interface PreviousResultData {
  id: number
  determination: Determination
  value: string
  is_valid: boolean
  notes: string
  is_wrong: boolean
  validated_by: ValidatedBy | null
  is_active: boolean
  analysis: AnalysisInfo
  protocol_id?: number
  created_at?: string
  date?: string
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
    default:
      return "bg-gray-100 text-gray-800 border-gray-300"
  }
}

const extractErrorMessage = (errorData: any): string => {
  if (typeof errorData === "string") return errorData
  if (errorData?.detail) return errorData.detail
  if (errorData?.error) return errorData.error
  if (errorData?.message) return errorData.message
  if (typeof errorData === "object") {
    const firstKey = Object.keys(errorData)[0]
    if (firstKey && Array.isArray(errorData[firstKey])) {
      return `${firstKey}: ${errorData[firstKey][0]}`
    }
    if (firstKey && typeof errorData[firstKey] === "string") {
      return `${firstKey}: ${errorData[firstKey]}`
    }
  }
  return "Error desconocido"
}

export function AnalysisAccordionView() {
  const { apiRequest } = useApi()
  const { success, error: showError } = useToast()

  // Available analysis list
  const [availableAnalysis, setAvailableAnalysis] = useState<AvailableAnalysis[]>([])
  const [loadingAnalysis, setLoadingAnalysis] = useState(true)
  const [analysisSearchTerm, setAnalysisSearchTerm] = useState("")

  // Selected analysis and its protocols/results
  const [selectedAnalysis, setSelectedAnalysis] = useState<AvailableAnalysis | null>(null)
  const [protocolsWithResults, setProtocolsWithResults] = useState<ProtocolWithResults[]>([])
  const [loadingProtocols, setLoadingProtocols] = useState(false)
  const [protocolSearchTerm, setProtocolSearchTerm] = useState("")

  const [selectedStatuses, setSelectedStatuses] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(RESULTS_ANALYSIS_STATUS_FILTER_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Result editing state
  const [resultValues, setResultValues] = useState<Record<number, ResultValue>>({})
  const [savingStates, setSavingStates] = useState<Record<number, boolean>>({})
  const [expandedProtocols, setExpandedProtocols] = useState<string[]>([])

  const [previousResults, setPreviousResults] = useState<Record<number, PreviousResultData[]>>({})
  const [loadingPrevious, setLoadingPrevious] = useState<Set<number>>(new Set())
  const [expandedHistory, setExpandedHistory] = useState<Set<number>>(new Set())

  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const orderedResultIds = useRef<number[]>([])

  useEffect(() => {
    localStorage.setItem(RESULTS_ANALYSIS_STATUS_FILTER_KEY, JSON.stringify(selectedStatuses))
  }, [selectedStatuses])

  // Fetch available analysis on mount
  useEffect(() => {
    fetchAvailableAnalysis()
  }, [])

  const fetchAvailableAnalysis = useCallback(async () => {
    setLoadingAnalysis(true)
    try {
      const response = await apiRequest(RESULTS_ENDPOINTS.AVAILABLE_ANALYSIS)
      if (response.ok) {
        const data: AvailableAnalysis[] = await response.json()
        setAvailableAnalysis(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        showError(extractErrorMessage(errorData) || "Error al cargar análisis disponibles")
      }
    } catch (error) {
      showError("Error al cargar análisis")
    } finally {
      setLoadingAnalysis(false)
    }
  }, [apiRequest, showError])

  const fetchResultsByAnalysis = useCallback(
    async (analysisId: number, isInitial = true) => {
      if (isInitial) {
        setLoadingProtocols(true)
        setProtocolsWithResults([])
        setResultValues({})
        setExpandedProtocols([])
        setNextUrl(null)
        setHasMore(true)
      } else {
        setIsLoadingMore(true)
      }

      try {
        let url = isInitial ? RESULTS_ENDPOINTS.BY_ANALYSIS(analysisId) : nextUrl
        if (!url) return

        if (isInitial) {
          const params = new URLSearchParams()
          if (selectedStatuses.length > 0) {
            const statusesWithoutCancelled = selectedStatuses.filter((s) => s !== 4)
            if (statusesWithoutCancelled.length > 0) {
              params.append("status__in", statusesWithoutCancelled.join(","))
            }
          } else {
            params.append("status__in", "1,2,3,5,7")
          }
          if (params.toString()) {
            url += `?${params.toString()}`
          }
        }

        const response = await apiRequest(url)
        if (response.ok) {
          const data = await response.json()
          const results: ProtocolWithResults[] = Array.isArray(data) ? data : data.results || []

          if (isInitial) {
            setProtocolsWithResults(results)
            const protocolKeys = results.map((p) => `protocol-${p.id}`)
            setExpandedProtocols(protocolKeys)
          } else {
            setProtocolsWithResults((prev) => [...prev, ...results])
            const newProtocolKeys = results.map((p) => `protocol-${p.id}`)
            setExpandedProtocols((prev) => [...prev, ...newProtocolKeys])
          }

          const initialValues: Record<number, ResultValue> = {}
          const allResults = isInitial ? results : [...protocolsWithResults, ...results]
          allResults.forEach((protocol) => {
            protocol.results.forEach((result) => {
              initialValues[result.id] = {
                value: result.value || "",
                notes: result.notes || "",
              }
            })
          })
          setResultValues((prev) => ({ ...prev, ...initialValues }))

          if (!Array.isArray(data) && data.next) {
            setNextUrl(data.next)
            setHasMore(true)
          } else {
            setHasMore(false)
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          showError(extractErrorMessage(errorData) || "Error al cargar resultados")
        }
      } catch (error) {
        showError("Error al cargar resultados")
      } finally {
        setLoadingProtocols(false)
        setIsLoadingMore(false)
      }
    },
    [apiRequest, showError, nextUrl, selectedStatuses, protocolsWithResults],
  )

  useEffect(() => {
    if (!selectedAnalysis) return

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loadingProtocols) {
          fetchResultsByAnalysis(selectedAnalysis.id, false)
        }
      },
      { threshold: 0.1 },
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [selectedAnalysis, hasMore, isLoadingMore, loadingProtocols, fetchResultsByAnalysis])

  const handleSelectAnalysis = useCallback(
    (analysis: AvailableAnalysis) => {
      setSelectedAnalysis(analysis)
      fetchResultsByAnalysis(analysis.id, true)
    },
    [fetchResultsByAnalysis],
  )

  const handleBackToAnalysis = useCallback(() => {
    setSelectedAnalysis(null)
    setProtocolsWithResults([])
    setResultValues({})
    setExpandedProtocols([])
    setNextUrl(null)
    setHasMore(true)
  }, [])

  const handleValueChange = useCallback((resultId: number, field: "value" | "notes", value: string) => {
    setResultValues((prev) => ({
      ...prev,
      [resultId]: {
        ...prev[resultId],
        [field]: value,
      },
    }))
  }, [])

  const handleSaveResult = useCallback(
    async (resultId: number, protocolId: number) => {
      const resultValue = resultValues[resultId]
      if (!resultValue) return

      setSavingStates((prev) => ({ ...prev, [resultId]: true }))

      try {
        const response = await apiRequest(RESULTS_ENDPOINTS.RESULT_DETAIL(resultId), {
          method: "PATCH",
          body: {
            value: resultValue.value,
            notes: resultValue.notes,
          },
        })

        if (response.ok) {
          const updatedResult: Result = await response.json()
          success("Resultado guardado correctamente")

          setProtocolsWithResults((prev) =>
            prev.map((protocol) => {
              if (protocol.id === protocolId) {
                return {
                  ...protocol,
                  results: protocol.results.map((r) => (r.id === resultId ? updatedResult : r)),
                }
              }
              return protocol
            }),
          )

          setResultValues((prev) => ({
            ...prev,
            [resultId]: {
              value: updatedResult.value,
              notes: updatedResult.notes,
            },
          }))
        } else {
          const errorData = await response.json().catch(() => ({}))
          showError(extractErrorMessage(errorData) || "Error al guardar resultado")
        }
      } catch (error) {
        showError("Error al guardar resultado")
      } finally {
        setSavingStates((prev) => ({ ...prev, [resultId]: false }))
      }
    },
    [apiRequest, resultValues, success, showError],
  )

  useEffect(() => {
    const ids: number[] = []
    protocolsWithResults.forEach((protocol) => {
      protocol.results.forEach((result) => {
        ids.push(result.id)
      })
    })
    orderedResultIds.current = ids
  }, [protocolsWithResults])

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>, resultId: number, protocolId: number) => {
      if (e.key === "Enter") {
        e.preventDefault()

        await handleSaveResult(resultId, protocolId)

        const currentIndex = orderedResultIds.current.indexOf(resultId)
        if (currentIndex !== -1 && currentIndex < orderedResultIds.current.length - 1) {
          const nextResultId = orderedResultIds.current[currentIndex + 1]
          const nextInput = inputRefs.current[nextResultId]
          if (nextInput) {
            nextInput.focus()
            nextInput.select()
          }
        }
      }
    },
    [handleSaveResult],
  )

  const loadPreviousResults = useCallback(
    async (resultId: number, patientId: number, determinationId: number) => {
      if (previousResults[resultId] || loadingPrevious.has(resultId)) return

      setLoadingPrevious((prev) => new Set(prev).add(resultId))

      try {
        const response = await apiRequest(
          `${RESULTS_ENDPOINTS.RESULT_DETAIL(0).replace("/0/", "/history/")}?patient_id=${patientId}&determination_id=${determinationId}`,
        )

        if (response.ok) {
          const data: PreviousResultData[] = await response.json()
          setPreviousResults((prev) => ({ ...prev, [resultId]: data }))
        }
      } catch (err) {
        console.error("Error loading previous results:", err)
      } finally {
        setLoadingPrevious((prev) => {
          const newSet = new Set(prev)
          newSet.delete(resultId)
          return newSet
        })
      }
    },
    [apiRequest, previousResults, loadingPrevious],
  )

  const scrollToInput = (inputElement: HTMLInputElement | null) => {
    if (inputElement) {
      const container = inputElement.closest(".p-4.bg-white.border")
      if (container) {
        container.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
      }
    }
  }

  const handleInputFocus = useCallback(
    (resultId: number, patientId: number, determinationId: number) => {
      loadPreviousResults(resultId, patientId, determinationId)
      setExpandedHistory((prev) => new Set(prev).add(resultId))
      const input = inputRefs.current[resultId]
      scrollToInput(input)
    },
    [loadPreviousResults],
  )

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

  const toggleStatus = (statusId: number) => {
    setSelectedStatuses((prev) =>
      prev.includes(statusId) ? prev.filter((id) => id !== statusId) : [...prev, statusId],
    )
  }

  useEffect(() => {
    if (selectedAnalysis) {
      fetchResultsByAnalysis(selectedAnalysis.id, true)
    }
  }, [selectedStatuses])

  const filteredAnalysis = useMemo(() => {
    if (!analysisSearchTerm) return availableAnalysis
    const search = analysisSearchTerm.toLowerCase()
    return availableAnalysis.filter((a) => a.name.toLowerCase().includes(search) || String(a.code).includes(search))
  }, [availableAnalysis, analysisSearchTerm])

  const filteredProtocols = useMemo(() => {
    if (!protocolSearchTerm) return protocolsWithResults
    const search = protocolSearchTerm.toLowerCase()
    return protocolsWithResults.filter(
      (p) =>
        p.patient.first_name.toLowerCase().includes(search) ||
        p.patient.last_name.toLowerCase().includes(search) ||
        String(p.id).includes(search),
    )
  }, [protocolsWithResults, protocolSearchTerm])

  if (loadingAnalysis) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#204983]" />
          <p className="text-gray-600">Cargando análisis disponibles...</p>
        </div>
      </div>
    )
  }

  if (!selectedAnalysis) {
    return (
      <div className="space-y-4">
        <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <p className="text-xs sm:text-sm text-gray-700">
            Selecciona un análisis para ver todos los protocolos que lo contienen y cargar sus resultados
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar análisis por nombre o código..."
            value={analysisSearchTerm}
            onChange={(e) => setAnalysisSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        {filteredAnalysis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <AlertCircle className="h-12 w-12 mb-3 text-gray-400" />
            <p className="text-base sm:text-lg font-medium">
              {analysisSearchTerm ? "No se encontraron análisis" : "No hay análisis disponibles"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredAnalysis.map((analysis) => (
              <button
                key={analysis.id}
                onClick={() => handleSelectAnalysis(analysis)}
                className="p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-[#204983] transition-all text-left group"
              >
                <div className="flex items-start gap-2 sm:gap-3 mb-2">
                  <FlaskConical className="h-5 w-5 sm:h-6 sm:w-6 text-[#204983] group-hover:scale-110 transition-transform flex-shrink-0 mt-0.5" />
                  <h3 className="font-semibold text-sm sm:text-lg text-gray-900 group-hover:text-[#204983] transition-colors line-clamp-2">
                    {analysis.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-gray-50 text-xs">
                    Código: {analysis.code}
                  </Badge>
                  {analysis.is_urgent && (
                    <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300 text-xs">
                      Urgente
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Unidad: {analysis.bio_unit || "N/A"}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <Button variant="outline" size="sm" onClick={handleBackToAnalysis} className="bg-white w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <FlaskConical className="h-5 w-5 text-[#204983]" />
          <span className="font-semibold text-[#204983] text-sm sm:text-base">{selectedAnalysis.name}</span>
          <Badge variant="outline" className="bg-white text-xs">
            Código: {selectedAnalysis.code}
          </Badge>
          {selectedAnalysis.is_urgent && (
            <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300 text-xs">
              Urgente
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-lg border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por paciente o protocolo..."
            value={protocolSearchTerm}
            onChange={(e) => setProtocolSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs sm:text-sm font-medium text-gray-700">Filtrar por estado:</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Button
              variant={selectedStatuses.includes(1) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleStatus(1)}
              className={`text-xs ${selectedStatuses.includes(1) ? "bg-yellow-500 hover:bg-yellow-600" : ""}`}
            >
              <Clock className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Pend.</span> Carga
            </Button>
            <Button
              variant={selectedStatuses.includes(2) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleStatus(2)}
              className={`text-xs ${selectedStatuses.includes(2) ? "bg-blue-500 hover:bg-blue-600" : ""}`}
            >
              <Filter className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Pend.</span> Valid.
            </Button>
            <Button
              variant={selectedStatuses.includes(3) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleStatus(3)}
              className={`text-xs ${selectedStatuses.includes(3) ? "bg-orange-500 hover:bg-orange-600" : ""}`}
            >
              <Clock className="h-3 w-3 mr-1" />
              Pago <span className="hidden sm:inline">Incomp.</span>
            </Button>
            <Button
              variant={selectedStatuses.includes(6) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleStatus(6)}
              className={`text-xs ${selectedStatuses.includes(6) ? "bg-purple-500 hover:bg-purple-600" : ""}`}
            >
              <User className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Pend.</span> Retiro
            </Button>
            <Button
              variant={selectedStatuses.includes(5) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleStatus(5)}
              className={`text-xs ${selectedStatuses.includes(5) ? "bg-green-500 hover:bg-green-600" : ""}`}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Completado</span>
              <span className="sm:hidden">Compl.</span>
            </Button>
            <Button
              variant={selectedStatuses.includes(7) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleStatus(7)}
              className={`text-xs ${selectedStatuses.includes(7) ? "bg-rose-600 hover:bg-rose-700" : ""}`}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Envio Fallido</span>
              <span className="sm:hidden">Fallido</span>
            </Button>
            {selectedStatuses.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStatuses([])}
                className="text-gray-500 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500">Los protocolos cancelados no se muestran.</p>
        </div>
      </div>

      {loadingProtocols && protocolsWithResults.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#204983]" />
            <p className="text-gray-600">Cargando protocolos...</p>
          </div>
        </div>
      ) : filteredProtocols.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <AlertCircle className="h-12 w-12 mb-3 text-gray-400" />
          <p className="text-lg font-medium">No hay protocolos con este análisis</p>
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
                <AccordionTrigger className="px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-colors hover:no-underline">
                  <div className="flex items-center gap-3 flex-wrap w-full">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#204983]" />
                      <span className="font-semibold text-[#204983]">Protocolo #{protocol.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-900">
                        {protocol.patient.first_name} {protocol.patient.last_name}
                      </span>
                    </div>
                    <Badge variant="outline" className={getStatusColor(protocol.status.id)}>
                      {protocol.status.name}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 ml-auto">
                      {protocol.results.length} determinación(es)
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 py-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-4 p-3 bg-[#204983]/5 rounded-lg border border-[#204983]/20">
                    <Beaker className="h-5 w-5 text-[#204983]" />
                    <span className="font-semibold text-[#204983]">{selectedAnalysis.name}</span>
                    <Badge variant="outline" className="bg-white text-xs">
                      Código: {selectedAnalysis.code}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {protocol.results.map((result) => {
                      const currentValue = resultValues[result.id] || { value: "", notes: "" }
                      const isSaving = savingStates[result.id] || false
                      const hasValue = !!result.value
                      const isValidated = result.is_valid
                      const isWrong = result.is_wrong
                      const isHistoryExpanded = expandedHistory.has(result.id)
                      const prevResults = previousResults[result.id] || []
                      const isLoadingHistory = loadingPrevious.has(result.id)

                      return (
                        <div
                          key={result.id}
                          className={`p-4 bg-white border rounded-lg shadow-sm ${
                            isWrong
                              ? "border-red-300 bg-red-50"
                              : isValidated
                                ? "border-green-300 bg-green-50"
                                : hasValue
                                  ? "border-blue-300"
                                  : "border-gray-200"
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                            <div className="lg:w-1/4">
                              <p className="font-semibold text-gray-900">{result.determination.name}</p>
                              <p className="text-xs text-gray-500">
                                Unidad: {result.determination.measure_unit || "N/A"}
                              </p>
                              {result.determination.formula && (
                                <p className="text-xs text-gray-400 mt-1">Fórmula: {result.determination.formula}</p>
                              )}
                              {isValidated && <Badge className="mt-2 bg-green-600 text-white">Validado</Badge>}
                              {isWrong && (
                                <Badge variant="destructive" className="mt-2">
                                  No válido
                                </Badge>
                              )}
                              {isValidated && result.validated_by && (
                                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                                  <div className="flex items-center gap-1 text-xs text-green-700">
                                    <ShieldCheck className="h-3 w-3" />
                                    <span>
                                      Validado por: {result.validated_by.first_name} {result.validated_by.last_name}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="lg:w-1/4">
                              <label className="text-xs font-medium text-gray-700 block mb-1">
                                Resultado ({result.determination.measure_unit || "N/A"})
                              </label>
                              <Input
                                ref={(el) => {
                                  inputRefs.current[result.id] = el
                                }}
                                placeholder="Valor"
                                value={currentValue.value}
                                onChange={(e) => handleValueChange(result.id, "value", e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, result.id, protocol.id)}
                                onFocus={() =>
                                  handleInputFocus(result.id, protocol.patient.id, result.determination.id)
                                }
                                disabled={isValidated && !isWrong}
                                className={`${
                                  isWrong
                                    ? "bg-red-50 border-red-300"
                                    : isValidated
                                      ? "bg-green-100 border-green-300"
                                      : hasValue
                                        ? "bg-blue-50 border-blue-300"
                                        : "bg-white"
                                }`}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-1 text-xs text-gray-500 hover:text-[#204983]"
                                onClick={() => {
                                  toggleHistory(result.id)
                                  if (!previousResults[result.id]) {
                                    loadPreviousResults(result.id, protocol.patient.id, result.determination.id)
                                  }
                                }}
                              >
                                <History className="h-3 w-3 mr-1" />
                                Historial
                                {isHistoryExpanded ? (
                                  <ChevronUp className="h-3 w-3 ml-1" />
                                ) : (
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                )}
                              </Button>
                            </div>

                            <div className="lg:w-1/3">
                              <label className="text-xs font-medium text-gray-700 block mb-1">Notas (opcional)</label>
                              <Textarea
                                placeholder="Notas..."
                                value={currentValue.notes}
                                onChange={(e) => handleValueChange(result.id, "notes", e.target.value)}
                                disabled={isValidated && !isWrong}
                                className={`min-h-[60px] text-xs ${
                                  isWrong
                                    ? "bg-red-50 border-red-300"
                                    : isValidated
                                      ? "bg-green-100 border-green-300"
                                      : hasValue
                                        ? "bg-blue-50 border-blue-300"
                                        : "bg-white"
                                }`}
                              />
                            </div>

                            <div className="lg:w-auto flex items-end">
                              <Button
                                size="sm"
                                onClick={() => handleSaveResult(result.id, protocol.id)}
                                disabled={isSaving || !currentValue.value?.trim() || (isValidated && !isWrong)}
                                className="bg-[#204983] hover:bg-[#1a3a6b] text-white"
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-1" />
                                    {hasValue ? "Actualizar" : "Guardar"}
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          {isHistoryExpanded && (
                            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <History className="h-4 w-4" />
                                Resultados Previos del Paciente
                              </h4>
                              {isLoadingHistory ? (
                                <div className="flex items-center gap-2 text-gray-500">
                                  <Loader2 className="h-6 w-6 animate-spin text-[#204983]" />
                                  <span className="text-sm">Cargando historial...</span>
                                </div>
                              ) : prevResults.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                  No hay resultados previos para esta determinación.
                                </p>
                              ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {prevResults.map((prev, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-lg font-semibold text-[#204983]">{prev.value}</span>
                                        <span className="text-xs text-gray-500">
                                          {result.determination.measure_unit}
                                        </span>
                                        {prev.date && (
                                          <span className="text-xs text-gray-400">
                                            {new Date(prev.date).toLocaleDateString("es-AR", {
                                              day: "2-digit",
                                              month: "2-digit",
                                              year: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </span>
                                        )}
                                      </div>
                                      {prev.is_valid && (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                                          Validado
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div ref={loadMoreRef} className="py-4">
            {isLoadingMore && (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#204983]" />
              </div>
            )}
            {!hasMore && protocolsWithResults.length > 0 && (
              <p className="text-center text-sm text-gray-500">No hay más protocolos para cargar</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
