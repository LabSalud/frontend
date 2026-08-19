"use client"

import { useEffect, useState } from "react"
import { Loader2, Wallet } from "lucide-react"

import { FormaDePago } from "@/components/common/forma-de-pago"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  /**
   * El monto del cobro. Pasarlo habilita corregirlo.
   *
   * Solo lo manda el libro diario: es donde se descubre que el cobro está mal,
   * al cuadrar contra el extracto o contra la caja. Desde el detalle del
   * protocolo se sigue corrigiendo solo la forma, porque ahí para mover plata
   * están los cobros y las devoluciones, que dejan su propio rastro.
   */
  monto?: string
  onGuardar: (forma: string, cuentaId: string, monto?: string) => Promise<boolean>
}

export function FormaDePagoDialog({
  open,
  onOpenChange,
  formaDePago,
  cuentaDeCobroId,
  monto,
  onGuardar,
}: Props) {
  const [forma, setForma] = useState(formaDePago)
  const [cuenta, setCuenta] = useState(cuentaDeCobroId)
  const [importe, setImporte] = useState(monto ?? "")
  const [guardando, setGuardando] = useState(false)

  const editaMonto = monto !== undefined

  // Se relee al abrir: si alguien lo cambió desde otro lado, el diálogo no
  // puede mostrar lo de antes.
  useEffect(() => {
    if (!open) return
    setForma(formaDePago)
    setCuenta(cuentaDeCobroId)
    setImporte(monto ?? "")
  }, [open, formaDePago, cuentaDeCobroId, monto])

  const importeLimpio = importe.replace(",", ".")
  const importeValido = !editaMonto || Number.parseFloat(importeLimpio) > 0
  const sinCambios =
    forma === formaDePago &&
    cuenta === cuentaDeCobroId &&
    (!editaMonto || importeLimpio === (monto ?? ""))
  const faltaCuenta = forma === "transferencia" && !cuenta

  const confirmar = async () => {
    setGuardando(true)
    try {
      const guardado = await onGuardar(
        forma, cuenta, editaMonto ? importeLimpio : undefined,
      )
      if (guardado) onOpenChange(false)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editaMonto ? "Corregir el cobro" : "Forma de pago"}</DialogTitle>
          <DialogDescription>
            {editaMonto
              ? "Corregí lo que se cargó mal en el ingreso. El total del protocolo se recalcula solo."
              : "Cómo pagó el paciente. Sirve para conciliar la caja contra el extracto de cada cuenta."}
          </DialogDescription>
        </DialogHeader>

        {/* CORREGIR EL MONTO NO ES COBRAR NI DEVOLVER.
            Si al ingreso se tipeó 5000 en vez de 500, registrar una devolución
            de 4500 deja en el libro una devolución que nunca pasó. Acá se
            arregla lo que se cargó mal, y el total del protocolo se recalcula
            solo. */}
        {editaMonto && (
          <div className="space-y-1.5">
            <Label htmlFor="monto-del-cobro" className="text-sm font-medium text-gray-700">
              Monto cobrado
            </Label>
            <Input
              id="monto-del-cobro"
              inputMode="decimal"
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              className="tabular-nums"
            />
            {!importeValido && (
              <p className="text-xs text-red-600">
                Tiene que ser mayor a cero. Para anular el cobro, quitalo desde
                el detalle del protocolo.
              </p>
            )}
          </div>
        )}

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
            disabled={guardando || sinCambios || faltaCuenta || !importeValido}
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
