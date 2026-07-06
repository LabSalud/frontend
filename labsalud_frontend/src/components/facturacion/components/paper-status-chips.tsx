import { Check, Clock, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PaperStatus } from "../mock-data"

interface PaperChipProps {
  label: string
  status: PaperStatus
}

function PaperChip({ label, status }: PaperChipProps) {
  if (status === "no_aplica") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-400">
        <Minus className="h-3 w-3" />
        {label}
      </span>
    )
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        status === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
      )}
    >
      {status === "ok" ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {label}
    </span>
  )
}

interface PaperStatusChipsProps {
  papers: { orden: PaperStatus; preauth: PaperStatus; resumen: PaperStatus }
}

/**
 * Checklist visual de los 3 papeles físicos que puede pedir una OOSS: orden,
 * preautorización (si aplica) y resumen de resultados. Es solo informativo —
 * no bloquea el marcar como facturado, la bioquímica decide con sus propios
 * papeles en mano.
 */
export function PaperStatusChips({ papers }: PaperStatusChipsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      <PaperChip label="Orden" status={papers.orden} />
      <PaperChip label="Preautorización" status={papers.preauth} />
      <PaperChip label="Resumen" status={papers.resumen} />
    </div>
  )
}
