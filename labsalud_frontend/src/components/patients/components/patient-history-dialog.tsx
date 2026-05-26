"use client"

import { ObjectHistoryDialog } from "@/components/common/object-history-dialog"
import { PATIENT_ENDPOINTS } from "@/config/api"

interface PatientHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: number | null
  patientName: string
}

export function PatientHistoryDialog({ open, onOpenChange, patientId, patientName }: PatientHistoryDialogProps) {
  return (
    <ObjectHistoryDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Historial de Cambios - ${patientName}`}
      timelineEndpoint={patientId ? PATIENT_ENDPOINTS.PATIENT_AUDIT_TIMELINE(patientId) : null}
      detailEndpoint={patientId ? PATIENT_ENDPOINTS.PATIENT_DETAIL(patientId) : null}
      availableCategories={["patient", "protocol", "payment", "system"]}
      emptyMessage="Sin historial de cambios para este paciente"
    />
  )
}
