import { AlertCircle, Check } from "lucide-react"

interface PaperStatusChipsProps {
  /** Lista de papeles faltantes que devuelve el backend; vacía = completo. */
  missingPaperwork: string[]
}

/**
 * Checklist visual de los papeles físicos que puede pedir una OOSS (orden,
 * preautorización si aplica, resumen, etc.) — el backend decide qué falta
 * según la OOSS y el protocolo. Es solo informativo: el backend igual
 * bloquea con 400 si falta algo al intentar facturar.
 */
export function PaperStatusChips({ missingPaperwork }: PaperStatusChipsProps) {
  if (missingPaperwork.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
        <Check className="h-3 w-3" />
        Papeles completos
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1">
      {missingPaperwork.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
        >
          <AlertCircle className="h-3 w-3" />
          {item}
        </span>
      ))}
    </div>
  )
}
