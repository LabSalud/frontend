"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AuditAvatars } from "@/components/common/audit-avatars"
import { History, Pencil, Trash, Stethoscope } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { MEDICAL_ENDPOINTS } from "@/config/api"
import { MedicoHistoryDialog } from "./medico-history-dialog"
import type { Medico } from "@/types"

interface MedicoDetailSheetProps {
  medico: Medico | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (medico: Medico) => void
  onDelete: (medico: Medico) => void
}

export function MedicoDetailSheet({ medico, open, onOpenChange, onEdit, onDelete }: MedicoDetailSheetProps) {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#204983]/10 text-[#204983]">
              <Stethoscope className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="truncate text-lg">{fullName}</SheetTitle>
              <SheetDescription>Matrícula {data.license}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Nombre</p>
              <p className="text-sm text-gray-800">{data.first_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Apellido</p>
              <p className="text-sm text-gray-800">{data.last_name}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Matrícula</p>
              <p className="text-sm text-gray-800">{data.license}</p>
            </div>
          </div>

          {(data.creation || data.last_change) && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Auditoría</span>
                <AuditAvatars creation={data.creation} lastChange={data.last_change} size="sm" />
              </div>
            </>
          )}
        </div>

        <div className="mt-auto space-y-2 border-t border-gray-100 p-4">
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
      </SheetContent>

      <MedicoHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} medicoId={medico.id} medicoName={fullName} />
    </Sheet>
  )
}
