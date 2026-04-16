"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarRange, ChevronDown, ChevronUp, FileCheck2, Loader2, Receipt } from "lucide-react"
import { Button } from "../ui/button"
import { Card, CardContent } from "../ui/card"
import { Input } from "../ui/input"
import { Skeleton } from "../ui/skeleton"
import { Badge } from "../ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { useApi } from "../../hooks/use-api"
import { BILLING_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import { toast } from "sonner"
import type { Invoice, ProtocolToBill } from "@/types"

type ActiveTab = "current" | "history"

interface CurrentTotalResponse {
  protocols_count: number
  total_ub_authorized: string
  expected_total_amount: string
  expected_by_ooss: Array<{
    insurance_id: number
    insurance_name: string
    protocols_count: number
    total_ub_authorized: string
    expected_amount: string
  }>
}

interface ClosedPresentation {
  id: number
  reference: string
  name: string
  period_start: string
  period_end: string
  invoice_count: number
  expected_amount: string
  expected_by_ooss: Array<{
    insurance_id: number
    insurance_name: string
    protocol_count: number
    expected_amount: string
  }>
  protocols?: Array<{
    protocol_id: number
    invoice_id: number
    invoice_number: string
    insurance?: {
      id: number
      name: string
    } | null
    patient?: {
      id: number
      first_name: string
      last_name: string
    } | null
    expected_amount: string
  }>
  status: "cerrada" | "cobrada"
  notes: string
  is_active: boolean
  created_by_id: number | null
  created_at: string
}

const parseMoney = (value: number | string | null | undefined): number => {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = parseFloat(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

const formatCurrency = (value: number | string | null | undefined): string => {
  const amount = parseMoney(value)
  return amount.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function FacturacionPage() {
  const { apiRequest } = useApi()

  const [activeTab, setActiveTab] = useState<ActiveTab>("current")

  const [protocolsToBill, setProtocolsToBill] = useState<ProtocolToBill[]>([])
  const [loadingProtocolsToBill, setLoadingProtocolsToBill] = useState(false)
  const [creatingInvoiceForProtocol, setCreatingInvoiceForProtocol] = useState<number | null>(null)
  const [protocolRowErrors, setProtocolRowErrors] = useState<Record<number, string>>({})

  const [currentBilled, setCurrentBilled] = useState<Invoice[]>([])
  const [loadingCurrentBilled, setLoadingCurrentBilled] = useState(false)

  const [currentTotal, setCurrentTotal] = useState<CurrentTotalResponse | null>(null)
  const [loadingCurrentTotal, setLoadingCurrentTotal] = useState(false)

  const [closedPresentations, setClosedPresentations] = useState<ClosedPresentation[]>([])
  const [loadingClosedPresentations, setLoadingClosedPresentations] = useState(false)
  const [expandedPresentationId, setExpandedPresentationId] = useState<number | null>(null)

  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [closeName, setCloseName] = useState("")
  const [closeDateTo, setCloseDateTo] = useState("")
  const [closeNotes, setCloseNotes] = useState("")
  const [closingPresentation, setClosingPresentation] = useState(false)

  const fetchProtocolsToBill = useCallback(async () => {
    try {
      setLoadingProtocolsToBill(true)
      const response = await apiRequest(BILLING_ENDPOINTS.PROTOCOLS_TO_BILL)
      if (!response.ok) return
      const data = await response.json()
      setProtocolsToBill(data.results || data)
    } catch (error) {
      console.error("Error fetching protocols to bill:", error)
    } finally {
      setLoadingProtocolsToBill(false)
    }
  }, [apiRequest])

  const fetchCurrentBilled = useCallback(async () => {
    try {
      setLoadingCurrentBilled(true)
      const response = await apiRequest(`${BILLING_ENDPOINTS.FACTURADOS}?current=true`)
      if (!response.ok) return
      const data = await response.json()
      setCurrentBilled(data.results || data)
    } catch (error) {
      console.error("Error fetching current billed invoices:", error)
    } finally {
      setLoadingCurrentBilled(false)
    }
  }, [apiRequest])

  const fetchCurrentTotal = useCallback(async () => {
    try {
      setLoadingCurrentTotal(true)
      const response = await apiRequest(BILLING_ENDPOINTS.CURRENT_TOTAL)
      if (!response.ok) {
        setCurrentTotal(null)
        return
      }
      const data = await response.json()
      setCurrentTotal(data)
    } catch (error) {
      console.error("Error fetching current total:", error)
      setCurrentTotal(null)
    } finally {
      setLoadingCurrentTotal(false)
    }
  }, [apiRequest])

  const fetchClosedPresentations = useCallback(async () => {
    try {
      setLoadingClosedPresentations(true)
      const response = await apiRequest(BILLING_ENDPOINTS.CLOSED_PRESENTATIONS)
      if (!response.ok) return
      const data = await response.json()
      setClosedPresentations(data.results || data)
    } catch (error) {
      console.error("Error fetching closed presentations:", error)
    } finally {
      setLoadingClosedPresentations(false)
    }
  }, [apiRequest])

  const refreshCurrent = useCallback(async () => {
    await Promise.all([fetchProtocolsToBill(), fetchCurrentBilled(), fetchCurrentTotal()])
  }, [fetchProtocolsToBill, fetchCurrentBilled, fetchCurrentTotal])

  const refreshHistory = useCallback(async () => {
    await fetchClosedPresentations()
  }, [fetchClosedPresentations])

  useEffect(() => {
    if (activeTab === "current") {
      void refreshCurrent()
    } else {
      void refreshHistory()
    }
  }, [activeTab, refreshCurrent, refreshHistory])

  const currentExpectedTotal = parseMoney(currentTotal?.expected_total_amount)
  const currentProtocolsCount = currentTotal?.protocols_count ?? currentBilled.length

  const togglePresentationExpanded = (presentationId: number) => {
    setExpandedPresentationId((prev) => (prev === presentationId ? null : presentationId))
  }

  const handleCreateInvoice = async (protocolId: number) => {
    setCreatingInvoiceForProtocol(protocolId)
    setProtocolRowErrors((prev) => ({ ...prev, [protocolId]: "" }))
    try {
      const response = await apiRequest(BILLING_ENDPOINTS.CREATE_FOR_PROTOCOL(protocolId), {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "No se pudo marcar como facturado")
      }

      toast.success("Protocolo facturado y agregado a la presentación actual", { duration: TOAST_DURATION })
      setProtocolRowErrors((prev) => {
        const next = { ...prev }
        delete next[protocolId]
        return next
      })
      await refreshCurrent()
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo marcar como facturado"
      setProtocolRowErrors((prev) => ({ ...prev, [protocolId]: message }))
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setCreatingInvoiceForProtocol(null)
    }
  }

  const handleClosePresentation = async () => {
    setClosingPresentation(true)
    try {
      const payload: Record<string, string> = {}
      if (closeName.trim()) payload.name = closeName.trim()
      if (closeDateTo) payload.date_to = closeDateTo
      if (closeNotes.trim()) payload.notes = closeNotes.trim()

      const response = await apiRequest(BILLING_ENDPOINTS.CLOSE_PRESENTATION, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "No se pudo cerrar la presentación")
      }

      toast.success("Presentación cerrada correctamente", { duration: TOAST_DURATION })
      setCloseModalOpen(false)
      setCloseName("")
      setCloseDateTo("")
      setCloseNotes("")
      await Promise.all([refreshCurrent(), refreshHistory()])
      setActiveTab("history")
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cerrar la presentación"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setClosingPresentation(false)
    }
  }

  return (
    <div className="w-full max-w-full mx-auto px-4 py-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">Facturación por Presentaciones</h1>
        <p className="text-sm text-slate-500 mt-1">
          Marca protocolos facturados, consolida la presentación actual y valida montos esperados por OOSS.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4">
        <div className="grid grid-cols-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("current")}
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === "current" ? "text-[#204983] bg-blue-50 border-b-2 border-[#204983]" : "text-slate-500"
            }`}
          >
            Presentación actual
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === "history" ? "text-[#204983] bg-blue-50 border-b-2 border-[#204983]" : "text-slate-500"
            }`}
          >
            Historial de presentaciones
          </button>
        </div>

        <div className="p-4 md:p-6">
          {activeTab === "current" && (
            <div className="space-y-4">
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Protocolos facturados en presentación actual</p>
                      <p className="text-xl font-bold text-slate-800">{currentProtocolsCount}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Monto esperado total</p>
                      <p className="text-xl font-bold text-slate-800">{formatCurrency(currentExpectedTotal)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Estado</p>
                      <p className="text-sm font-semibold text-slate-800 mt-1">Presentación abierta</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-slate-800">Protocolos no facturados</p>
                    <p className="text-xs text-slate-500 mt-1">Al facturar, pasan automáticamente al contenedor de la derecha.</p>

                    {loadingProtocolsToBill ? (
                      <div className="space-y-2 mt-3">
                        {Array.from({ length: 4 }).map((_, idx) => (
                          <Skeleton key={idx} className="h-20 rounded-lg" />
                        ))}
                      </div>
                    ) : protocolsToBill.length === 0 ? (
                      <div className="text-xs text-slate-500 mt-3">No hay protocolos pendientes de facturar.</div>
                    ) : (
                      <div className="space-y-2 mt-3">
                        {protocolsToBill.map((protocol) => (
                          <div key={protocol.protocol_id} className="border border-slate-200 rounded-lg p-3 bg-white">
                            <div className="flex flex-col gap-2">
                              <div>
                                <p className="font-semibold text-slate-800">Protocolo #{protocol.protocol_id}</p>
                                <p className="text-sm text-slate-600">
                                  {protocol.patient?.first_name || ""} {protocol.patient?.last_name || ""} · {protocol.insurance?.name || "Sin OOSS"}
                                </p>
                                <p className="text-sm mt-1 text-slate-700">
                                  UB autorizadas: {protocol.total_ub_authorized} · Esperado: {formatCurrency(protocol.expected_amount ?? protocol.estimated_amount)}
                                </p>
                              </div>
                              <div className="flex flex-col items-end">
                                <Button
                                  className="bg-[#204983]"
                                  disabled={creatingInvoiceForProtocol === protocol.protocol_id}
                                  onClick={() => handleCreateInvoice(protocol.protocol_id)}
                                >
                                  {creatingInvoiceForProtocol === protocol.protocol_id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <FileCheck2 className="h-4 w-4 mr-2" />
                                  )}
                                  Facturar protocolo
                                </Button>
                                {protocolRowErrors[protocol.protocol_id] && (
                                  <p className="text-xs text-red-600 mt-1 text-right max-w-[280px]">
                                    {protocolRowErrors[protocol.protocol_id]}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-slate-800">Protocolos facturados</p>
                    <p className="text-xs text-slate-500 mt-1">Facturados en la presentación actual (current=true).</p>

                    {loadingCurrentBilled ? (
                      <div className="space-y-2 mt-3">
                        {Array.from({ length: 4 }).map((_, idx) => (
                          <Skeleton key={idx} className="h-16 rounded-lg" />
                        ))}
                      </div>
                    ) : currentBilled.length === 0 ? (
                      <div className="text-xs text-slate-500 mt-3">No hay protocolos facturados en la presentación actual.</div>
                    ) : (
                      <div className="space-y-2 mt-3">
                        {currentBilled.map((invoice) => (
                          <div key={invoice.id} className="border border-slate-200 rounded-lg p-2 text-sm">
                            <p className="font-medium text-slate-800">
                              Protocolo #{invoice.protocol_id} · {invoice.insurance_name}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Factura #{invoice.id} · Esperado {formatCurrency(invoice.total_amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-200">
                      <p className="text-sm font-semibold text-slate-700 mb-2">Esperado por OOSS</p>
                      {loadingCurrentTotal ? (
                        <Skeleton className="h-16 rounded" />
                      ) : !currentTotal || currentTotal.expected_by_ooss.length === 0 ? (
                        <p className="text-xs text-slate-500">Sin datos para mostrar.</p>
                      ) : (
                        <div className="space-y-2">
                          {currentTotal.expected_by_ooss.map((row) => (
                            <div key={`${row.insurance_id}-${row.insurance_name}`} className="border rounded p-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-slate-800">{row.insurance_name}</span>
                                <span className="font-semibold text-slate-800">{formatCurrency(row.expected_amount)}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {row.protocols_count} protocolo(s) · UB {row.total_ub_authorized}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button className="bg-[#204983]" onClick={() => setCloseModalOpen(true)}>
                  <CalendarRange className="h-4 w-4 mr-2" />
                  Cerrar facturación
                </Button>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-slate-800">Presentaciones cerradas</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Tocá una presentación para ver protocolos cerrados y detalle por OOSS.
                  </p>
                </CardContent>
              </Card>

              {loadingClosedPresentations ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : closedPresentations.length === 0 ? (
                <div className="text-sm text-slate-500 py-8 text-center border rounded-lg">No hay presentaciones cerradas.</div>
              ) : (
                <div className="space-y-2">
                  {closedPresentations.map((presentation) => (
                    <div
                      key={presentation.id}
                      className={`border rounded-lg transition-all ${
                        expandedPresentationId === presentation.id
                          ? "border-[#204983] shadow-sm bg-blue-50/20"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        className="w-full text-left p-3"
                        onClick={() => togglePresentationExpanded(presentation.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{presentation.name || presentation.reference}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              {presentation.period_start} a {presentation.period_end}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline">{presentation.status}</Badge>
                            {expandedPresentationId === presentation.id ? (
                              <ChevronUp className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 text-xs">
                          <div className="border border-slate-200 rounded-md p-2 bg-white">
                            <p className="text-slate-500">Facturas cerradas</p>
                            <p className="text-sm font-semibold text-slate-800">{presentation.invoice_count}</p>
                          </div>
                          <div className="border border-slate-200 rounded-md p-2 bg-white">
                            <p className="text-slate-500">Monto esperado</p>
                            <p className="text-sm font-semibold text-slate-800">{formatCurrency(presentation.expected_amount)}</p>
                          </div>
                          <div className="border border-slate-200 rounded-md p-2 bg-white">
                            <p className="text-slate-500">Protocolos</p>
                            <p className="text-sm font-semibold text-slate-800">{presentation.protocols?.length || 0}</p>
                          </div>
                        </div>
                      </button>

                      {expandedPresentationId === presentation.id && (
                        <div className="px-3 pb-3 border-t border-slate-200 space-y-3">
                          <div className="pt-3">
                            <p className="text-xs font-semibold text-slate-700">Protocolos de la presentación</p>
                            {!presentation.protocols || presentation.protocols.length === 0 ? (
                              <p className="text-xs text-slate-500 mt-1">Sin protocolos informados en este cierre.</p>
                            ) : (
                              <div className="space-y-2 mt-2">
                                {presentation.protocols.map((protocol) => (
                                  <div
                                    key={`${presentation.id}-${protocol.invoice_id}-${protocol.protocol_id}`}
                                    className="border border-slate-200 rounded-md p-2 bg-white"
                                  >
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                                      <p className="text-sm font-medium text-slate-800">
                                        Protocolo #{protocol.protocol_id} · Factura #{protocol.invoice_id}
                                      </p>
                                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(protocol.expected_amount)}</p>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                      {(protocol.patient?.first_name || "").trim()} {(protocol.patient?.last_name || "").trim()}
                                      {protocol.patient ? " · " : ""}
                                      {protocol.insurance?.name || "Sin obra social"}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-slate-700">Desglose esperado por OOSS</p>
                            {presentation.expected_by_ooss.length === 0 ? (
                              <p className="text-xs text-slate-500 mt-1">Sin detalle por OOSS.</p>
                            ) : (
                              <div className="space-y-2 mt-2">
                                {presentation.expected_by_ooss.map((ooss) => (
                                  <div key={`${presentation.id}-${ooss.insurance_id}`} className="border border-slate-200 rounded-md p-2 text-xs bg-white">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="font-medium text-slate-800">{ooss.insurance_name}</p>
                                      <p className="font-semibold text-slate-800">{formatCurrency(ooss.expected_amount)}</p>
                                    </div>
                                    <p className="text-slate-500 mt-1">{ooss.protocol_count} protocolo(s)</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {presentation.notes && (
                            <div className="border border-slate-200 rounded-md p-2 bg-white">
                              <p className="text-xs font-semibold text-slate-700">Observaciones del cierre</p>
                              <p className="text-xs text-slate-600 mt-1">{presentation.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar facturación</DialogTitle>
            <DialogDescription>
              Se cerrará la presentación actual con todos los protocolos facturados acumulados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Nombre de presentación (opcional)</label>
              <Input
                value={closeName}
                onChange={(e) => setCloseName(e.target.value)}
                placeholder="Ej: Presentación Marzo 2026"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Fecha de cierre (opcional)</label>
              <Input type="date" value={closeDateTo} onChange={(e) => setCloseDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Observaciones</label>
              <Input
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloseModalOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-[#204983]" onClick={handleClosePresentation} disabled={closingPresentation}>
              {closingPresentation ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}
              Confirmar cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
