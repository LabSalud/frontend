"use client"

import { ObjectHistoryDialog } from "@/components/common/object-history-dialog"
import { CATALOG_ENDPOINTS } from "@/config/api"

interface AnalysisHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysisId: number | null
  analysisName: string
}

export function AnalysisHistoryDialog({ open, onOpenChange, analysisId, analysisName }: AnalysisHistoryDialogProps) {
  return (
    <ObjectHistoryDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Historial de Cambios - ${analysisName}`}
      timelineEndpoint={analysisId ? CATALOG_ENDPOINTS.ANALYSIS_AUDIT_TIMELINE(analysisId) : null}
      detailEndpoint={analysisId ? CATALOG_ENDPOINTS.ANALYSIS_DETAIL(analysisId) : null}
      availableCategories={["analysis", "system"]}
      emptyMessage="Sin historial de cambios para este análisis"
    />
  )
}
