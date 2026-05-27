"use client"

import { ChevronDown, User, CreditCard, Printer, DollarSign, UserCog, ShieldCheck } from "lucide-react"
import { Badge } from "../../ui/badge"
import { Button } from "../../ui/button"
import { AuditAvatars } from "@/components/common/audit-avatars"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { PaymentStatus, CreationAudit, LastChangeAudit, ProtocolStatus, PreauthStatus } from "@/types"
import { getPaymentStatusInfo, getPreauthStatusInfo, getProtocolStatusBadgeClass } from "@/lib/status-styles"

interface ProtocolHeaderProps {
  protocolId: number
  status: ProtocolStatus
  patientName: string
  isAnonymousPatient?: boolean
  paymentStatus?: PaymentStatus | null
  balance: number
  isPrinted?: boolean
  preauthStatus?: PreauthStatus
  canRegisterPayment: boolean
  labOwesPatient: boolean
  paymentDisabledReason?: string
  isExpanded: boolean
  creation?: CreationAudit
  lastChange?: LastChangeAudit
  onRegisterPayment: () => void
}

const getStateColor = (statusId: number) => {
  return getProtocolStatusBadgeClass(statusId)
}

export function ProtocolHeader({
  protocolId,
  status,
  patientName,
  isAnonymousPatient = false,
  paymentStatus,
  balance,
  isPrinted,
  preauthStatus,
  canRegisterPayment,
  labOwesPatient,
  paymentDisabledReason,
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
  const preauthInfo = getPreauthStatusInfo(preauthStatus)
  const showPreauthStatus = Boolean(preauthStatus && preauthStatus !== "not_required")
  const showPaymentButton = canRegisterPayment || labOwesPatient || Boolean(paymentDisabledReason)
  const paymentButton = (
    <Button
      size="sm"
      onClick={(e) => {
        e.stopPropagation()
        if (paymentDisabledReason) return
        onRegisterPayment()
      }}
      disabled={Boolean(paymentDisabledReason)}
      className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-6 disabled:opacity-60"
      data-no-expand
    >
      <DollarSign className="h-3 w-3 mr-1" />
      Pagos
    </Button>
  )

  return (
    <>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          {/* // Improved responsive layout */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0">
            <div className={`flex-shrink-0 p-1.5 rounded-full ${isCancelled ? "bg-red-500" : "bg-[#204983]"} self-start`}>
              <div className="h-5 w-5 bg-white rounded-sm flex items-center justify-center">
                <span className={`text-xs font-bold ${isCancelled ? "text-red-500" : "text-[#204983]"}`}>P</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 mb-0.5">
                <h3 className="text-base font-semibold truncate text-gray-800" title={`Protocolo #${protocolId}`}>
                  Protocolo #{protocolId}
                </h3>
                {/* // Responsive button layout */}
                <div className="flex flex-wrap gap-1 min-w-0 max-w-full">
                  {showPaymentButton && (
                    paymentDisabledReason ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">{paymentButton}</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[260px] bg-slate-900 text-white">
                          <p>{paymentDisabledReason}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      paymentButton
                    )
                  )}
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-1 max-w-full min-w-0">
                <Badge className={getStateColor(statusId)} variant="secondary">
                  {statusName}
                </Badge>
                {isAnonymousPatient && (
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                    <UserCog className="h-3 w-3 mr-1" />
                    Paciente anónimo
                  </Badge>
                )}
                {isPrinted && (
                  <Badge variant="outline" className="max-w-full text-xs">
                    <Printer className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Impreso / </span>Enviado
                  </Badge>
                )}
                {showPreauthStatus && (
                  <Badge variant="outline" className={`max-w-full text-xs ${preauthInfo.badge}`}>
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    {preauthInfo.label}
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
        <div className="mt-2 pt-2 border-t border-gray-100">
          {/* // Improved responsive layout for collapsed view */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-2 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 flex-1 min-w-0 max-w-full">
              <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 truncate" title={patientName}>
                  {patientName}
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-1 flex-shrink-0 max-w-full">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <span className={`min-w-0 max-w-full flex-1 break-words text-sm font-medium ${paymentStatusInfo.color}`}>
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
