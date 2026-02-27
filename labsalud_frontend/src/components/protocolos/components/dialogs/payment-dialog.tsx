"use client"

import { useState, useEffect } from "react"
import { Loader2, DollarSign, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../ui/dialog"
import { Button } from "../../../ui/button"
import { Input } from "../../../ui/input"
import { Label } from "../../../ui/label"

type OperationType = "patient_paid" | "refunded_to_patient"

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  protocolId: number
  amountDue: string
  amountPending: string
  patientPaid: string
  amountToReturn: string
  paymentStatusName: string
  onRegularize: (amount: number, operation: OperationType) => Promise<boolean>
  isProcessing: boolean
}

export function PaymentDialog({
  open,
  onOpenChange,
  protocolId,
  amountDue,
  amountPending,
  patientPaid,
  amountToReturn,
  paymentStatusName,
  onRegularize,
  isProcessing,
}: PaymentDialogProps) {
  const [operation, setOperation] = useState<OperationType>("patient_paid")
  const [amount, setAmount] = useState("")

  const pending = Number.parseFloat(amountPending || "0")
  const toReturn = Number.parseFloat(amountToReturn || "0")
  const due = Number.parseFloat(amountDue || "0")
  const paid = Number.parseFloat(patientPaid || "0")

  const maxAmount = operation === "patient_paid" ? pending : toReturn

  // Auto-select operation based on what makes sense
  useEffect(() => {
    if (open) {
      setAmount("")
      if (toReturn > 0 && pending <= 0) {
        setOperation("refunded_to_patient")
      } else {
        setOperation("patient_paid")
      }
    }
  }, [open, pending, toReturn])

  const handleConfirm = async () => {
    const value = Number.parseFloat(amount)
    if (isNaN(value) || value <= 0) return

    const success = await onRegularize(value, operation)
    if (success) {
      setAmount("")
      onOpenChange(false)
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setAmount("")
    }
    onOpenChange(isOpen)
  }

  const handleSetMax = () => {
    if (maxAmount > 0) {
      setAmount(maxAmount.toFixed(2))
    }
  }

  const getStatusBadgeColor = (status: string) => {
    const lower = status.toLowerCase()
    if (lower.includes("completo") || lower.includes("pagado")) return "bg-green-100 text-green-800"
    if (lower.includes("parcial")) return "bg-yellow-100 text-yellow-800"
    if (lower.includes("pendiente")) return "bg-red-100 text-red-800"
    if (lower.includes("devolucion") || lower.includes("devolución")) return "bg-blue-100 text-blue-800"
    return "bg-gray-100 text-gray-800"
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Pagos - Protocolo #{protocolId}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Payment Summary */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Estado de pago</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadgeColor(paymentStatusName)}`}>
                {paymentStatusName}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-xs text-gray-500">Total a pagar</p>
                <p className="text-lg font-bold text-gray-900">${due.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 rounded-md p-3">
                <p className="text-xs text-gray-500">Pagado</p>
                <p className="text-lg font-bold text-green-700">${paid.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 rounded-md p-3">
                <p className="text-xs text-gray-500">Pendiente</p>
                <p className="text-lg font-bold text-red-700">${pending.toFixed(2)}</p>
              </div>
              <div className="bg-blue-50 rounded-md p-3">
                <p className="text-xs text-gray-500">A devolver</p>
                <p className="text-lg font-bold text-blue-700">${toReturn.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Operation Type Tabs */}
          <div className="flex gap-2">
            <Button
              variant={operation === "patient_paid" ? "default" : "outline"}
              size="sm"
              className={`flex-1 ${operation === "patient_paid" ? "bg-green-600 hover:bg-green-700" : ""}`}
              onClick={() => {
                setOperation("patient_paid")
                setAmount("")
              }}
              disabled={pending <= 0}
            >
              <ArrowDownLeft className="h-4 w-4 mr-1" />
              Registrar Pago
            </Button>
            <Button
              variant={operation === "refunded_to_patient" ? "default" : "outline"}
              size="sm"
              className={`flex-1 ${operation === "refunded_to_patient" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
              onClick={() => {
                setOperation("refunded_to_patient")
                setAmount("")
              }}
              disabled={toReturn <= 0}
            >
              <ArrowUpRight className="h-4 w-4 mr-1" />
              Registrar Devolucion
            </Button>
          </div>

          {/* Amount Input with Total button */}
          <div className="space-y-2">
            <Label htmlFor="regularize-amount">
              {operation === "patient_paid" ? "Monto a cobrar" : "Monto a devolver"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="regularize-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={maxAmount}
                placeholder={`Maximo: $${maxAmount.toFixed(2)}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={maxAmount <= 0}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSetMax}
                disabled={maxAmount <= 0}
                className="shrink-0 px-3 font-medium text-xs"
              >
                Total
              </Button>
            </div>
            {maxAmount > 0 && (
              <p className="text-xs text-gray-500">
                Ingrese un monto entre $0.01 y ${maxAmount.toFixed(2)}
              </p>
            )}
            {maxAmount <= 0 && (
              <p className="text-xs text-amber-600">
                {operation === "patient_paid"
                  ? "No hay saldo pendiente de cobro"
                  : "No hay monto pendiente de devolucion"}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !amount || Number.parseFloat(amount) <= 0 || Number.parseFloat(amount) > maxAmount}
            className={`w-full sm:w-auto ${
              operation === "patient_paid"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                {operation === "patient_paid" ? "Confirmar Pago" : "Confirmar Devolucion"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
