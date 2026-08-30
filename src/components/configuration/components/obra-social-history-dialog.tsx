"use client"

import { ObjectHistoryDialog } from "@/components/common/object-history-dialog"
import { MEDICAL_ENDPOINTS } from "@/config/api"

interface ObraSocialHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  obraSocialId: number | null
  obraSocialName: string
}

export function ObraSocialHistoryDialog({
  open,
  onOpenChange,
  obraSocialId,
  obraSocialName,
}: ObraSocialHistoryDialogProps) {
  return (
    <ObjectHistoryDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Historial de Cambios - ${obraSocialName}`}
      timelineEndpoint={obraSocialId ? MEDICAL_ENDPOINTS.INSURANCE_AUDIT_TIMELINE(obraSocialId) : null}
      detailEndpoint={obraSocialId ? MEDICAL_ENDPOINTS.INSURANCE_DETAIL(obraSocialId) : null}
      availableCategories={["insurance", "protocol", "payment", "system"]}
      emptyMessage="Sin historial de cambios para esta obra social"
    />
  )
}
