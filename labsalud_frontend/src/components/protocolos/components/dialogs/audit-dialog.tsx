import { ProtocolHistoryDialog } from "./protocol-history-dialog"

interface AuditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  protocolId: number
  protocolNumber: number
  // Backwards-compatible props (ignored now: el timeline se carga desde el endpoint audit-timeline)
  history?: unknown
  totalChanges?: number
  isLoading?: boolean
}

export function AuditDialog({ open, onOpenChange, protocolId, protocolNumber }: AuditDialogProps) {
  return (
    <ProtocolHistoryDialog
      open={open}
      onOpenChange={onOpenChange}
      protocolId={protocolId}
      protocolNumber={protocolNumber}
    />
  )
}
