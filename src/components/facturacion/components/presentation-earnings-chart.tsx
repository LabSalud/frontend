import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDateAR } from "../format"
import type { BillingEntity, PresentationSummaryItem } from "../types"

const formatCurrency = (value: string | number | null) => {
  if (value == null) return "—"
  const n = typeof value === "number" ? value : Number.parseFloat(value)
  if (Number.isNaN(n)) return "—"
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

type RangeFilter = "todos" | "7d" | "30d" | "3m"

const RANGE_OPTIONS: { value: RangeFilter; label: string; days: number | null }[] = [
  { value: "todos", label: "Todos", days: null },
  { value: "3m", label: "Últimos 3 meses", days: 90 },
  { value: "30d", label: "Últimos 30 días", days: 30 },
  { value: "7d", label: "Últimos 7 días", days: 7 },
]

type SourceFilter = "ambos" | "ooss" | "particular"

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "ambos", label: "Ambos" },
  { value: "ooss", label: "OOSS" },
  { value: "particular", label: "Particular" },
]

const BAR_WIDTH = 68
const CHART_HEIGHT = 220

interface PresentationEarningsChartProps {
  entity: BillingEntity
  items: PresentationSummaryItem[]
}

/**
 * Un solo gráfico de barras en el tiempo: cada barra es lo ganado TOTAL en
 * esa presentación (OOSS + particular sumados y apilados en la misma barra).
 * Eje Y = dinero, eje X = tiempo (fechas). Barras de ancho fijo → si no
 * entran todas, aparece un scroll horizontal explícito. Al seleccionar una
 * barra, el panel de abajo desglosa OOSS y particular por separado.
 */
