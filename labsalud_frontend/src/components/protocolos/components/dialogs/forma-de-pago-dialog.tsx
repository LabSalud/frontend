"use client"

import { useEffect, useState } from "react"
import { Loader2, Wallet } from "lucide-react"

import { FormaDePago } from "@/components/common/forma-de-pago"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Corregir cómo pagó el paciente.
 *
 * POR QUÉ NO VA ADENTRO DEL DIÁLOGO DE COBROS
 * ===========================================
 * Ahí se registra un pago o una devolución: cuánto entró. Esto es otra cosa
 * —de qué manera entró— y se corrige cuando alguien nota que quedó mal, no
 * cuando está cobrando. Metido ahí, aparecía un botón de guardar al lado de
 * otro de confirmar, y dos botones que hacen cosas distintas y se llaman casi
 * igual es una equivocación esperando.
 */

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formaDePago: string
  cuentaDeCobroId: string
  onGuardar: (forma: string, cuentaId: string) => Promise<boolean>
}

export function FormaDePagoDialog({
  open,
  onOpenChange,
  formaDePago,
  cuentaDeCobroId,
  onGuardar,
}: Props) {
  const [forma, setForma] = useState(formaDePago)
  const [cuenta, setCuenta] = useState(cuentaDeCobroId)
  const [guardando, setGuardando] = useState(false)

  // Se relee al abrir: si alguien la cambió desde otro lado, el diálogo no
  // puede mostrar lo de antes.
  useEffect(() => {
    if (!open) return
    setForma(formaDePago)
    setCuenta(cuentaDeCobroId)
  }, [open, formaDePago, cuentaDeCobroId])

  const sinCambios = forma === formaDePago && cuenta === cuentaDeCobroId
  const faltaCuenta = forma === "transferencia" && !cuenta

  const confirmar = async () => {
    setGuardando(true)
    try {
      if (await onGuardar(forma, cuenta)) onOpenChange(false)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forma de pago</DialogTitle>
          <DialogDescription>
            Cómo pagó el paciente. Sirve para conciliar la caja contra el extracto
            de cada cuenta.
          </DialogDescription>
        </DialogHeader>

        <FormaDePago
          formaDePago={forma}
          cuentaId={cuenta}
          onFormaChange={setForma}
          onCuentaChange={setCuenta}
          disabled={guardando}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            disabled={guardando || sinCambios || faltaCuenta}
            className="bg-[#204983] hover:bg-[#1a3d6f]"
          >
            {guardando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="mr-2 h-4 w-4" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
