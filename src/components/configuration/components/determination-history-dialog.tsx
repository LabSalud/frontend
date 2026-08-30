"use client"

import { ObjectHistoryDialog } from "@/components/common/object-history-dialog"
import { CATALOG_ENDPOINTS } from "@/config/api"

interface DeterminationHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  determinationId: number | null
  determinationName: string
}

export function DeterminationHistoryDialog({
  open,
  onOpenChange,
  determinationId,
  determinationName,
}: DeterminationHistoryDialogProps) {
  return (
    <ObjectHistoryDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Historial de Cambios - ${determinationName}`}
      timelineEndpoint={determinationId ? CATALOG_ENDPOINTS.DETERMINATION_AUDIT_TIMELINE(determinationId) : null}
      detailEndpoint={determinationId ? CATALOG_ENDPOINTS.DETERMINATION_DETAIL(determinationId) : null}
      availableCategories={["analysis", "system"]}
      emptyMessage="Sin historial de cambios para esta determinación"
    />
  )
}
