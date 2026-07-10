import { useState } from "react"
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Loader2, Undo2 } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { BilledInvoice } from "../types"

const formatCurrency = (value: string | number | null) => {
  if (value == null) return "—"
  const n = typeof value === "number" ? value : Number.parseFloat(value)
  if (Number.isNaN(n)) return "—"
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface CurrentInvoicesListProps {
  invoices: BilledInvoice[]
  onUnbill: (protocolId: number) => void
  unbillingProtocolId: number | null
}

/**
 * Protocolos ya facturados en la presentación ABIERTA, agrupados por OOSS.
 * Cada uno se puede "desmarcar" (unbill) si se facturó por error — solo
 * funciona mientras la presentación siga abierta.
 */
export function CurrentInvoicesList({ invoices, onUnbill, unbillingProtocolId }: CurrentInvoicesListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [pendingUnbill, setPendingUnbill] = useState<BilledInvoice | null>(null)

  const groups = new Map<string, BilledInvoice[]>()
  for (const inv of invoices) {
    const key = inv.insurance_name || "Sin obra social"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(inv)
  }

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (invoices.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
        Todavía no se facturó ningún protocolo en esta presentación.
      </p>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {Array.from(groups.entries()).map(([insuranceName, items]) => {
          const isOpen = expanded.has(insuranceName)
          const totalUb = items.reduce((sum, i) => sum + (Number.parseFloat(i.total_ub_billed) || 0), 0)
          return (
            <div key={insuranceName} className="rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => toggle(insuranceName)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left"
              >
                <p className="font-medium text-gray-800">{insuranceName}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">
                    {items.length} protocolo{items.length === 1 ? "" : "s"} · UB total: {totalUb}
                  </p>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </button>
              {isOpen && (
                <div className="space-y-1.5 border-t border-gray-100 p-2">
                  {items.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/protocolos/${inv.protocol_id}`}
                          className="inline-flex items-center gap-1 font-mono font-semibold text-[#204983] hover:underline"
                        >
                          #{inv.protocol_id}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        <span className="text-gray-500">UB {inv.total_ub_billed} · {formatCurrency(inv.total_amount)}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-gray-500 hover:bg-red-50 hover:text-red-700"
                        disabled={unbillingProtocolId === inv.protocol_id}
                        onClick={() => setPendingUnbill(inv)}
                      >
                        {unbillingProtocolId === inv.protocol_id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Undo2 className="h-3.5 w-3.5" />
                        )}
                        Desmarcar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <AlertDialog open={pendingUnbill != null} onOpenChange={(open) => !open && setPendingUnbill(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              ¿Desmarcar el protocolo #{pendingUnbill?.protocol_id}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sale de esta presentación y vuelve a aparecer como pendiente de facturar. Se puede volver a marcar
              como facturado en cualquier momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (pendingUnbill) onUnbill(pendingUnbill.protocol_id)
                setPendingUnbill(null)
              }}
            >
              Desmarcar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
