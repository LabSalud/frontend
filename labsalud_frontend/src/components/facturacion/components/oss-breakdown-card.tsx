import { useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, Pencil, Save, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { OssBreakdown } from "../mock-data"

const formatCurrency = (value: number | null) =>
  value == null
    ? "—"
    : value.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface EditableAmountProps {
  label: string
  value: number | null
  placeholder: string
  onSave: (value: number) => Promise<void>
}

/** Un valor con edición inline: se muestra como texto + lápiz; al tocar el
 * lápiz aparece el input pre-cargado con el valor actual (o vacío). Se puede
 * volver a editar las veces que haga falta, no es de carga única. */
function EditableAmount({ label, value, placeholder, onSave }: EditableAmountProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  const startEditing = () => {
    setDraft(value != null ? String(value) : "")
    setEditing(true)
  }

  const handleSave = async () => {
    const parsed = Number.parseFloat(draft)
    if (Number.isNaN(parsed) || parsed < 0) return
    setSaving(true)
    try {
      await onSave(parsed)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="rounded-md bg-gray-50 px-2 py-1.5">
        <p className="text-gray-500">{label}</p>
        <div className="mt-1 flex items-center gap-1">
          <Input
            type="number"
            min="0"
            step="0.01"
            autoFocus
            placeholder={placeholder}
            className="h-7 text-xs"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button size="sm" className="h-7 w-7 shrink-0 bg-[#204983] p-0" disabled={saving || !draft} onClick={handleSave}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 shrink-0 p-0 text-gray-400" onClick={() => setEditing(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <button type="button" onClick={startEditing} className="group rounded-md bg-gray-50 px-2 py-1.5 text-left hover:bg-gray-100">
      <p className="text-gray-500">{label}</p>
      <p className="flex items-center gap-1 font-semibold text-gray-800">
        {value != null ? formatCurrency(value) : <span className="font-normal text-gray-400">Sin cargar</span>}
        <Pencil className="h-3 w-3 text-gray-300 group-hover:text-[#204983]" />
      </p>
    </button>
  )
}

interface OssBreakdownCardProps {
  entry: OssBreakdown
  /** Si la entidad informa cobro discriminado por OOSS (ej. la Clínica). Si no
   * (ej. el Centro), el cobro se carga a nivel de presentación completa. */
  showCollectedInput: boolean
  onSaveUbValue: (ossId: number, value: number) => Promise<void>
  onSaveCollected?: (ossId: number, value: number) => Promise<void>
}

/**
 * Desglose por OOSS de una presentación ya CERRADA: acá se carga (y se puede
 * volver a editar en cualquier momento) el valor UB que publicó la OOSS y lo
 * cobrado. Mientras la presentación está abierta no se muestra precio, solo
 * el resumen de protocolos (ver oss-summary-row.tsx).
 */
export function OssBreakdownCard({ entry, showCollectedInput, onSaveUbValue, onSaveCollected }: OssBreakdownCardProps) {
  const difference =
    entry.expectedAmount != null && entry.collectedAmount != null ? entry.collectedAmount - entry.expectedAmount : null

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-800">{entry.ossName}</p>
          <p className="text-xs text-gray-500">
            {entry.protocolsCount} protocolo{entry.protocolsCount === 1 ? "" : "s"} · UB total: {entry.totalUb}
          </p>
        </div>
        {difference != null && (
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 gap-1 text-[10px]",
              Math.abs(difference) < 0.01
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            {Math.abs(difference) < 0.01 ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {Math.abs(difference) < 0.01 ? "Coincide" : `Dif. ${formatCurrency(difference)}`}
          </Badge>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <EditableAmount
          label="Valor UB"
          value={entry.ubValue}
          placeholder="Valor que publicó la OOSS"
          onSave={(value) => onSaveUbValue(entry.ossId, value)}
        />
        <div className="rounded-md bg-gray-50 px-2 py-1.5">
          <p className="text-gray-500">Esperado</p>
          <p className="font-semibold text-gray-800">{formatCurrency(entry.expectedAmount)}</p>
        </div>
      </div>

      {showCollectedInput && onSaveCollected && (
        <div className="mt-2 border-t border-gray-100 pt-2 text-xs">
          <EditableAmount
            label="Cobrado"
            value={entry.collectedAmount}
            placeholder="Monto cobrado de esta OOSS"
            onSave={(value) => onSaveCollected(entry.ossId, value)}
          />
        </div>
      )}
    </div>
  )
}
