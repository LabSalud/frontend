"use client"
import { useState, useEffect } from "react"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card"
import { Badge } from "../../ui/badge"
import { Checkbox } from "../../ui/checkbox"
import { Search, TestTube, X } from "lucide-react"
import { useApi } from "../../../hooks/use-api"
import { toast } from "sonner"
import type { Analysis } from "../../../types"
import { CATALOG_ENDPOINTS } from "@/config/api"
import { usePreciosFijos } from "@/hooks/use-precios-fijos"

interface AnalysisSelectorProps {
  selectedAnalyses: Analysis[]
  onAnalysisChange: (analyses: Analysis[]) => void
}

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export function AnalysisSelector({ selectedAnalyses, onAnalysisChange }: AnalysisSelectorProps) {
  // Ver `AnalysisSearch`: sin la función habilitada, el precio cargado no
  // cotiza nada y mostrarlo confundiría a quien arma el protocolo.
  const { habilitados: preciosFijosHabilitados } = usePreciosFijos()
  const { apiRequest } = useApi()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAnalyses()
  }, [])

  const loadAnalyses = async () => {
    try {
      setIsLoading(true)
      const analysesResponse = await apiRequest(CATALOG_ENDPOINTS.ANALYSIS)
      if (analysesResponse.ok) {
        const analysesData: PaginatedResponse<Analysis> = await analysesResponse.json()
        setAnalyses(analysesData.results)
      }
    } catch (error) {
      console.error("Error loading analyses:", error)
      toast.error("Error al cargar los análisis")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredAnalyses = analyses.filter(
    (analysis) =>
      analysis.name.toLowerCase().includes(searchTerm.toLowerCase()) || analysis.code.toString().includes(searchTerm),
  )

  const handleAnalysisToggle = (analysis: Analysis, checked: boolean) => {
    if (checked) {
      onAnalysisChange([...selectedAnalyses, analysis])
    } else {
      onAnalysisChange(selectedAnalyses.filter((a) => a.id !== analysis.id))
    }
  }

  const removeAnalysis = (analysisId: number) => {
    onAnalysisChange(selectedAnalyses.filter((a) => a.id !== analysisId))
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#204983]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Análisis Seleccionados */}
      {selectedAnalyses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TestTube className="h-5 w-5" />
              Análisis Seleccionados ({selectedAnalyses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedAnalyses.map((analysis) => (
                <Badge key={analysis.id} variant="secondary" className="flex items-center gap-1">
                  {analysis.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeAnalysis(analysis.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selector de Análisis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Search className="h-5 w-5" />
            Seleccionar Análisis
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar análisis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Análisis */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Análisis Disponibles</h4>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredAnalyses.map((analysis) => {
                const isSelected = selectedAnalyses.find((selected) => selected.id === analysis.id)

                return (
                  <div key={analysis.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      checked={!!isSelected}
                      onCheckedChange={(checked) => handleAnalysisToggle(analysis, checked as boolean)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{analysis.name}</div>
                      <div className="text-sm text-gray-500 flex flex-wrap gap-x-2">
                        <span>Código: {analysis.code}</span>
                        {preciosFijosHabilitados && analysis.cobra_precio_fijo ? (
                          <span>Precio fijo: ${analysis.precio_particular ?? "0.00"}</span>
                        ) : (
                          analysis.bio_unit && <span>Unidad: {analysis.bio_unit}</span>
                        )}
                        {analysis.is_urgent && (
                          <Badge variant="destructive" className="text-xs">
                            Urgente
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {filteredAnalyses.length === 0 && (
                <div className="text-center py-4 text-gray-500">No se encontraron análisis</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
