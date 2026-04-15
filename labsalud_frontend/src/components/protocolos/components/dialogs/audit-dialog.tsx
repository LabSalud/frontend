import { History } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../ui/dialog"
import { HistoryList } from "@/components/common/history-list"
import type { HistoryEntry } from "@/types"

interface AuditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  protocolId: number
  protocolNumber: number
  history?: HistoryEntry[]
  totalChanges?: number
  isLoading: boolean
}

export function AuditDialog({
  open,
  onOpenChange,
  protocolNumber,
  history,
  totalChanges,
  isLoading,
}: AuditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* // Mejor responsive */}
      <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <History className="h-5 w-5 text-[#204983] flex-shrink-0" />
            {/* // Usando protocolNumber en lugar de protocolId */}
            <span>Historial de Auditoría - Protocolo #{protocolNumber}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48 rounded" />
                    <Skeleton className="h-3 w-32 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-4">
              {totalChanges !== undefined && totalChanges > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Total de cambios: {totalChanges}</span>
                </div>
              )}
              <HistoryList history={history} emptyMessage="No hay historial disponible para este protocolo" />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay historial disponible para este protocolo
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
