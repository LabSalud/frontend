"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AuditAvatars } from "@/components/common/audit-avatars"
import { History, Pencil, Trash, Stethoscope } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { MEDICAL_ENDPOINTS } from "@/config/api"
import { MedicoHistoryDialog } from "./medico-history-dialog"
import type { Medico } from "@/types"

interface MedicoDetailDialogProps {
  medico: Medico | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (medico: Medico) => void
  onDelete: (medico: Medico) => void
}

export function MedicoDetailDialog({ medico, open, onOpenChange, onEdit, onDelete }: MedicoDetailDialogProps) {
  const { apiRequest } = useApi()
  const [full, setFull] = useState<Medico | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    if (!open || !medico?.id) return
    setFull(null)
    apiRequest(MEDICAL_ENDPOINTS.DOCTOR_DETAIL(medico.id))
      .then((r) => r.json())
      .then((d) => setFull(d))
      .catch(() => setFull(null))
  }, [open, medico?.id, apiRequest])

  if (!medico) return null

  const data = full ?? medico
  const fullName = `${data.first_name} ${data.last_name}`.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-0 border-b border-gray-100 p-5 text-left">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#204983]/10 text-[#204983]">
              <Stethoscope className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg">{fullName}</DialogTitle>
              <DialogDescription>Matrícula {data.license}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nombre</p>
              <p className="text-sm text-gray-800">{data.first_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Apellido</p>
              <p className="text-sm text-gray-800">{data.last_name}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Matrícula</p>
              <p className="text-sm text-gray-800">{data.license}</p>
            </div>
          </div>

          {(data.creation || data.last_change) && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Auditoría</span>
                <AuditAvatars creation={data.creation} lastChange={data.last_change} size="sm" />
              </div>
            </>
          )}
        </div>

        <div className="space-y-2 border-t border-gray-100 bg-gray-50/60 p-4">
          <Button variant="outline" size="sm" className="w-full" onClick={() => setHistoryOpen(true)}>
            <History className="mr-1.5 h-4 w-4 text-[#204983]" />
            Ver historial de cambios
            {full?.total_changes ? <span className="ml-1 text-xs text-gray-400">({full.total_changes})</span> : null}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" className="bg-[#204983] hover:bg-[#1a3d6f]" onClick={() => onEdit(medico)}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => onDelete(medico)}
            >
              <Trash className="mr-1.5 h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>
      </DialogContent>

      <MedicoHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} medicoId={medico.id} medicoName={fullName} />
    </Dialog>
  )
}
