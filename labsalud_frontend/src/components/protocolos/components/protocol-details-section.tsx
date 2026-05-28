"use client"

import type React from "react"
import { User, Building, CreditCard, Send, DollarSign, Printer, History, ClipboardCheck, BedDouble, BookOpen, ShieldCheck } from "lucide-react"
import { Badge } from "../../ui/badge"
import { Button } from "../../ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { PaymentStatus, Nbu, TrajoOrdenStatus, PreauthStatus } from "@/types"
import { getTrajoOrdenInfo } from "@/lib/protocol-order"
import { getPaymentStatusInfo, getPreauthStatusInfo } from "@/lib/status-styles"

interface ProtocolDetailsSectionProps {
  patientName: string
  doctorName: string
  insuranceName: string
  affiliateNumber?: string
  sendMethodName: string
  paymentStatus?: PaymentStatus | null
  balance: number
  amountDue: string
  amountPending: string
  patientPaid: string
  amountToReturn: string
  insuranceUbValue?: string
  privateUbValue?: string
  isPrinted?: boolean
  trajoOrden?: TrajoOrdenStatus | boolean
  preauthStatus?: PreauthStatus
  isInPatient?: boolean
  analysesAmountDue?: string
  coseguroAmount?: string
  materialDescartableAmount?: string
  derivacionAmount?: string
  extrasTotal?: string
  nbu?: Nbu | null
  showOrderButton?: boolean
  orderDisabledReason?: string
  showPreauthButton?: boolean
  preauthDisabledReason?: string
  onOpenHistoryDialog: () => void
  onSetOrder?: () => void
  onApplyPreauthorization?: () => void
}

