"use client"

import { TestTube, X, Package } from "lucide-react"
import { Button } from "../../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card"
import { Badge } from "../../ui/badge"
import { Switch } from "../../ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table"
import { toast } from "sonner"
import type { SelectedAnalysis, Insurance, QuoteDetail } from "../../../types"
import { ListaOrdenable } from "@/components/common/lista-ordenable"

interface AnalysisTableProps {
  selectedAnalyses: SelectedAnalysis[]
  onAnalysisChange: (analyses: SelectedAnalysis[]) => void
  selectedInsurance: Insurance | null
  isPrivateInsurance?: boolean
  forcePrivateAnalyses?: boolean
  /** Cotización del backend por análisis (nomenclador correcto). */
  quoteById?: Record<number, QuoteDetail>
}

export function AnalysisTable({
  selectedAnalyses,
  onAnalysisChange,
  selectedInsurance,
  isPrivateInsurance = false,
  forcePrivateAnalyses = false,
  quoteById,
}: AnalysisTableProps) {
  const handleRemoveAnalysis = (analysisId: number) => {
    const analysis = selectedAnalyses.find((a) => a.id === analysisId)
    onAnalysisChange(selectedAnalyses.filter((a) => a.id !== analysisId))
    if (analysis) {
      toast.success(`Análisis "${analysis.name}" removido`)
    }
  }

  const handleToggleAuthorization = (analysisId: number) => {
    onAnalysisChange(
      selectedAnalyses.map((analysis) =>
        analysis.id === analysisId ? { ...analysis, is_authorized: !analysis.is_authorized } : analysis,
      ),
    )
  }

  // ¿Este análisis lo paga el paciente (particular) en este protocolo?
  const isParticular = (analysis: SelectedAnalysis) =>
    isPrivateInsurance || forcePrivateAnalyses || !analysis.is_authorized

  // ¿A ESTE análisis se le descontó por superar el tope de UB de la obra social?
  // El descuento es por análisis, no por protocolo: quien lo mira tiene que
  // poder ver cuál de las prácticas sale menos, y por qué.
  const descuentoDe = (analysis: SelectedAnalysis): number =>
    Number.parseFloat(quoteById?.[analysis.id]?.descuento || "0") || 0

  // ¿Este análisis se cobra a precio fijo en vez de por UB?
  //
  // Solo del lado del paciente: uno cubierto por la obra social se le presenta
  // por nomenclador, y ahí la UB sigue siendo la que corresponde mostrar.
  const aPrecioFijo = (analysis: SelectedAnalysis): boolean =>
    isParticular(analysis) && Boolean(quoteById?.[analysis.id]?.precio_fijo)

  // Cantidad de UB a mostrar: la del nomenclador correcto (cotización) según si
  // es particular (private_ub) o lo cubre la OOSS (insurance_ub).
  //
  // Con precio fijo no hay UB que mostrar: el análisis puede no tener ninguna,
  // y si la tiene, no es la que se cobró. Un número ahí se lee como si hubiera
  // participado del precio.
  const ubFor = (analysis: SelectedAnalysis): string => {
    if (aPrecioFijo(analysis)) return "—"
    const q = quoteById?.[analysis.id]
    if (q) return (isParticular(analysis) ? q.private_ub : q.insurance_ub ?? q.private_ub) ?? "—"
    return analysis.bio_unit
  }

  const calculatePrice = (analysis: SelectedAnalysis): number => {
    // Preferimos la cotización del backend (nomenclador correcto del particular).
    const q = quoteById?.[analysis.id]
    if (q) return Number.parseFloat(q.patient_amount) || 0
    // Fallback local mientras carga la cotización.
    if (!selectedInsurance) return 0
    const ub = Number.parseFloat(analysis.bio_unit) || 0
    if (isPrivateInsurance || forcePrivateAnalyses) {
      return ub * (selectedInsurance.private_ub_value || 0)
    }
    if (analysis.is_authorized) {
      return ub * (Number.parseFloat(selectedInsurance.ub_value) || 0)
    }
    return ub * (selectedInsurance.private_ub_value || 0)
  }

  const totalUb = selectedAnalyses.reduce((sum, a) => sum + (Number.parseFloat(ubFor(a)) || 0), 0)
  const conPrecioFijo = selectedAnalyses.filter(aPrecioFijo).length
  const conDescuento = selectedAnalyses.filter((a) => descuentoDe(a) > 0).length
  const authorizedCount = isPrivateInsurance || forcePrivateAnalyses ? 0 : selectedAnalyses.filter((a) => a.is_authorized).length

  return (
    <div className="space-y-4">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center justify-between text-[#204983] text-base sm:text-lg">
            <div className="flex items-center gap-2">
              <TestTube className="h-4 w-4 sm:h-5 sm:w-5 text-[#204983]" />
              Análisis Seleccionados ({selectedAnalyses.length})
            </div>
            {selectedAnalyses.length > 0 && !isPrivateInsurance && (
              <div className="flex gap-2 text-xs font-normal">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {authorizedCount} cubiertos OOSS
                </Badge>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  {selectedAnalyses.length - authorizedCount} particulares
                </Badge>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {selectedAnalyses.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <Package className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm sm:text-base">No hay análisis seleccionados</p>
              <p className="text-xs sm:text-sm">Busque y agregue análisis usando el buscador</p>
            </div>
          ) : (
            <div>
              {/* Mobile: Card layout */}
              <div className="md:hidden space-y-3">
                <ListaOrdenable
                  items={selectedAnalyses}
                  getId={(a) => a.id}
                  onReorder={onAnalysisChange}
                >
                  {(analysis, manija) => (
                  <div
                    className="border rounded-lg p-3 bg-gray-50/50 relative mb-3"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="shrink-0 pt-0.5">{manija}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight break-words">
                          {analysis.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {analysis.code || "N/A"}
                          </Badge>
                          {analysis.is_urgent ? (
                            <Badge variant="destructive" className="text-xs">
                              Urgente
                            </Badge>
                          ) : null}
                          {analysis.is_obsolete && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
                              En desuso
                            </Badge>
                          )}
                          {descuentoDe(analysis) > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 text-xs"
                              title="Supera el tope de UB de la obra social: de este análisis se cobra una parte"
                            >
                              Con descuento
                            </Badge>
                          )}
                          {aPrecioFijo(analysis) && (
                            <Badge
                              variant="outline"
                              className="bg-sky-50 text-sky-700 text-xs"
                              title="Se cobra a un precio cargado en el análisis, no por UB"
                            >
                              Precio fijo
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAnalysis(analysis.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                      <span>UB: <strong>{ubFor(analysis)}</strong></span>
                      {selectedInsurance && (
                        <span>
                          Precio:{" "}
                          <strong
                            className={
                              !isPrivateInsurance && !forcePrivateAnalyses && analysis.is_authorized
                                ? "text-green-600"
                                : "text-orange-600"
                            }
                          >
                            ${calculatePrice(analysis).toFixed(2)}
                          </strong>
                        </span>
                      )}
                      {!isPrivateInsurance && (
                        <div className="flex items-center gap-1.5">
                          <span>Cubre OOSS:</span>
                          <Switch
                            checked={!forcePrivateAnalyses && analysis.is_authorized}
                            disabled={forcePrivateAnalyses}
                            onCheckedChange={() =>
                              handleToggleAuthorization(analysis.id)
                            }
                            className="data-[state=checked]:bg-green-500 scale-75"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </ListaOrdenable>
              </div>

              {/* Desktop: Table layout */}
              <div className="hidden md:block overflow-x-hidden">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="text-xs lg:text-sm">Análisis</TableHead>
                      <TableHead className="text-xs lg:text-sm text-center whitespace-nowrap w-20 lg:w-24">Código</TableHead>
                      <TableHead className="text-xs lg:text-sm text-center w-12 lg:w-16">UB</TableHead>
                      {!isPrivateInsurance && (
                        <TableHead className="text-xs lg:text-sm text-center w-16 lg:w-24">OOSS</TableHead>
                      )}
                      {selectedInsurance && (
                        <TableHead className="text-xs lg:text-sm text-right w-16 lg:w-24">Precio</TableHead>
                      )}
                      <TableHead className="text-xs lg:text-sm text-center w-14 lg:w-20">Urg.</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <ListaOrdenable
                      items={selectedAnalyses}
                      getId={(a) => a.id}
                      onReorder={onAnalysisChange}
                      as="tr"
                    >
                      {(analysis, manija) => (
                        <>
                        <TableCell className="w-8 p-2 align-top">{manija}</TableCell>
                        <TableCell className="font-medium text-xs lg:text-sm p-2 align-top">
                          <div className="leading-tight break-words whitespace-normal">
                            {analysis.name}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {analysis.is_obsolete && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 text-[10px]">
                                En desuso
                              </Badge>
                            )}
                            {descuentoDe(analysis) > 0 && (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 text-[10px]"
                                title="Supera el tope de UB de la obra social: de este análisis se cobra una parte"
                              >
                                Con descuento
                              </Badge>
                            )}
                            {aPrecioFijo(analysis) && (
                              <Badge
                                variant="outline"
                                className="bg-sky-50 text-sky-700 text-[10px]"
                                title="Se cobra a un precio cargado en el análisis, no por UB"
                              >
                                Precio fijo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center p-2 align-top">
                          <Badge variant="outline" className="font-mono text-[10px] lg:text-xs">
                            {analysis.code || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs lg:text-sm p-2 align-top">
                          {ubFor(analysis)}
                        </TableCell>
                        {!isPrivateInsurance && (
                          <TableCell className="text-center p-2 align-top">
                            <Switch
                              checked={!forcePrivateAnalyses && analysis.is_authorized}
                              disabled={forcePrivateAnalyses}
                              onCheckedChange={() => handleToggleAuthorization(analysis.id)}
                              className="data-[state=checked]:bg-green-500 scale-90"
                            />
                          </TableCell>
                        )}
                        {selectedInsurance && (
                          <TableCell className="text-right p-2 align-top">
                            <span
                              className={`text-xs lg:text-sm font-medium ${
                              !isPrivateInsurance && !forcePrivateAnalyses && analysis.is_authorized ? "text-green-600" : "text-orange-600"
                              }`}
                            >
                              ${calculatePrice(analysis).toFixed(2)}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="text-center p-2 align-top">
                          {analysis.is_urgent ? (
                            <Badge variant="destructive" className="text-[10px] lg:text-xs px-1.5">
                              Sí
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] lg:text-xs px-1.5">
                              No
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="p-1 align-top">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAnalysis(analysis.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                        </>
                      )}
                    </ListaOrdenable>
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 pt-4 border-t flex flex-wrap justify-between items-center gap-2 text-sm">
                <span className="text-gray-600">
                  Total UB: <strong className="text-[#204983]">{totalUb.toFixed(2)}</strong>
                </span>
                {conDescuento > 0 && (
                  <span className="text-xs text-emerald-700">
                    {conDescuento === 1
                      ? "1 análisis supera el tope de UB y se cobra en parte"
                      : `${conDescuento} análisis superan el tope de UB y se cobran en parte`}
                  </span>
                )}
                {conPrecioFijo > 0 && (
                  // Sin este cartel, el total de UB parece que le falta algo:
                  // hay análisis en la lista que no aportan ninguna.
                  <span className="text-xs text-sky-700">
                    {conPrecioFijo === 1
                      ? "1 análisis se cobra a precio fijo y no suma UB"
                      : `${conPrecioFijo} análisis se cobran a precio fijo y no suman UB`}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
