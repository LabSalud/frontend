"use client"

import { useEffect, useState, useCallback } from "react"
import { CheckIcon, X, User, FileText, Stethoscope, Building, Send, DollarSign, CreditCard, TestTube } from "lucide-react"
import { Button } from "../../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card"
import { Badge } from "../../ui/badge"
import { Separator } from "../../ui/separator"
import type { Patient, Doctor, Insurance, SendMethod, Protocol } from "../../../types"

interface ProtocolSuccessProps {
  protocol: Protocol
  patient: Patient
  doctor: Doctor
  insurance: Insurance
  sendMethod: SendMethod
  onClose: () => void
}

export function ProtocolSuccess({ protocol, patient, doctor, insurance, sendMethod, onClose }: ProtocolSuccessProps) {
  const [animationPhase, setAnimationPhase] = useState<"initial" | "expand" | "moveUp" | "showSummary">("initial")

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    // Listen for escape key
    window.addEventListener("keydown", handleKeyDown)

    // Animation sequence with proper timing
    const timer1 = setTimeout(() => setAnimationPhase("expand"), 100)
    const timer2 = setTimeout(() => setAnimationPhase("moveUp"), 1500)
    const timer3 = setTimeout(() => setAnimationPhase("showSummary"), 2000)

    // Auto-close after 10 seconds
    const closeTimer = setTimeout(() => {
      onClose()
    }, 10000)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(closeTimer)
    }
  }, [onClose, handleKeyDown])

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className={`
          absolute inset-0 bg-green-500 transition-all duration-700 ease-out
          ${animationPhase === "initial" ? "scale-0 rounded-full" : ""}
          ${animationPhase === "expand" ? "scale-150" : ""}
          ${animationPhase === "moveUp" || animationPhase === "showSummary" ? "scale-100" : ""}
        `}
        style={{
          transformOrigin: "center center",
        }}
      />

      <div
        className={`
          relative h-full flex flex-col items-center justify-center transition-all duration-700 ease-out
          ${animationPhase === "moveUp" || animationPhase === "showSummary" ? "pt-8" : ""}
        `}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className={`
            absolute top-4 right-4 h-10 w-10 text-white hover:bg-white/20 z-10
            transition-opacity duration-500
            ${animationPhase === "initial" ? "opacity-0" : "opacity-100"}
          `}
        >
          <X className="h-6 w-6" />
        </Button>

        <div
          className={`
            transition-all duration-700 ease-out
            ${animationPhase === "initial" ? "opacity-0 scale-0" : "opacity-100 scale-100"}
            ${
              animationPhase === "moveUp" || animationPhase === "showSummary"
                ? "transform -translate-y-4 mb-6"
                : "transform translate-y-0 mb-0"
            }
          `}
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center shadow-2xl backdrop-blur-sm">
              <CheckIcon className="text-white" size={48} strokeWidth={3} />
            </div>
            {/* Ripple effect */}
            {animationPhase === "expand" && (
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-white/30 animate-ping" />
            )}
          </div>
        </div>

        <div
          className={`
            w-full max-w-2xl mx-4 transition-all duration-700 ease-out
            ${
              animationPhase === "showSummary"
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-16 pointer-events-none"
            }
          `}
        >
          <Card className="shadow-2xl border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-green-600 text-2xl flex items-center justify-center gap-2">
                <FileText className="h-6 w-6" />
                Protocolo Creado Exitosamente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Protocol ID */}
              <div className="text-center pb-2">
                <Badge
                  variant="outline"
                  className="text-lg px-4 py-2 font-mono bg-green-50 border-green-200 text-green-700"
                >
                  Protocolo N° {protocol.id}
                </Badge>
              </div>

              <Separator />

              {/* Patient info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="font-semibold">Paciente:</span>
                </div>
                <div className="pl-6 text-gray-800">
                  <div className="font-medium text-lg">
                    {patient.first_name} {patient.last_name}
                  </div>
                  <div className="text-sm text-gray-600">DNI: {patient.dni}</div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Building className="h-4 w-4" />
                    <span>Obra Social:</span>
                  </div>
                  <div className="pl-6 font-medium text-gray-800">{insurance.name}</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Stethoscope className="h-4 w-4" />
                    <span>Médico:</span>
                  </div>
                  <div className="pl-6 font-medium text-gray-800">
                    {doctor.first_name} {doctor.last_name}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Send className="h-4 w-4" />
                    <span>Método de envío:</span>
                  </div>
                  <div className="pl-6 font-medium text-gray-800">{sendMethod.name}</div>
                </div>
              </div>

              <Separator />

              {/* Payment summary */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-semibold">Resumen de Pago:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-6">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">Total UB Autorizado</div>
                    <div className="font-medium text-gray-800">{protocol.total_ub_authorized || "0.00"} UB</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">Total UB Particular</div>
                    <div className="font-medium text-gray-800">{protocol.total_ub_private || "0.00"} UB</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">Monto Pagado</div>
                    <div className="font-medium text-green-600">${protocol.value_paid || "0.00"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">Estado de Pago</div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        protocol.payment_status?.name?.toLowerCase().includes("pagado") || 
                        protocol.payment_status?.name?.toLowerCase().includes("completo")
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-orange-50 text-orange-700 border-orange-200"
                      }`}
                    >
                      {protocol.payment_status?.name || "Pendiente"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Analyses */}
              {protocol.details && protocol.details.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <TestTube className="h-4 w-4" />
                    <span className="font-semibold">Análisis Solicitados ({protocol.details.length}):</span>
                  </div>
                  <div className="pl-6 flex flex-wrap gap-2">
                    {protocol.details.slice(0, 8).map((detail) => (
                      <Badge 
                        key={detail.id} 
                        variant="outline" 
                        className={`text-xs ${
                          detail.is_authorized 
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {detail.name}
                      </Badge>
                    ))}
                    {protocol.details.length > 8 && (
                      <Badge variant="secondary" className="text-xs">
                        +{protocol.details.length - 8} más
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 text-center text-sm text-gray-500">
                Presione <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">ESC</kbd> o la X para cerrar
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
