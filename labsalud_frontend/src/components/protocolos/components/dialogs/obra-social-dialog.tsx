"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Loader2, Shield } from "lucide-react"

import { ObraSocialCombobox } from "@/components/ingreso/components/obra-social-combobox"
import { BillingEntitySelect } from "@/components/configuration/components/billing-entity-select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MEDICAL_ENDPOINTS } from "@/config/api"
import { useApi } from "@/hooks/use-api"
import type { Insurance } from "@/types"

/**
 * Cambiar la obra social de un protocolo ya creado.
 *
 * LO QUE HAY QUE AVISAR ANTES
 * ===========================
 * No es un dato más: la obra social decide cuántas UB vale cada análisis, si se
 * cobra material descartable y derivación, y quién paga qué. Al guardar, el
 * backend vuelve a sacar la foto de precios del protocolo entero.
 *
 * Por eso el cartel. Si el paciente ya pagó, el saldo se mueve — puede quedar
 * debiendo o a favor— y eso se ve en el momento, no cuando alguien cierra la
 * caja.
 */

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  obraSocialActual?: { id?: number; name?: string } | null
  entidadActualId?: number | null
  onGuardar: (insuranceId: number, billingEntityId: number | null) => Promise<boolean>
  procesando?: boolean
}

export function ObraSocialDialog({
  open,
  onOpenChange,
  obraSocialActual,
  entidadActualId,
  onGuardar,
  procesando = false,
}: Props) {
  const { apiRequest } = useApi()
  const [obrasSociales, setObrasSociales] = useState<Insurance[]>([])
  const [elegida, setElegida] = useState<Insurance | null>(null)
  const [entidad, setEntidad] = useState("")

  useEffect(() => {
    if (!open) return
    setElegida(null)
    setEntidad(entidadActualId ? String(entidadActualId) : "")
    apiRequest(`${MEDICAL_ENDPOINTS.INSURANCES}?limit=20&offset=0&is_active=true`)
      .then((r) => (r.ok ? r.json() : null))
      .then((datos) => {
        if (!datos) return
        setObrasSociales(Array.isArray(datos) ? datos : datos.results || [])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // La entidad solo se pide en las que facturan por Centro o por Clínica según
  // la preautorización. En el resto sale de la obra social.
  const pideEntidad = Boolean(elegida?.chooses_billing_entity)
  const cambio = Boolean(elegida) && elegida?.id !== obraSocialActual?.id
  const puedeGuardar = cambio && (!pideEntidad || Boolean(entidad))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#204983]" />
            Obra social
          </DialogTitle>
          <DialogDescription>
            Actual: <strong>{obraSocialActual?.name || "Particular"}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Nueva obra social</Label>
            <ObraSocialCombobox
              obrasSociales={obrasSociales}
              selectedObraSocial={elegida}
              onObraSocialSelect={setElegida}
              onShowCreateObraSocial={() => {}}
            />
          </div>

          {pideEntidad && (
            <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 p-3">
              <Label htmlFor="entidad-al-cambiar" className="text-sm text-amber-900">
                ¿Por dónde factura este paciente? *
              </Label>
              <p className="text-xs text-amber-800">
                {elegida?.name} va por Centro o por Clínica según cómo se preautorizó.
              </p>
              <BillingEntitySelect
                id="entidad-al-cambiar"
                value={entidad}
                onValueChange={setEntidad}
                allowNone={false}
                disabled={procesando}
              />
            </div>
          )}

          {cambio && (
            <p className="flex items-start gap-2 rounded-md bg-gray-50 p-3 text-xs text-gray-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Se recalculan los precios del protocolo: la cantidad de UB de cada análisis
                según el nomenclador de {elegida?.name}, y el material descartable y la
                derivación según lo que esa obra social cobre. Si el paciente ya pagó, el
                saldo se mueve.
              </span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={procesando}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (!elegida) return
              const guardado = await onGuardar(
                elegida.id,
                pideEntidad && entidad ? Number(entidad) : null,
              )
              if (guardado) onOpenChange(false)
            }}
            disabled={procesando || !puedeGuardar}
            className="bg-[#204983] hover:bg-[#1a3d6f]"
          >
            {procesando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
            Cambiar y recalcular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
