import { useState } from "react"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { BillingEntity, Presentation } from "../mock-data"

const formatCurrency = (value: number | null) =>
  value == null
    ? "—"
    : value.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface PresentationEarningsChartProps {
  entity: BillingEntity
  presentations: Presentation[]
}

/**
 * Gráfico de lo ganado por presentación (esperado vs. cobrado de OOSS, en el
 * tiempo). Al elegir una barra, se ve el desglose por OOSS de esa
 * presentación y, aparte, lo cobrado a particulares en ese mismo período —
 * el particular NO se factura a ninguna entidad, se muestra solo a título
 * informativo (ocasionalmente se factura a ARCA si el paciente pide comprobante).
 */
export function PresentationEarningsChart({ entity, presentations }: PresentationEarningsChartProps) {
  const ordered = [...presentations].sort((a, b) => a.periodStart.localeCompare(b.periodStart))
  const [selectedId, setSelectedId] = useState<number | null>(ordered[ordered.length - 1]?.id ?? null)

  if (ordered.length === 0) {
    return <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">Todavía no hay presentaciones de {entity.name}.</p>
  }

  const totals = ordered.map((p) => {
    const expected = p.ossBreakdown.reduce((sum, o) => sum + (o.expectedAmount ?? 0), 0)
    const collected =
      p.collectedTotal ??
      (p.ossBreakdown.every((o) => o.collectedAmount != null) ? p.ossBreakdown.reduce((sum, o) => sum + (o.collectedAmount ?? 0), 0) : null)
    return { presentation: p, expected, collected }
  })
  const max = Math.max(1, ...totals.map((t) => Math.max(t.expected, t.collected ?? 0)))

  const selected = totals.find((t) => t.presentation.id === selectedId) ?? totals[totals.length - 1]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-400" />Esperado</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />Cobrado</span>
        </div>
        <div className="flex h-48 items-stretch gap-3 overflow-x-auto pb-1">
          {totals.map(({ presentation: p, expected, collected }) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={cn(
                "flex min-w-[70px] flex-1 flex-col items-center gap-1 rounded-md px-1 pt-1 transition-colors",
                selectedId === p.id ? "bg-blue-50" : "hover:bg-gray-50",
              )}
            >
              <div className="flex w-full flex-1 items-end justify-center gap-1">
                <div
                  className="w-3 rounded-t bg-blue-400"
                  style={{ height: `${(expected / max) * 100}%` }}
                  title={`Esperado: ${formatCurrency(expected)}`}
                />
                <div
                  className="w-3 rounded-t bg-emerald-500"
                  style={{ height: collected != null ? `${(collected / max) * 100}%` : "2px" }}
                  title={collected != null ? `Cobrado: ${formatCurrency(collected)}` : "Todavía no cobrado"}
                />
              </div>
              <span className="text-center text-[10px] leading-tight text-gray-500">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-800">{selected.presentation.label}</p>
              <p className="text-xs text-gray-500">
                {selected.presentation.periodStart} a {selected.presentation.periodEnd}
              </p>
            </div>
            {selected.collected != null && (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 text-[10px]",
                  Math.abs(selected.collected - selected.expected) < 0.01
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700",
                )}
              >
                {Math.abs(selected.collected - selected.expected) < 0.01 ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {formatCurrency(selected.collected - selected.expected)}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Desglose por obra social</p>
            {selected.presentation.ossBreakdown.map((o) => (
              <div key={o.ossId} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs">
                <div>
                  <p className="font-medium text-gray-800">{o.ossName}</p>
                  <p className="text-gray-500">{o.protocolsCount} protocolo(s) · UB {o.totalUb}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500">Esperado: <span className="font-semibold text-gray-800">{formatCurrency(o.expectedAmount)}</span></p>
                  {o.collectedAmount != null && (
                    <p className="text-gray-500">Cobrado: <span className="font-semibold text-gray-800">{formatCurrency(o.collectedAmount)}</span></p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Particular: aparte, no se factura a ninguna entidad */}
          <div className="mt-3 rounded-md border border-dashed border-gray-200 bg-gray-50/60 px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700">Particular en este período</p>
                <p className="text-[11px] text-gray-400">No se factura a {entity.name}. A veces se factura a ARCA si el paciente pide comprobante.</p>
              </div>
              <p className="text-sm font-semibold text-gray-800">{formatCurrency(selected.presentation.particularAmount)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
