"use client"

import { ObjectHistoryDialog } from "@/components/common/object-history-dialog"
import { MEDICAL_ENDPOINTS } from "@/config/api"

interface MedicoHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  medicoId: number | null
  medicoName: string
}

export function MedicoHistoryDialog({ open, onOpenChange, medicoId, medicoName }: MedicoHistoryDialogProps) {
  return (
    <ObjectHistoryDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Historial de Cambios - ${medicoName}`}
      timelineEndpoint={medicoId ? MEDICAL_ENDPOINTS.DOCTOR_AUDIT_TIMELINE(medicoId) : null}
      detailEndpoint={medicoId ? MEDICAL_ENDPOINTS.DOCTOR_DETAIL(medicoId) : null}
      availableCategories={["doctor", "protocol", "system"]}
      emptyMessage="Sin historial de cambios para este médico"
    />
  )
}
