"use client"

import { ObjectHistoryDialog } from "@/components/common/object-history-dialog"
import { USER_ENDPOINTS } from "@/config/api"

interface UserHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number | null
  userName: string
}

export function UserHistoryDialog({ open, onOpenChange, userId, userName }: UserHistoryDialogProps) {
  return (
    <ObjectHistoryDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Historial de Cambios - ${userName}`}
      timelineEndpoint={userId ? USER_ENDPOINTS.USER_AUDIT_TIMELINE(userId) : null}
      detailEndpoint={userId ? USER_ENDPOINTS.USER_DETAIL(userId) : null}
      availableCategories={["user", "system"]}
      emptyMessage="Sin historial de cambios para este usuario"
    />
  )
}
