"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Receipt,
  DollarSign,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  Plus,
  Search,
  X,
  Building2,
  TrendingUp,
} from "lucide-react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Card, CardContent } from "../ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Badge } from "../ui/badge"
import { useApi } from "../../hooks/use-api"
import { toast } from "sonner"
import { BILLING_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import type { Invoice, ProtocolToBill, BillingSummary } from "@/types"

type ActiveTab = "to-bill" | "invoices"

export default function FacturacionPage() {
  const { apiRequest } = useApi()

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>("to-bill")

  // Summary stats
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)

  // Protocols to bill
  const [protocolsToBill, setProtocolsToBill] = useState<ProtocolToBill[]>([])
  const [loadingProtocols, setLoadingProtocols] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState<number | null>(null)

  // Invoices
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [invoiceFilter, setInvoiceFilter] = useState<string>("all")
  const [invoiceSearch, setInvoiceSearch] = useState("")

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [editForm, setEditForm] = useState({
    invoice_number: "",
    is_paid: false,
    paid_date: "",
    notes: "",
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true)
      const response = await apiRequest(BILLING_ENDPOINTS.SUMMARY)
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error("Error fetching billing summary:", error)
    } finally {
      setLoadingSummary(false)
    }
  }, [apiRequest])

  // Fetch protocols to bill
  const fetchProtocolsToBill = useCallback(async () => {
    try {
      setLoadingProtocols(true)
      const response = await apiRequest(BILLING_ENDPOINTS.PROTOCOLS_TO_BILL)
      if (response.ok) {
        const data = await response.json()
        setProtocolsToBill(data.results || data)
      }
    } catch (error) {
      console.error("Error fetching protocols to bill:", error)
    } finally {
      setLoadingProtocols(false)
    }
  }, [apiRequest])

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    try {
      setLoadingInvoices(true)
      let url = BILLING_ENDPOINTS.INVOICES
      const params = new URLSearchParams()
      if (invoiceFilter === "paid") params.append("is_paid", "true")
      if (invoiceFilter === "unpaid") params.append("is_paid", "false")
      if (params.toString()) url = `${url}?${params.toString()}`

      const response = await apiRequest(url)
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.results || data)
      }
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setLoadingInvoices(false)
    }
  }, [apiRequest, invoiceFilter])

  // Initial load
  useEffect(() => {
    fetchSummary()
  }, [])

  useEffect(() => {
    if (activeTab === "to-bill") {
      fetchProtocolsToBill()
    } else {
      fetchInvoices()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === "invoices") {
      fetchInvoices()
    }
  }, [invoiceFilter])

  // Create invoice for protocol
  const handleCreateInvoice = async (protocolId: number) => {
    setCreatingInvoice(protocolId)
    try {
      const response = await apiRequest(BILLING_ENDPOINTS.CREATE_FOR_PROTOCOL(protocolId), {
        method: "POST",
      })
      if (response.ok) {
        toast.success("Factura creada exitosamente", { duration: TOAST_DURATION })
        fetchProtocolsToBill()
        fetchSummary()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "Error al crear la factura")
      }
    } catch (error) {
      console.error("Error creating invoice:", error)
      const message = error instanceof Error ? error.message : "Error al crear la factura"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setCreatingInvoice(null)
    }
  }

  // Open edit dialog
  const handleOpenEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setEditForm({
      invoice_number: invoice.invoice_number || "",
      is_paid: invoice.is_paid,
      paid_date: invoice.paid_date || "",
      notes: invoice.notes || "",
    })
    setEditDialogOpen(true)
  }

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingInvoice) return
    setIsSavingEdit(true)
    try {
      const updateData: Record<string, unknown> = {}
      if (editForm.invoice_number !== (editingInvoice.invoice_number || "")) {
        updateData.invoice_number = editForm.invoice_number
      }
      if (editForm.is_paid !== editingInvoice.is_paid) {
        updateData.is_paid = editForm.is_paid
      }
      if (editForm.paid_date !== (editingInvoice.paid_date || "")) {
        updateData.paid_date = editForm.paid_date || null
      }
      if (editForm.notes !== (editingInvoice.notes || "")) {
        updateData.notes = editForm.notes
      }

      if (Object.keys(updateData).length === 0) {
        toast.info("No hay cambios para guardar", { duration: TOAST_DURATION })
        setEditDialogOpen(false)
        return
      }

      const response = await apiRequest(BILLING_ENDPOINTS.INVOICE_DETAIL(editingInvoice.id), {
        method: "PATCH",
        body: updateData,
      })

      if (response.ok) {
        toast.success("Factura actualizada exitosamente", { duration: TOAST_DURATION })
        setEditDialogOpen(false)
        fetchInvoices()
        fetchSummary()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "Error al actualizar la factura")
      }
    } catch (error) {
      console.error("Error updating invoice:", error)
      const message = error instanceof Error ? error.message : "Error al actualizar la factura"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Delete invoice
  const handleDeleteInvoice = async () => {
    if (!deletingInvoice) return
    setIsDeleting(true)
    try {
      const response = await apiRequest(BILLING_ENDPOINTS.INVOICE_DETAIL(deletingInvoice.id), {
        method: "DELETE",
      })

      if (response.status === 204 || response.ok) {
        toast.success("Factura eliminada exitosamente", { duration: TOAST_DURATION })
        setDeleteDialogOpen(false)
        setDeletingInvoice(null)
        fetchInvoices()
        fetchSummary()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "Error al eliminar la factura")
      }
    } catch (error) {
      console.error("Error deleting invoice:", error)
      const message = error instanceof Error ? error.message : "Error al eliminar la factura"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter invoices by search term
  const filteredInvoices = invoices.filter((inv) => {
    if (!invoiceSearch.trim()) return true
    const term = invoiceSearch.toLowerCase()
    return (
      inv.protocol_id.toString().includes(term) ||
      inv.insurance_name.toLowerCase().includes(term) ||
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(term))
    )
  })

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value
    return isNaN(num) ? "$0.00" : `$${num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="w-full max-w-full mx-auto py-4 px-4">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Facturacion</h1>
        <p className="text-sm text-gray-500 mt-1">Gestion de facturas y protocolos por facturar</p>
      </div>

      {/* Stats Cards */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-red-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-red-700">Adeudado Total</p>
                  <p className="text-lg sm:text-2xl font-bold text-red-600">
                    {loadingSummary ? (
                      <span className="animate-pulse bg-red-200 h-6 w-20 rounded inline-block" />
                    ) : (
                      formatCurrency(summary?.adeudado_total || 0)
                    )}
                  </p>
                </div>
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-blue-700">Facturado OOSS</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600">
                    {loadingSummary ? (
                      <span className="animate-pulse bg-blue-200 h-6 w-20 rounded inline-block" />
                    ) : (
                      formatCurrency(summary?.dinero_facturado_ooss || 0)
                    )}
                  </p>
                </div>
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-green-700">Facturado Particular</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">
                    {loadingSummary ? (
                      <span className="animate-pulse bg-green-200 h-6 w-20 rounded inline-block" />
                    ) : (
                      formatCurrency(summary?.dinero_facturado_particular || 0)
                    )}
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-teal-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-teal-700">Por Facturar</p>
                  <p className="text-lg sm:text-2xl font-bold text-teal-600">
                    {loadingSummary ? (
                      <span className="animate-pulse bg-teal-200 h-6 w-20 rounded inline-block" />
                    ) : (
                      summary?.protocolos_por_facturar || 0
                    )}
                  </p>
                </div>
                <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-teal-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top OOSS */}
        {summary?.ooss_top_facturacion && summary.ooss_top_facturacion.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">Top Obras Sociales por Facturacion</p>
            <div className="flex flex-wrap gap-2">
              {summary.ooss_top_facturacion.map((ooss, index) => (
                <Badge key={index} variant="secondary" className="bg-gray-100 text-gray-700 text-xs">
                  {ooss.insurance_name}: {formatCurrency(ooss.total)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md mb-4 md:mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("to-bill")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "to-bill"
                ? "text-[#204983] border-b-2 border-[#204983] bg-blue-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Protocolos por Facturar
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "invoices"
                ? "text-[#204983] border-b-2 border-[#204983] bg-blue-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Receipt className="h-4 w-4 inline mr-2" />
            Facturas
          </button>
        </div>

        <div className="p-4 md:p-6">
          {/* Tab: Protocolos por Facturar */}
          {activeTab === "to-bill" && (
            <div>
              {loadingProtocols ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 text-[#204983] animate-spin" />
                </div>
              ) : protocolsToBill.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">
                    No hay protocolos pendientes de facturacion
                  </h3>
                  <p className="text-sm text-gray-500">Todos los protocolos han sido facturados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {protocolsToBill.map((protocol) => (
                    <div
                      key={protocol.protocol_id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-teal-300 transition-colors gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800">
                            Protocolo #{protocol.protocol_id}
                          </span>
                          <Badge variant="secondary" className="bg-teal-100 text-teal-700 text-xs">
                            {protocol.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span>
                            {protocol.patient.first_name} {protocol.patient.last_name}
                          </span>
                          <span className="text-gray-400">|</span>
                          <span>{protocol.insurance.name}</span>
                          <span className="text-gray-400">|</span>
                          <span>
                            {protocol.total_ub_authorized} UB
                          </span>
                        </div>
                        <p className="text-sm font-medium text-teal-700 mt-1">
                          Estimado: {formatCurrency(protocol.estimated_amount)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-[#204983] w-full sm:w-auto"
                        disabled={creatingInvoice === protocol.protocol_id}
                        onClick={() => handleCreateInvoice(protocol.protocol_id)}
                      >
                        {creatingInvoice === protocol.protocol_id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1" />
                        )}
                        Crear Factura
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Facturas */}
          {activeTab === "invoices" && (
            <div>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por protocolo, obra social o nro factura..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="pl-10 pr-8"
                  />
                  {invoiceSearch && (
                    <button
                      onClick={() => setInvoiceSearch("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Estado de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="paid">Pagadas</SelectItem>
                    <SelectItem value="unpaid">No pagadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loadingInvoices ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 text-[#204983] animate-spin" />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">No se encontraron facturas</h3>
                  <p className="text-sm text-gray-500">
                    {invoiceSearch || invoiceFilter !== "all"
                      ? "Intenta ajustar los filtros"
                      : "Aun no hay facturas registradas"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800">
                            Protocolo #{invoice.protocol_id}
                          </span>
                          {invoice.is_paid ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Pagada
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              No pagada
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span>{invoice.insurance_name}</span>
                          {invoice.invoice_number && (
                            <>
                              <span className="text-gray-400">|</span>
                              <span>Nro: {invoice.invoice_number}</span>
                            </>
                          )}
                          <span className="text-gray-400">|</span>
                          <span>{invoice.total_ub_billed} UB</span>
                          <span className="text-gray-400">|</span>
                          <span className="font-medium text-gray-800">
                            {formatCurrency(invoice.total_amount)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-1">
                          <span>
                            Creada:{" "}
                            {new Date(invoice.created_at).toLocaleDateString("es-AR")}
                          </span>
                          {invoice.paid_date && (
                            <span>
                              Pagada:{" "}
                              {new Date(invoice.paid_date).toLocaleDateString("es-AR")}
                            </span>
                          )}
                          {invoice.notes && (
                            <span className="text-gray-500 italic truncate max-w-[200px]" title={invoice.notes}>
                              {invoice.notes}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(invoice)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setDeletingInvoice(invoice)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Invoice Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Factura</DialogTitle>
            <DialogDescription>
              Protocolo #{editingInvoice?.protocol_id} - {editingInvoice?.insurance_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Numero de Factura
              </label>
              <Input
                value={editForm.invoice_number}
                onChange={(e) => setEditForm((prev) => ({ ...prev, invoice_number: e.target.value }))}
                placeholder="Ej: A-0001-00001234"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Pagada</label>
              <button
                type="button"
                onClick={() =>
                  setEditForm((prev) => ({
                    ...prev,
                    is_paid: !prev.is_paid,
                    paid_date: !prev.is_paid ? new Date().toISOString().slice(0, 10) : "",
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  editForm.is_paid ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    editForm.is_paid ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {editForm.is_paid && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Fecha de Pago
                </label>
                <Input
                  type="date"
                  value={editForm.paid_date}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, paid_date: e.target.value }))}
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Notas</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#204983] focus:border-transparent"
                rows={3}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#204983]"
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
            >
              {isSavingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Factura</DialogTitle>
            <DialogDescription>
              Esta seguro que desea eliminar la factura del protocolo #{deletingInvoice?.protocol_id}?
              Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInvoice}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
