import { useState } from "react"
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { OssBreakdownCard } from "./oss-breakdown-card"
import type { BillingEntity, Presentation } from "../mock-data"

const formatCurrency = (value: number | null) =>
  value == null
    ? "—"
    : value.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2 })

const statusBadge = {
  cerrada: { label: "Cerrada, esperando cobro", className: "border-amber-200 bg-amber-50 text-amber-700" },
  cobrada: { label: "Cobrada", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  abierta: { label: "Abierta", className: "border-blue-200 bg-blue-50 text-blue-700" },
} as const

interface PresentationHistoryCardProps {
  presentation: Presentation
  entity: BillingEntity
  onSaveUbValue: (presentationId: number, ossId: number, value: number) => Promise<void>
  onSaveCollected: (presentationId: number, ossId: number, value: number) => Promise<void>
  onSaveCollectedTotal: (presentationId: number, value: number) => Promise<void>
}

/**
 * Presentación cerrada: acá se carga (y se puede editar en cualquier momento,
 * no es de una sola vez) el valor UB de cada OOSS y lo cobrado — antes de
 * cerrar todavía no se sabe ninguno de los dos.
 */
export function PresentationHistoryCard({
  presentation,
  entity,
  onSaveUbValue,
  onSaveCollected,
  onSaveCollectedTotal,
}: PresentationHistoryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [collectedTotalDraft, setCollectedTotalDraft] = useState("")
  const [savingTotal, setSavingTotal] = useState(false)

  const totalExpected = presentation.ossBreakdown.reduce((sum, o) => sum + (o.expectedAmount ?? 0), 0)
  const totalCollected =
    presentation.collectedTotal ??
    (presentation.ossBreakdown.every((o) => o.collectedAmount != null)
      ? presentation.ossBreakdown.reduce((sum, o) => sum + (o.collectedAmount ?? 0), 0)
      : null)
  const difference = totalCollected != null && totalExpected > 0 ? totalCollected - totalExpected : null

  const badge = statusBadge[presentation.status]

  const handleSaveTotal = async () => {
    const parsed = Number.parseFloat(collectedTotalDraft)
    if (Number.isNaN(parsed) || parsed < 0) return
    setSavingTotal(true)
    try {
      await onSaveCollectedTotal(presentation.id, parsed)
      setCollectedTotalDraft("")
    } finally {
      setSavingTotal(false)
    }
  }

  return (
    <div className={cn("rounded-lg border bg-white transition-colors", expanded ? "border-[#204983]/40" : "border-gray-200")}>
      <button type="button" className="w-full p-3 text-left" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-800">{presentation.label}</p>
            <p className="text-xs text-gray-500">
              {presentation.periodStart} a {presentation.periodEnd}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px]", badge.className)}>
              {badge.label}
            </Badge>
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md bg-gray-50 px-2 py-1.5">
            <p className="text-gray-500">Esperado (OOSS)</p>
            <p className="font-semibold text-gray-800">{formatCurrency(totalExpected || null)}</p>
          </div>
          <div className="rounded-md bg-gray-50 px-2 py-1.5">
            <p className="text-gray-500">Cobrado (OOSS)</p>
            <p className="font-semibold text-gray-800">{formatCurrency(totalCollected)}</p>
          </div>
          <div className={cn("rounded-md px-2 py-1.5", difference == null ? "bg-gray-50" : Math.abs(difference) < 0.01 ? "bg-emerald-50" : "bg-red-50")}>
            <p className="text-gray-500">Diferencia</p>
            <p className={cn("flex items-center gap-1 font-semibold", difference == null ? "text-gray-800" : Math.abs(difference) < 0.01 ? "text-emerald-700" : "text-red-700")}>
              {difference != null && (Math.abs(difference) < 0.01 ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />)}
              {formatCurrency(difference)}
            </p>
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-400">
          Particular en el período: <span className="font-medium text-gray-600">{formatCurrency(presentation.particularAmount)}</span> (no se factura a {entity.name})
        </p>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-gray-100 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {presentation.ossBreakdown.map((o) => (
              <OssBreakdownCard
                key={o.ossId}
                entry={o}
                showCollectedInput={entity.reportsBreakdownByOoss}
                onSaveUbValue={(ossId, value) => onSaveUbValue(presentation.id, ossId, value)}
                onSaveCollected={
                  entity.reportsBreakdownByOoss ? (ossId, value) => onSaveCollected(presentation.id, ossId, value) : undefined
                }
              />
            ))}
          </div>

          {!entity.reportsBreakdownByOoss && (
            <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
              <p className="text-sm font-semibold text-gray-800">Depósito total de {entity.name}</p>
              <p className="text-xs text-gray-500">Esta entidad no discrimina el cobro por OOSS: se carga un único monto.</p>
              <div className="mt-2 flex items-center gap-2">
                <Label htmlFor={`collected-total-${presentation.id}`} className="sr-only">
                  Monto total depositado
                </Label>
                <Input
                  id={`collected-total-${presentation.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={presentation.collectedTotal != null ? `Actual: ${presentation.collectedTotal}` : "Monto total depositado"}
                  className="h-8 max-w-[220px] text-xs"
                  value={collectedTotalDraft}
                  onChange={(e) => setCollectedTotalDraft(e.target.value)}
                />
                <Button size="sm" className="h-8 bg-[#204983]" disabled={savingTotal || !collectedTotalDraft} onClick={handleSaveTotal}>
                  {savingTotal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          )}

          {presentation.differenceReason && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <strong>Motivo de la diferencia:</strong> {presentation.differenceReason}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
