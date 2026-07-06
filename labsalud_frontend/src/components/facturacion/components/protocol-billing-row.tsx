import { AlertCircle, FileCheck2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PaperStatusChips } from "./paper-status-chips"
import type { PendingProtocol } from "../mock-data"

interface ProtocolBillingRowProps {
  protocol: PendingProtocol
  onMarkBilled: (protocolId: number) => void
  isMarking: boolean
}

const papersComplete = (papers: PendingProtocol["papers"]) =>
  Object.values(papers).every((status) => status !== "pendiente")

/**
 * Protocolo listo (o casi) para juntar papeles y facturar. El botón se
 * bloquea si falta algún papel (orden / preautorización si aplica / resumen)
 * — recién se habilita cuando el checklist está completo.
 */
export function ProtocolBillingRow({ protocol, onMarkBilled, isMarking }: ProtocolBillingRowProps) {
  const complete = papersComplete(protocol.papers)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-sm font-semibold text-[#204983]">#{protocol.protocolId}</span>
          <span className="font-medium text-gray-800">{protocol.patientName}</span>
          <span className="text-xs text-gray-500">{protocol.ossName}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <PaperStatusChips papers={protocol.papers} />
          <span className="text-xs text-gray-400">UB: {protocol.totalUb}</span>
        </div>
        {!complete && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-600">
            <AlertCircle className="h-3 w-3" />
            Faltan papeles para poder facturarlo
          </p>
        )}
      </div>
      <Button
        size="sm"
        className="shrink-0 bg-[#204983] hover:bg-[#1a3d6f]"
        disabled={isMarking || !complete}
        title={complete ? undefined : "Completá el checklist de papeles para habilitar esta acción"}
        onClick={() => onMarkBilled(protocol.protocolId)}
      >
        {isMarking ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-1.5 h-4 w-4" />}
        Marcar facturado
      </Button>
    </div>
  )
}