export function ProtocolDetailsSection({
  patientName,
  doctorName,
  insuranceName,
  affiliateNumber,
  sendMethodName,
  paymentStatus,
  insuranceUbValue,
  privateUbValue,
  isPrinted,
  trajoOrden,
  preauthStatus,
  isInPatient,
  analysesAmountDue,
  coseguroAmount,
  materialDescartableAmount,
  derivacionAmount,
  extrasTotal,
  nbu,
  showOrderButton = false,
  orderDisabledReason,
  showPreauthButton = false,
  preauthDisabledReason,
  onOpenHistoryDialog,
  onSetOrder,
  onApplyPreauthorization,
  amountDue,
  amountPending,
  patientPaid,
  amountToReturn,
}: ProtocolDetailsSectionProps) {
  const paymentStatusInfo = getPaymentStatusInfo(paymentStatus)

  const due = Number.parseFloat(amountDue || "0")
  const pending = Number.parseFloat(amountPending || "0")
  const paid = Number.parseFloat(patientPaid || "0")
  const toReturn = Number.parseFloat(amountToReturn || "0")
  const analyses = Number.parseFloat(analysesAmountDue || "0")
  const coseguro = Number.parseFloat(coseguroAmount || "0")
  const material = Number.parseFloat(materialDescartableAmount || "0")
  const derivacion = Number.parseFloat(derivacionAmount || "0")
  const extras = Number.parseFloat(extrasTotal || "0")
  const hasExtras = coseguro > 0 || material > 0 || derivacion > 0
  const nbuName = nbu && typeof nbu === "object" && "name" in nbu ? nbu.name : null
  const trajoOrdenInfo = getTrajoOrdenInfo(trajoOrden)
  const preauthInfo = getPreauthStatusInfo(preauthStatus)
  const renderDisabledTooltip = (reason: string | undefined, children: React.ReactNode) => {
    if (!reason) return children

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{children}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] bg-slate-900 text-white">
          <p>{reason}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="space-y-4 mt-4">
      {/* // Improved responsive grid layout */}
      <div className="grid grid-cols-1 gap-3">
        <div className="flex items-center gap-3 text-sm">
          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-gray-600 w-28 flex-shrink-0">Paciente:</span>
          <span className="font-medium truncate">{patientName}</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-gray-600 w-28 flex-shrink-0">Médico:</span>
          <span className="font-medium truncate">{doctorName}</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-gray-600 w-28 flex-shrink-0">Obra Social:</span>
          <span className="font-medium truncate">{insuranceName}</span>
        </div>

        {affiliateNumber && (
          <div className="flex items-center gap-3 text-sm">
            <CreditCard className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 w-28 flex-shrink-0">N° Afiliado:</span>
            <span className="font-medium">{affiliateNumber}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-sm">
          <Send className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-gray-600 w-28 flex-shrink-0">Envío:</span>
          <span className="font-medium">{sendMethodName}</span>
        </div>

        {trajoOrden !== undefined && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <ClipboardCheck className={`h-4 w-4 flex-shrink-0 ${trajoOrdenInfo.iconClassName}`} />
            <span className="text-gray-600 w-28 flex-shrink-0">Orden médica:</span>
            <Badge
              variant="outline"
              className={`${trajoOrdenInfo.badgeClassName}`}
            >
              {trajoOrdenInfo.label}
            </Badge>
            {showOrderButton && renderDisabledTooltip(
              orderDisabledReason,
              <Button
                size="sm"
                variant="outline"
                disabled={Boolean(orderDisabledReason)}
                onClick={(e) => {
                  e.stopPropagation()
                  if (orderDisabledReason) return
                  onSetOrder?.()
                }}
                className="h-7 border-[#204983] bg-white px-2 text-xs text-[#204983] hover:bg-[#204983] hover:text-white disabled:opacity-60"
                data-no-expand
              >
                <ClipboardCheck className="h-3 w-3 mr-1" />
                Modificar
              </Button>,
            )}
          </div>
        )}

        {preauthStatus && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <ShieldCheck className={`h-4 w-4 flex-shrink-0 ${preauthInfo.iconClassName}`} />
            <span className="text-gray-600 w-28 flex-shrink-0 whitespace-nowrap">Preautorización:</span>
            <Badge variant="outline" className={`${preauthInfo.badge}`}>
              {preauthInfo.label}
            </Badge>
            {showPreauthButton && renderDisabledTooltip(
              preauthDisabledReason,
              <Button
                size="sm"
                variant="outline"
                disabled={Boolean(preauthDisabledReason)}
                onClick={(e) => {
                  e.stopPropagation()
                  if (preauthDisabledReason) return
                  onApplyPreauthorization?.()
                }}
                className="h-7 border-indigo-600 bg-white px-2 text-xs text-indigo-700 hover:bg-indigo-600 hover:text-white disabled:opacity-60"
                data-no-expand
              >
                <ShieldCheck className="h-3 w-3 mr-1" />
                Modificar
              </Button>,
            )}
          </div>
        )}

        {isInPatient && (
          <div className="flex items-center gap-3 text-sm">
            <BedDouble className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <span className="text-gray-600 w-28 flex-shrink-0">Paciente:</span>
            <Badge className="bg-violet-100 text-violet-700">Internado</Badge>
          </div>
        )}

        {nbuName && (
          <div className="flex items-center gap-3 text-sm">
            <BookOpen className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 w-28 flex-shrink-0">Nomenclador:</span>
            <span className="font-medium">{nbuName}</span>
          </div>
        )}

        {(analyses > 0 || hasExtras) && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-gray-700">Desglose de importes</p>
            {analyses > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Análisis particulares</span>
                <span className="font-medium">${analyses.toFixed(2)}</span>
              </div>
            )}
            {coseguro > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Coseguro</span>
                <span className="font-medium">${coseguro.toFixed(2)}</span>
              </div>
            )}
            {material > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Material descartable</span>
                <span className="font-medium">${material.toFixed(2)}</span>
              </div>
            )}
            {derivacion > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Derivación</span>
                <span className="font-medium">${derivacion.toFixed(2)}</span>
              </div>
            )}
            {extras > 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200">
                <span className="text-gray-600">Total extras</span>
                <span className="font-medium">${extras.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 text-sm">
          <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-gray-600 w-28 flex-shrink-0">Total a pagar:</span>
          <span className="font-medium">${due.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-gray-600 w-28 flex-shrink-0">Pagado:</span>
          <span className="font-medium text-emerald-600">${paid.toFixed(2)}</span>
        </div>

        {pending > 0 && (
          <div className="flex items-center gap-3 text-sm">
            <DollarSign className="h-4 w-4 text-orange-500 flex-shrink-0" />
            <span className="text-gray-600 w-28 flex-shrink-0">Pendiente:</span>
            <span className="font-medium text-orange-600">${pending.toFixed(2)}</span>
          </div>
        )}

        {toReturn > 0 && (
          <div className="flex items-center gap-3 text-sm">
            <DollarSign className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <span className="text-gray-600 w-28 flex-shrink-0">A devolver:</span>
            <span className="font-medium text-amber-600">${toReturn.toFixed(2)}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-sm">
          <CreditCard className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-gray-600 w-28 flex-shrink-0">Estado Pago:</span>
          <Badge className={`${paymentStatusInfo.bgColor} ${paymentStatusInfo.color}`}>{paymentStatusInfo.label}</Badge>
        </div>

        {insuranceUbValue && (
          <div className="flex items-center gap-3 text-sm">
            <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 w-28 flex-shrink-0">UB O.Social:</span>
            <span className="font-medium">${insuranceUbValue}</span>
          </div>
        )}

        {privateUbValue && (
          <div className="flex items-center gap-3 text-sm">
            <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 w-28 flex-shrink-0">UB Particular:</span>
            <span className="font-medium">${privateUbValue}</span>
          </div>
        )}

        {isPrinted !== undefined && (
          <div className="flex items-center gap-3 text-sm">
            <Printer className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 w-28 flex-shrink-0">Impreso/Enviado:</span>
            <Badge variant={isPrinted ? "default" : "secondary"}>{isPrinted ? "Sí" : "No"}</Badge>
          </div>
        )}
      </div>

      <div className="pt-4 pb-4 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <History className="h-4 w-4 text-gray-400" />
            Historial de Cambios
          </h4>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onOpenHistoryDialog()
            }}
            className="text-xs w-full sm:w-auto"
            data-no-expand
          >
            <History className="h-3 w-3 mr-1" />
            Ver Historial
          </Button>
        </div>
      </div>
    </div>
  )
}
