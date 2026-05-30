"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, Receipt, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog"
import { Button } from "../../../ui/button"
import { Input } from "../../../ui/input"
import { Label } from "../../../ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select"
import { Skeleton } from "../../../ui/skeleton"
import { toast } from "sonner"
import { useApi } from "../../../../hooks/use-api"
import { PROTOCOL_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import type { UnplannedTransaction } from "@/types"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

interface UnplannedTransactionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  protocolId: number
  isEditable: boolean
  onChanged: () => void
}

const formatMoney = (value: string | number) => {
  const n = typeof value === "number" ? value : Number.parseFloat(value || "0")
  if (Number.isNaN(n)) return "$0.00"
  return `$${n.toFixed(2)}`
}

export function UnplannedTransactionsDialog({
  open,
  onOpenChange,
  protocolId,
  isEditable,
  onChanged,
}: UnplannedTransactionsDialogProps) {
  const { apiRequest } = useApi()
  const [items, setItems] = useState<UnplannedTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    kind: "charge" as "charge" | "payment",
    description: "",
    amount: "",
  })

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.UNPLANNED_LIST(protocolId))
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(formatApiError(errorData, "No se pudieron cargar las transacciones."))
      }
      const data: UnplannedTransaction[] = await response.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error("Error", { description: getErrorMessage(err), duration: TOAST_DURATION })
    } finally {
      setLoading(false)
    }
  }, [apiRequest, protocolId])

  useEffect(() => {
    if (open) {
      void fetchItems()
      setForm({ kind: "charge", description: "", amount: "" })
    }
  }, [open, fetchItems])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const description = form.description.trim()
    const amount = Number.parseFloat(form.amount)
    if (!description) {
      toast.error("Falta descripción", { duration: TOAST_DURATION })
      return
    }
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Monto inválido", { duration: TOAST_DURATION })
      return
    }
    try {
      setSubmitting(true)
      const response = await apiRequest(PROTOCOL_ENDPOINTS.UNPLANNED_LIST(protocolId), {
        method: "POST",
        body: { kind: form.kind, description, amount: amount.toFixed(2) },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(formatApiError(errorData, "No se pudo crear la transacción."))
      }
      toast.success("Transacción agregada", { duration: TOAST_DURATION })
      setForm({ kind: "charge", description: "", amount: "" })
      await fetchItems()
      onChanged()
    } catch (err) {
      toast.error("Error al agregar", { description: getErrorMessage(err), duration: TOAST_DURATION })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (txId: number) => {
    try {
      setDeletingId(txId)
      const response = await apiRequest(PROTOCOL_ENDPOINTS.UNPLANNED_ITEM(protocolId, txId), {
        method: "DELETE",
      })
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(formatApiError(errorData, "No se pudo eliminar la transacción."))
      }
      toast.success("Transacción eliminada", { duration: TOAST_DURATION })
      await fetchItems()
      onChanged()
    } catch (err) {
      toast.error("Error al eliminar", { description: getErrorMessage(err), duration: TOAST_DURATION })
    } finally {
      setDeletingId(null)
    }
  }

  const chargesTotal = items
    .filter((t) => t.kind === "charge")
    .reduce((acc, t) => acc + (Number.parseFloat(t.amount) || 0), 0)
  const paymentsTotal = items
    .filter((t) => t.kind === "payment")
    .reduce((acc, t) => acc + (Number.parseFloat(t.amount) || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-violet-600" />
            Pagos / cobros no contemplados — Protocolo #{protocolId}
          </DialogTitle>
          <DialogDescription>
            Cargos o pagos que no encajan en los conceptos estándar. Suman al balance y aparecen en el desglose. No se facturan a ARCA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isEditable && (
            <form onSubmit={handleAdd} className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_minmax(0,1fr)_120px]">
                <div className="space-y-1.5">
                  <Label htmlFor="unplanned-kind" className="text-xs">Tipo</Label>
                  <Select
                    value={form.kind}
                    onValueChange={(v: "charge" | "payment") => setForm((p) => ({ ...p, kind: v }))}
                  >
                    <SelectTrigger id="unplanned-kind" className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="charge">Cobro</SelectItem>
                      <SelectItem value="payment">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unplanned-desc" className="text-xs">Descripción</Label>
                  <Input
                    id="unplanned-desc"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Ej: envío a domicilio, transferencia 30/05"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unplanned-amount" className="text-xs">Monto</Label>
                  <Input
                    id="unplanned-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="0.00"
                    className="bg-white"
                  />
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-violet-600 hover:bg-violet-700">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Agregar transacción
              </Button>
            </form>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{items.length} transacción{items.length === 1 ? "" : "es"}</span>
              <span>
                Cobros: <strong className="text-rose-700">{formatMoney(chargesTotal)}</strong>
                {" · "}
                Pagos: <strong className="text-emerald-700">{formatMoney(paymentsTotal)}</strong>
              </span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="rounded-md border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
                Sin transacciones cargadas.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((tx) => (
                  <div
                    key={tx.id}
                    className={`rounded-md border p-2 ${
                      tx.kind === "charge" ? "border-rose-200 bg-rose-50/50" : "border-emerald-200 bg-emerald-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase">
                          <span
                            className={tx.kind === "charge" ? "text-rose-700" : "text-emerald-700"}
                          >
                            {tx.kind === "charge" ? "Cobro" : "Pago"}
                          </span>
                          <span className="text-gray-900">{formatMoney(tx.amount)}</span>
                        </div>
                        <p className="text-sm text-gray-800 break-words">{tx.description}</p>
                        {tx.created_by && (
                          <p className="mt-1 text-[10px] text-gray-500">
                            {tx.created_by.first_name || tx.created_by.username}
                            {tx.created_at ? ` · ${new Date(tx.created_at).toLocaleString("es-AR")}` : ""}
                          </p>
                        )}
                      </div>
                      {isEditable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-red-700 hover:bg-red-100"
                          onClick={() => handleDelete(tx.id)}
                          disabled={deletingId === tx.id}
                        >
                          {deletingId === tx.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
