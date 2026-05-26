"use client"

import { Loader2, Edit, Save, ClipboardCheck, BedDouble } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../../ui/dialog"
import { Button } from "../../../ui/button"
import { Input } from "../../../ui/input"
import { Label } from "../../../ui/label"
import { Switch } from "../../../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select"
import type { SendMethod } from "@/types"

export interface EditFormData {
  send_method: string
  affiliate_number: string
  trajo_orden: boolean
  is_in_patient: boolean
}

interface EditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  protocolId: number
  formData: EditFormData
  onFormDataChange: (data: EditFormData) => void
  sendMethods: SendMethod[]
  onSave: () => void
  isSaving: boolean
}

export function EditDialog({
  open,
  onOpenChange,
  protocolId,
  formData,
  onFormDataChange,
  sendMethods,
  onSave,
  isSaving,
}: EditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-[#204983]" />
            Editar Protocolo #{protocolId}
          </DialogTitle>
          <DialogDescription>Modifique los campos que desee actualizar.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-send-method">Método de Envío</Label>
            <Select
              value={formData.send_method}
              onValueChange={(value) => onFormDataChange({ ...formData, send_method: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent>
                {sendMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id.toString()}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-affiliate-number">Número de Afiliado</Label>
            <Input
              id="edit-affiliate-number"
              value={formData.affiliate_number}
              onChange={(e) => onFormDataChange({ ...formData, affiliate_number: e.target.value })}
              placeholder="Número de afiliado (opcional)"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-gray-200 p-3">
            <div className="flex items-start gap-2">
              <ClipboardCheck className="h-4 w-4 text-emerald-500 mt-0.5" />
              <div>
                <Label htmlFor="edit-trajo-orden" className="cursor-pointer text-sm font-semibold">
                  Trajo la orden médica
                </Label>
                <p className="text-xs text-gray-500">
                  Necesario para enviar reportes por email o WhatsApp.
                </p>
              </div>
            </div>
            <Switch
              id="edit-trajo-orden"
              checked={formData.trajo_orden}
              onCheckedChange={(checked) => onFormDataChange({ ...formData, trajo_orden: checked })}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-gray-200 p-3">
            <div className="flex items-start gap-2">
              <BedDouble className="h-4 w-4 text-purple-500 mt-0.5" />
              <div>
                <Label htmlFor="edit-is-in-patient" className="cursor-pointer text-sm font-semibold">
                  Paciente internado
                </Label>
                <p className="text-xs text-gray-500">Informativo.</p>
              </div>
            </div>
            <Switch
              id="edit-is-in-patient"
              checked={formData.is_in_patient}
              onCheckedChange={(checked) => onFormDataChange({ ...formData, is_in_patient: checked })}
            />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={isSaving} className="bg-[#204983] hover:bg-[#1a3a6a] w-full sm:w-auto">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
