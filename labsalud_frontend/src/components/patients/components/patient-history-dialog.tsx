"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HistoryList } from "@/components/common/history-list"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"
import { useApi } from "@/hooks/use-api"
import { PATIENT_ENDPOINTS } from "@/config/api"
import type { HistoryEntry } from "@/types"

interface PatientHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: number | null
  patientName: string
}

export function PatientHistoryDialog({ open, onOpenChange, patientId, patientName }: PatientHistoryDialogProps) {
  const { apiRequest } = useApi()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && patientId) {
      loadHistory()
    }
  }, [open, patientId])

  const loadHistory = async () => {
    if (!patientId) return

    setLoading(true)
    try {
      const response = await apiRequest(PATIENT_ENDPOINTS.PATIENT_DETAIL(patientId))
      if (response.ok) {
        const data = await response.json()
        setHistory(data.history || [])
      }
    } catch (error) {
      console.error("Error al cargar historial:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Historial de Cambios - {patientName}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {loading ? (
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
          ) : (
            <HistoryList history={history} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
