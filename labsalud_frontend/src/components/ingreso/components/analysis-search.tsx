"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Search, TestTube, Package, Plus } from "lucide-react"
import { Input } from "../../ui/input"
import { Button } from "../../ui/button"
import { Badge } from "../../ui/badge"
import { useApi } from "../../../hooks/use-api"
import { useDebounce } from "../../../hooks/use-debounce"
import { useInfiniteScroll } from "../../../hooks/use-infinite-scroll"
import { toast } from "sonner"
import type { Analysis, SelectedAnalysis } from "../../../types"
import { CATALOG_ENDPOINTS } from "../../../config/api"

const BIOCHEMICAL_ACT_CODE = 660001
const SPECIAL_BIOCHEMICAL_ACT_CODE = 661001
const THRESHOLD_CODE = 661001

interface AnalysisSearchProps {
  selectedAnalyses: SelectedAnalysis[]
  onAnalysisChange: (analyses: SelectedAnalysis[]) => void
}

interface PaginatedResponse<T> {
  next: string | null
  results: T[]
}

export function AnalysisSearch({ selectedAnalyses, onAnalysisChange }: AnalysisSearchProps) {
  const { apiRequest } = useApi()
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Analysis[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [biochemicalActCache, setBiochemicalActCache] = useState<Record<number, Analysis | null>>({})

  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const resultsRef = useRef<HTMLDivElement>(null)

  const loadMoreAnalyses = () => {
    if (nextUrl && !isLoadingMore) {
      searchAnalyses(debouncedSearchTerm, false)
    }
  }

  const setLastElementRef = useInfiniteScroll({
    loading: isLoadingMore,
    hasMore,
    onLoadMore: loadMoreAnalyses,
  })

  const fetchBiochemicalAct = async (code: number): Promise<Analysis | null> => {
    if (biochemicalActCache[code] !== undefined) {
      return biochemicalActCache[code]
    }

    try {
      const url = `${CATALOG_ENDPOINTS.ANALYSIS}?code=${code}&is_active=true`
      const response = await apiRequest(url)

      if (response.ok) {
        const data: PaginatedResponse<Analysis> = await response.json()
        const analysis = data.results.length > 0 ? data.results[0] : null
        setBiochemicalActCache((prev) => ({ ...prev, [code]: analysis }))
        return analysis
      }
    } catch (error) {
      console.error(`Error fetching biochemical act ${code}:`, error)
    }

    setBiochemicalActCache((prev) => ({ ...prev, [code]: null }))
    return null
  }

  // Trae el análisis cuyo código es EXACTAMENTE `code`. Se usa al presionar Enter
  // con un código: garantiza que se agregue ese código y no un match parcial o un
  // resultado viejo del debounce (bug: a veces tomaba un código más corto).
  const fetchByExactCode = async (code: number): Promise<Analysis | null> => {
    try {
      const url = `${CATALOG_ENDPOINTS.ANALYSIS}?code=${code}&is_active=true`
      const response = await apiRequest(url)
      if (response.ok) {
        const data: PaginatedResponse<Analysis> = await response.json()
        return data.results.find((a) => Number(a.code) === code) ?? null
      }
    } catch (error) {
      console.error(`Error fetching analysis by code ${code}:`, error)
    }
    return null
  }

  const searchAnalyses = async (term: string, isNewSearch = false) => {
    if (!term.trim()) {
      setSearchResults([])
      setShowResults(false)
      setHasMore(false)
      setNextUrl(null)
      return
    }

    try {
      if (isNewSearch) {
        setIsSearching(true)
        setSearchResults([])
      } else {
        setIsLoadingMore(true)
      }

      const url = isNewSearch
        ? `${CATALOG_ENDPOINTS.ANALYSIS}?search=${encodeURIComponent(term.trim())}&is_active=true&limit=20&offset=0`
        : nextUrl

      if (!url) return

      const response = await apiRequest(url)

      if (response.ok) {
        const data: PaginatedResponse<Analysis> = await response.json()
        const newResults = data.results || []

        if (isNewSearch) {
          setSearchResults(newResults)
        } else {
          setSearchResults((prev) => [...prev, ...newResults])
        }

        setHasMore(!!data.next)
        setNextUrl(data.next)
        setShowResults(newResults.length > 0 || searchResults.length > 0)
      } else {
        console.error("Search failed with status:", response.status)
      }
    } catch (error) {
      console.error("Error searching analyses:", error)
    } finally {
      setIsSearching(false)
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    setHighlightedIndex(0)
    if (debouncedSearchTerm.trim()) {
      searchAnalyses(debouncedSearchTerm, true)
    } else {
      setSearchResults([])
      setShowResults(false)
      setHasMore(false)
      setNextUrl(null)
    }
  }, [debouncedSearchTerm])

  const handleAddAnalysis = async (analysis: Analysis) => {
    if (selectedAnalyses.find((a) => a.id === analysis.id)) {
      toast.info(`El análisis "${analysis.name}" ya está seleccionado`)
      setSearchTerm("")
      setShowResults(false)
      return
    }

    const analysisCode = typeof analysis.code === "string" ? Number.parseInt(analysis.code, 10) : Number(analysis.code)

    if (analysisCode === BIOCHEMICAL_ACT_CODE || analysisCode === SPECIAL_BIOCHEMICAL_ACT_CODE) {
      toast.info("El acto bioquímico se agrega automáticamente según los análisis seleccionados")
      setSearchTerm("")
      setShowResults(false)
      return
    }

    const needsNormalAct = analysisCode < THRESHOLD_CODE

    const hasNormalAct = selectedAnalyses.some((a) => {
      const code = typeof a.code === "string" ? Number.parseInt(a.code, 10) : Number(a.code)
      return code === BIOCHEMICAL_ACT_CODE
    })

    let newAnalyses = [...selectedAnalyses]
    const actsToAdd: SelectedAnalysis[] = []

    if (needsNormalAct && !hasNormalAct) {
      const normalAct = await fetchBiochemicalAct(BIOCHEMICAL_ACT_CODE)
      if (normalAct) {
        actsToAdd.push({
          ...normalAct,
          is_authorized: false,
        })
        toast.success(`Acto bioquímico (${BIOCHEMICAL_ACT_CODE}) agregado automáticamente`)
      }
    }

    // El acto bioquímico de INTERNACIÓN (661001) ya NO se auto-agrega: se
    // carga manualmente cuando corresponde. Solo el acto normal (660001) sigue
    // siendo automático.

    const existingWithoutBioActs = newAnalyses.filter((a) => {
      const code = typeof a.code === "string" ? Number.parseInt(a.code, 10) : Number(a.code)
      return code !== BIOCHEMICAL_ACT_CODE && code !== SPECIAL_BIOCHEMICAL_ACT_CODE
    })
    const existingBioActs = newAnalyses.filter((a) => {
      const code = typeof a.code === "string" ? Number.parseInt(a.code, 10) : Number(a.code)
      return code === BIOCHEMICAL_ACT_CODE || code === SPECIAL_BIOCHEMICAL_ACT_CODE
    })

    const allBioActs = [...existingBioActs, ...actsToAdd]
    const uniqueBioActs = allBioActs.reduce((acc, act) => {
      const code = typeof act.code === "string" ? Number.parseInt(act.code, 10) : Number(act.code)
      const exists = acc.some((a) => {
        const aCode = typeof a.code === "string" ? Number.parseInt(a.code, 10) : Number(a.code)
        return aCode === code
      })
      if (!exists) {
        acc.push(act)
      }
      return acc
    }, [] as SelectedAnalysis[])

    uniqueBioActs.sort((a, b) => {
      const codeA = typeof a.code === "string" ? Number.parseInt(a.code, 10) : Number(a.code)
      const codeB = typeof b.code === "string" ? Number.parseInt(b.code, 10) : Number(b.code)
      return codeA - codeB
    })

    const selectedAnalysis: SelectedAnalysis = {
      ...analysis,
      is_authorized: false,
    }

    newAnalyses = [...uniqueBioActs, ...existingWithoutBioActs, selectedAnalysis]

    onAnalysisChange(newAnalyses)
    if (analysis.is_obsolete) {
      toast.warning(`"${analysis.name}" está marcado como en desuso (sin UB vigente). Verificá antes de continuar.`)
    } else {
      toast.success(`Análisis "${analysis.name}" agregado`)
    }

    setSearchTerm("")
    setShowResults(false)
  }

  const filteredResults = searchResults.filter(
    (analysis) => !selectedAnalyses.find((selected) => selected.id === analysis.id),
  )

  // Si el término es un código numérico, el match EXACTO va primero (y queda
  // resaltado por defecto), para que Enter no agarre un código parcial/más corto.
  const numericTerm = /^\d+$/.test(searchTerm.trim()) ? Number(searchTerm.trim()) : null
  const orderedResults =
    numericTerm === null
      ? filteredResults
      : [...filteredResults].sort(
          (a, b) => (Number(a.code) === numericTerm ? 0 : 1) - (Number(b.code) === numericTerm ? 0 : 1),
        )

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIndex((i) => Math.min(i + 1, orderedResults.length - 1))
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      const term = searchTerm.trim()

      // Código numérico: priorizar SIEMPRE la coincidencia exacta de código.
      if (/^\d+$/.test(term)) {
        const code = Number(term)
        const exact = orderedResults.find((a) => Number(a.code) === code)
        if (exact) {
          handleAddAnalysis(exact)
          return
        }
        // No está entre los resultados visibles (debounce o paginación): lo traemos.
        const fetched = await fetchByExactCode(code)
        if (fetched) {
          handleAddAnalysis(fetched)
        } else if (orderedResults.length > 0) {
          handleAddAnalysis(orderedResults[highlightedIndex] ?? orderedResults[0])
        } else {
          toast.error(`No se encontró un análisis con el código ${code}`)
        }
        return
      }

      // Texto: agregar el análisis resaltado.
      if (orderedResults.length > 0) {
        handleAddAnalysis(orderedResults[highlightedIndex] ?? orderedResults[0])
      }
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar por nombre o código... (↑↓ para elegir, Enter agrega)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 border-gray-300 focus:border-[#204983] focus:ring-[#204983]"
          onFocus={() => searchTerm && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#204983]" />
          </div>
        )}
      </div>

      {showResults && orderedResults.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {orderedResults.map((analysis, index) => (
            <div
              key={`analysis-${analysis.id}`}
              ref={index === orderedResults.length - 1 ? setLastElementRef : null}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 ${
                index === highlightedIndex ? "bg-[#204983]/10" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-[#204983]" />
                <div>
                  <div className="font-medium text-sm">{analysis.name}</div>
                  <div className="text-xs text-gray-500">
                    Código: {analysis.code || "N/A"} | UB: {analysis.bio_unit}
                  </div>
                </div>
                {analysis.is_urgent && (
                  <Badge variant="destructive" className="text-xs">
                    Urgente
                  </Badge>
                )}
                {analysis.is_module && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                    Módulo
                  </Badge>
                )}
                {analysis.is_obsolete && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
                    En desuso
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddAnalysis(analysis)}
                className="border-[#204983] text-[#204983] hover:bg-[#204983] hover:text-white"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {isLoadingMore && (
            <div className="flex items-center justify-center p-3 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#204983] mr-2" />
              Cargando más análisis...
            </div>
          )}

          {!hasMore && filteredResults.length > 0 && (
            <div className="text-center p-2 text-xs text-gray-400">No hay más resultados</div>
          )}
        </div>
      )}

      {showResults && searchTerm && filteredResults.length === 0 && !isSearching && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
          <TestTube className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No se encontraron análisis para "{searchTerm}"</p>
        </div>
      )}
    </div>
  )
}