export function PresentationEarningsChart({ entity, items }: PresentationEarningsChartProps) {
  const [range, setRange] = useState<RangeFilter>("3m")
  const [source, setSource] = useState<SourceFilter>("ambos")
  const showOss = source !== "particular"
  const showParticular = source !== "ooss"

  // Más vieja a la izquierda, más reciente a la derecha.
  const ordered = useMemo(() => [...items].reverse(), [items])

  const filtered = useMemo(() => {
    const option = RANGE_OPTIONS.find((o) => o.value === range)
    if (!option?.days) return ordered
    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setDate(cutoff.getDate() - option.days)
    return ordered.filter((p) => (p.period_end ? new Date(`${p.period_end}T00:00:00`) >= cutoff : true))
  }, [ordered, range])

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const effectiveSelectedId = selectedId ?? filtered[filtered.length - 1]?.id ?? null

  const totals = useMemo(
    () =>
      filtered.map((p) => {
        const oss = Number.parseFloat(p.expected_amount) || 0
        const particular = Number.parseFloat(p.particular_amount) || 0
        return { item: p, oss, particular, total: oss + particular }
      }),
    [filtered],
  )
  // El máximo (y por lo tanto la escala del eje Y) depende de qué se está
  // mostrando: si se filtra a solo OOSS o solo particular, la barra ocupa
  // todo el alto disponible en base a esa serie, no al total combinado.
  const displayValue = (t: (typeof totals)[number]) => (source === "ooss" ? t.oss : source === "particular" ? t.particular : t.total)
  const max = Math.max(1, ...totals.map(displayValue))
  // Ticks del eje Y: 5 marcas parejas de 0 al máximo.
  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((f) => max * f)

  const selected = totals.find((t) => t.item.id === effectiveSelectedId) ?? totals[totals.length - 1]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs">
            <span className={cn("flex items-center gap-1", !showOss && "opacity-30")}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-400" />
              OOSS
            </span>
            <span className={cn("flex items-center gap-1", !showParticular && "opacity-30")}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-violet-400" />
              Particular
            </span>
          </div>
          <div className="flex gap-1 rounded-full bg-gray-100 p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRange(opt.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  range === opt.value ? "bg-[#204983] text-white shadow-sm" : "text-gray-600 hover:bg-gray-200",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <span className="text-[11px] font-medium text-gray-500">Mostrar:</span>
          <div className="flex gap-1 rounded-full bg-gray-100 p-1">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSource(opt.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  source === opt.value ? "bg-[#204983] text-white shadow-sm" : "text-gray-600 hover:bg-gray-200",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {totals.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            Sin presentaciones cerradas de {entity.name} en este rango.
          </p>
        ) : (
          <div className="flex gap-2">
            {/* Eje Y: marcas de dinero, fijo (no scrollea con las barras) */}
            <div
              className="flex shrink-0 flex-col justify-between text-right text-[10px] text-gray-400"
              style={{ height: CHART_HEIGHT }}
            >
              {yTicks.map((tick, i) => (
                <span key={i}>{formatCurrency(tick)}</span>
              ))}
            </div>

            {/* Área scrolleable: barras + eje X */}
            <div className="min-w-0 flex-1 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-gray-100">
              <div
                className="flex items-end gap-2 border-b border-l border-gray-300 pb-0 pl-1"
                style={{ height: CHART_HEIGHT, width: "max-content" }}
              >
                {totals.map(({ item, oss, particular, total }) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "flex h-full flex-none flex-col items-center justify-end rounded-t px-1 pt-1 transition-colors",
                      effectiveSelectedId === item.id ? "bg-blue-50" : "hover:bg-gray-50",
                    )}
                    style={{ width: BAR_WIDTH }}
                    title={`${item.label}: ${formatCurrency(total)}`}
                  >
                    <div className="flex w-full flex-1 flex-col-reverse items-center justify-start">
                      {showOss && <div className="w-6 rounded-b bg-blue-400" style={{ height: `${(oss / max) * 100}%` }} />}
                      {showParticular && (
                        <div className="w-6 rounded-t bg-violet-400" style={{ height: `${(particular / max) * 100}%` }} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {/* Eje X: fechas */}
              <div className="flex gap-2 pl-1 pt-1" style={{ width: "max-content" }}>
                {totals.map(({ item }) => (
                  <div key={item.id} className="flex-none text-center text-[9px] whitespace-nowrap text-gray-500" style={{ width: BAR_WIDTH }}>
                    {formatDateAR(item.period_end)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-800">{selected.item.label}</p>
              <p className="text-xs text-gray-500">
                {formatDateAR(selected.item.period_start)} a {formatDateAR(selected.item.period_end)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-800">Total: {formatCurrency(selected.total)}</p>
              {selected.item.balance_state && (
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1 text-[10px]",
                    selected.item.balance_state === "equilibrada"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700",
                  )}
                >
                  {selected.item.balance_state === "equilibrada" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {selected.item.balance_state === "equilibrada"
                    ? "Cobrado = esperado"
                    : `Dif. ${formatCurrency(selected.item.difference_amount)}`}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Desglose por obra social</p>
            {selected.item.expected_by_ooss.map((o) => (
              <div key={o.insurance_id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs">
                <div>
                  <p className="font-medium text-gray-800">{o.insurance_name}</p>
                  <p className="text-gray-500">{o.protocol_count} protocolo(s) · UB {o.total_ub}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500">
                    Esperado: <span className="font-semibold text-gray-800">{formatCurrency(o.expected_amount)}</span>
                  </p>
                  {o.collected_amount != null && (
                    <p className="text-gray-500">
                      Cobrado: <span className="font-semibold text-gray-800">{formatCurrency(o.collected_amount)}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
            {selected.item.expected_by_ooss.length === 0 && (
              <p className="text-xs text-gray-400">Sin facturas a OOSS en esta presentación.</p>
            )}
          </div>

          {/* Particular: aparte, no se factura a ninguna entidad */}
          <div className="mt-3 rounded-md border border-dashed border-gray-200 bg-gray-50/60 px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700">Particular en este período</p>
                <p className="text-[11px] text-gray-400">
                  No se factura a {entity.name}. A veces se factura a ARCA si el paciente pide comprobante.
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-800">{formatCurrency(selected.particular)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
