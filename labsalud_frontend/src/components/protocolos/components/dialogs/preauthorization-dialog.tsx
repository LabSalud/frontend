"use client"

import { useEffect, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog"
import { Button } from "../../../ui/button"
import { Input } from "../../../ui/input"
import { Label } from "../../../ui/label"
import { Textarea } from "../../../ui/textarea"
import { Switch } from "../../../ui/switch"
import { Checkbox } from "../../../ui/checkbox"
import type { ProtocolDetail } from "@/types"

interface PreauthorizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  protocolId: number
  details: ProtocolDetail[]
  onConfirm: (payload: {
    authorized_analysis_ids: number[]
    brought: boolean
    reference?: string
    notes?: string
  }) => Promise<boolean>
  isProcessing: boolean
}

export function PreauthorizationDialog({
  open,
  onOpenChange,
  protocolId,
  details,
  onConfirm,
  isProcessing,
}: PreauthorizationDialogProps) {
  const [brought, setBrought] = useState(true)
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  useEffect(() => {
    if (open) {
      setBrought(true)
      setReference("")
      setNotes("")
      setSelectedIds(details.filter((d) => d.is_active !== false).map((d) => d.analysis))
    }
  }, [open, details])

  const toggle = (analysisId: number) => {
    setSelectedIds((prev) => (prev.includes(analysisId) ? prev.filter((id) => id !== analysisId) : [...prev, analysisId]))
  }

  const handleConfirm = async () => {
    const ok = await onConfirm({
      authorized_analysis_ids: brought ? selectedIds : [],
      brought,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            Preautorización - Protocolo #{protocolId}
          </DialogTitle>
          <DialogDescription>
            Marcá los análisis autorizados por la obra social. Si la preauth no llegó, el sistema aplica el flujo de
            espera/parcial/devolución 48hs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-md border border-gray-200 p-3">
            <div>
              <Label htmlFor="brought" className="cursor-pointer text-sm font-semibold">
                Paciente trajo la preautorización
              </Label>
              <p className="text-xs text-gray-500">
                Si está desactivado, ningún análisis se autoriza y se cobra como particular.
              </p>
            </div>
            <Switch id="brought" checked={brought} onCheckedChange={setBrought} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="reference">Referencia / Nº preauth</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="OOSS-12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Comentarios..."
              />
            </div>
          </div>

          {brought && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Análisis autorizados</p>
              <div className="max-h-60 overflow-y-auto space-y-1 rounded-md border border-gray-200 p-2">
                {details.length === 0 && <p className="text-xs text-gray-500">Sin análisis cargados.</p>}
                {details.map((detail) => (
                  <label
                    key={detail.id}
                    className="flex items-center justify-between gap-3 rounded p-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        checked={selectedIds.includes(detail.analysis)}
                        onCheckedChange={() => toggle(detail.analysis)}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{detail.name}</p>
                        <p className="text-[10px] text-gray-500">Código {detail.code} • UB {detail.ub}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!brought && (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo o aclaración (opcional)"
              rows={3}
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || (brought && selectedIds.length === 0)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Aplicando...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" /> Aplicar preautorización
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
