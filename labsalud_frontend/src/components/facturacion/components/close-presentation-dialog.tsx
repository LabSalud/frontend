import { useState } from "react"
import { CalendarRange, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { DialogHeading } from "@/components/common/dialog-heading"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { BillingEntity } from "../mock-data"

interface ClosePresentationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entity: BillingEntity
  onConfirm: (nextCloseDate: string | null) => Promise<void>
}

/**
 * Cerrar la presentación actual de una entidad. La fecha del próximo cierre
 * es OPCIONAL: si todavía no se sabe, se puede dejar pendiente y cargarla
 * después desde la presentación abierta (las fechas no son fijas ni iguales
 * entre entidades).
 */
export function ClosePresentationDialog({ open, onOpenChange, entity, onConfirm }: ClosePresentationDialogProps) {
  const [nextCloseDate, setNextCloseDate] = useState("")
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await onConfirm(nextCloseDate || null)
      setNextCloseDate("")
      onOpenChange(false)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeading
          icon={CalendarRange}
          title={`Cerrar presentación — ${entity.name}`}
          description="Se cierra con los protocolos facturados acumulados hasta ahora."
        />

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="next-close-date">¿Cuándo cierra la próxima presentación de {entity.name}? (opcional)</Label>
            <Input
              id="next-close-date"
              type="date"
              value={nextCloseDate}
              onChange={(e) => setNextCloseDate(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Si todavía no la sabés, dejalo en blanco — queda como "pendiente" y la podés cargar en cualquier momento
              desde la presentación abierta.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            Cancelar
          </Button>
          <Button className="bg-[#204983] hover:bg-[#1a3d6f]" onClick={handleConfirm} disabled={confirming}>
            {confirming && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Confirmar cierre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
