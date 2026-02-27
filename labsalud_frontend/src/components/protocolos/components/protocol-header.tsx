"use client"

import { ChevronDown, User, CreditCard, Printer, DollarSign } from "lucide-react"
import { Badge } from "../../ui/badge"
import { Button } from "../../ui/button"
import { AuditAvatars } from "@/components/common/audit-avatars"
import type { PaymentStatus, CreationAudit, LastChangeAudit, ProtocolStatus } from "@/types"

interface ProtocolHeaderProps {
  protocolId: number
  status: ProtocolStatus
  patientName: string
  paymentStatus?: PaymentStatus | null
  balance: number
  isPrinted?: boolean
  canRegisterPayment: boolean
  labOwesPatient: boolean
  isExpanded: boolean
  creation?: CreationAudit
  lastChange?: LastChangeAudit
  onRegisterPayment: () => void
}

// Status IDs: 1=Pendiente de carga, 2=Pendiente de validación, 3=Pago incompleto, 4=Cancelado, 5=Completado, 6=Pendiente de Retiro, 7=Envío fallido, 8=Pendiente de Facturación
const getStateColor = (statusId: number) => {
  const stateColors: Record<number, string> = {
    1: "bg-yellow-100 text-yellow-800", // Pendiente de carga
    2: "bg-blue-100 text-blue-800", // Pendiente de validación
    3: "bg-orange-100 text-orange-800", // Pago incompleto
    4: "bg-red-100 text-red-800", // Cancelado
    5: "bg-green-100 text-green-800", // Completado
    6: "bg-purple-100 text-purple-800", // Pendiente de Retiro
    7: "bg-rose-100 text-rose-800", // Envío fallido
    8: "bg-teal-100 text-teal-800", // Pendiente de Facturación
  }
  return stateColors[statusId] || "bg-gray-100 text-gray-800"
}

const getPaymentStatusInfo = (paymentStatus?: PaymentStatus | null) => {
  if (!paymentStatus) {
    return { color: "text-gray-600", bgColor: "bg-gray-100", label: "Sin estado" }
  }

  switch (paymentStatus.id) {
    case 1:
      return { color: "text-green-600", bgColor: "bg-green-100", label: paymentStatus.name }
    case 2:
      return { color: "text-red-600", bgColor: "bg-red-100", label: paymentStatus.name }
    case 3:
      return { color: "text-orange-600", bgColor: "bg-orange-100", label: paymentStatus.name }
    default:
      return { color: "text-gray-600", bgColor: "bg-gray-100", label: paymentStatus.name }
  }
}

export function ProtocolHeader({
  protocolId,
  status,
  patientName,
  paymentStatus,
  balance,
  isPrinted,
  canRegisterPayment,
  labOwesPatient,
  isExpanded,
  creation,
  lastChange,
  onRegisterPayment,
}: ProtocolHeaderProps) {
  const paymentStatusInfo = getPaymentStatusInfo(paymentStatus)
  const paymentStatusId = paymentStatus?.id ?? 0
  const statusId = status?.id ?? 0
  const statusName = status?.name ?? "Desconocido"

  const isCancelled = statusId === 4

  return (
    <>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          {/* // Improved responsive layout */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className={`flex-shrink-0 p-2 rounded-full ${isCancelled ? "bg-red-500" : "bg-[#204983]"} self-start`}>
              <div className="h-5 w-5 bg-white rounded-sm flex items-center justify-center">
                <span className={`text-xs font-bold ${isCancelled ? "text-red-500" : "text-[#204983]"}`}>P</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <h3 className="text-base font-semibold truncate text-gray-800" title={`Protocolo #${protocolId}`}>
                  Protocolo #{protocolId}
                </h3>
                {/* // Responsive button layout */}
                <div className="flex flex-wrap gap-1">
                  {(canRegisterPayment || labOwesPatient) && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRegisterPayment()
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-6"
                      data-no-expand
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      Pagos
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-1">
                <Badge className={getStateColor(statusId)} variant="secondary">
                  {statusName}
                </Badge>
                {isPrinted && (
                  <Badge variant="outline" className="text-xs">
                    <Printer className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Impreso / </span>Enviado
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-2" data-no-expand>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Info cuando está cerrada */}
      {!isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {/* // Improved responsive layout for collapsed view */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 truncate" title={patientName}>
                  {patientName}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <span className={`text-sm font-medium ${paymentStatusInfo.color}`}>
                  {paymentStatusId === 1
                    ? "Pagado"
                    : paymentStatusId === 2
                      ? `Debe: $${Math.abs(balance).toFixed(2)}`
                      : paymentStatusId === 3
                        ? `A favor: $${Math.abs(balance).toFixed(2)}`
                        : "Sin estado"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end">
            {/* // Fixed AuditAvatars props to pass data directly */}
            {(creation || lastChange) && (
              <AuditAvatars
                creation={
                  creation
                    ? {
                        user: creation.user ? { username: creation.user.username, photo: creation.user.photo } : null,
                        date: creation.date,
                      }
                    : undefined
                }
                lastChange={
                  lastChange
                    ? {
                        user: lastChange.user
                          ? { username: lastChange.user.username, photo: lastChange.user.photo }
                          : null,
                        date: lastChange.date,
                      }
                    : undefined
                }
                size="sm"
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}

export { getStateColor, getPaymentStatusInfo }
