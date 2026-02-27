"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Card, CardContent } from "../../ui/card"
import { useApi } from "../../../hooks/use-api"
import { toast } from "sonner"
import { PROTOCOL_ENDPOINTS, REPORTING_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import type {
  ProtocolListItem,
  ProtocolDetail as ProtocolDetailType,
  SendMethod,
  HistoryEntry,
  PaymentStatus,
  ProtocolStatus,
} from "@/types"

// Componentes modulares
import { ProtocolHeader } from "./protocol-header"
import { ProtocolDetailsSection } from "./protocol-details-section"
import { ProtocolActions } from "./protocol-actions"
import { PaymentDialog, AnalysisDialog, AuditDialog, EditDialog, ReportDialog } from "./dialogs"
import { ProtocolHistoryDialog } from "./dialogs/protocol-history-dialog"

interface ProtocolDetailResponse {
  id: number
  patient: {
    id: number
    dni: string
    first_name: string
    last_name: string
  }
  doctor: {
    id: number
    first_name: string
    last_name: string
    license: string
  }
  insurance: {
    id: number
    name: string
  }
  affiliate_number?: string
  status: ProtocolStatus
  send_method: {
    id: number
    name: string
  }
  // New payment fields
  insurance_total_to_pay: string
  private_total_to_pay: string
  estimated_total_to_earn: string
  total_earned: string
  value_paid: string
  payment_status: PaymentStatus
  patient_to_lab_amount: string
  lab_to_patient_amount: string
  insurance_ub_value: string
  private_ub_value: string
  is_printed: boolean
  is_active: boolean
  details: ProtocolDetailType[]
  history?: HistoryEntry[]
  total_changes?: number
}

interface ProtocolCardProps {
  protocol: ProtocolListItem
  onUpdate: () => void
  sendMethods?: SendMethod[]
  isSelectionMode?: boolean
  isSelected?: boolean
  onToggleSelection?: (id: number) => void
}

export function ProtocolCard({
  protocol,
  onUpdate,
  sendMethods = [],
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
}: ProtocolCardProps) {
  const { apiRequest } = useApi()
  const [isExpanded, setIsExpanded] = useState(false)
  const [protocolDetail, setProtocolDetail] = useState<ProtocolDetailResponse | null>(null)
  const [protocolDetails, setProtocolDetails] = useState<ProtocolDetailType[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [loadingAnalyses, setLoadingAnalyses] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false)
  const [updatingDetailId, setUpdatingDetailId] = useState<number | null>(null)

  const [auditDialogOpen, setAuditDialogOpen] = useState(false)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    send_method: "",
    affiliate_number: "",
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportType, setReportType] = useState<"full" | "summary">("full")
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)

  // Helper function to extract error messages from backend responses
  const extractErrorMessage = (error: unknown, defaultMessage: string): string => {
    if (error && typeof error === "object") {
      const err = error as Record<string, unknown>
      if (typeof err.detail === "string") return err.detail
      if (typeof err.error === "string") return err.error
      if (typeof err.message === "string") return err.message
      // Check for field-specific errors
      for (const key in err) {
        if (Array.isArray(err[key]) && err[key].length > 0) {
          return `${key}: ${err[key][0]}`
        }
      }
    }
    return defaultMessage
  }

  const refreshProtocolDetail = useCallback(async () => {
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAIL(protocol.id))
      if (response.ok) {
        const data: ProtocolDetailResponse = await response.json()
        setProtocolDetail(data)
      }
    } catch (error) {
      console.error("Error refreshing protocol detail:", error)
    }
  }, [apiRequest, protocol.id])

  const fetchProtocolDetail = async () => {
    if (protocolDetail) return

    setLoadingDetail(true)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAIL(protocol.id))

      if (response.ok) {
        const data: ProtocolDetailResponse = await response.json()
        setProtocolDetail(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error fetching protocol detail"))
      }
    } catch (error) {
      console.error("Error fetching protocol detail:", error)
      const message = error instanceof Error ? error.message : "Error al cargar los detalles del protocolo"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleExpand = async () => {
    if (!isExpanded) {
      await fetchProtocolDetail()
    }
    setIsExpanded(!isExpanded)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-expand]")) {
      return
    }
    if (isSelectionMode) {
      onToggleSelection?.(protocol.id)
      return
    }
    handleExpand()
  }

  const handleAnalysisDialog = async () => {
    if (protocolDetails.length === 0) {
      setLoadingAnalyses(true)
      try {
        const response = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAILS(protocol.id))

        if (response.ok) {
          const data: ProtocolDetailType[] = await response.json()
          setProtocolDetails(data)
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(extractErrorMessage(errorData, "Error fetching protocol details"))
        }
      } catch (error) {
        console.error("Error fetching protocol details:", error)
        const message = error instanceof Error ? error.message : "Error al cargar los análisis del protocolo"
        toast.error(message, { duration: TOAST_DURATION })
        return
      } finally {
        setLoadingAnalyses(false)
      }
    }
    setAnalysisDialogOpen(true)
  }

  const handleCancelProtocol = async () => {
    setIsCancelling(true)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAIL(protocol.id), {
        method: "DELETE",
      })

      if (response.status === 204 || response.ok) {
        toast.success("Protocolo cancelado exitosamente", { duration: TOAST_DURATION })
        onUpdate()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error cancelling protocol"))
      }
    } catch (error) {
      console.error("Error cancelling protocol:", error)
      const message = error instanceof Error ? error.message : "Error al cancelar el protocolo"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsCancelling(false)
    }
  }

  const handleOpenPaymentDialog = async () => {
    if (!protocolDetail) {
      await fetchProtocolDetail()
    }
    setPaymentAmount("")
    setPaymentDialogOpen(true)
  }

  const handleProcessPayment = async () => {
    const amount = Number.parseFloat(paymentAmount)
    const patientDebt = protocolDetail ? Number.parseFloat(protocolDetail.patient_to_lab_amount) : 0

    if (isNaN(amount) || amount <= 0) {
      toast.error("Ingrese un monto válido", { duration: TOAST_DURATION })
      return
    }

    if (amount > patientDebt) {
      toast.error(`El monto no puede superar la deuda pendiente ($${patientDebt.toFixed(2)})`, {
        duration: TOAST_DURATION,
      })
      return
    }

    setIsProcessingPayment(true)
    try {
      const currentValuePaid = protocolDetail ? Number.parseFloat(protocolDetail.value_paid) : 0
      const newValuePaid = currentValuePaid + amount

      const response = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAIL(protocol.id), {
        method: "PATCH",
        body: { value_paid: newValuePaid.toFixed(2) },
      })

      if (response.ok) {
        toast.success(`Pago de $${amount.toFixed(2)} registrado exitosamente`, { duration: TOAST_DURATION })
        setPaymentDialogOpen(false)
        setPaymentAmount("")
        await refreshProtocolDetail()
        onUpdate()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error processing payment"))
      }
    } catch (error) {
      console.error("Error processing payment:", error)
      const message = error instanceof Error ? error.message : "Error al procesar el pago"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const handleSettleDebt = async () => {
    if (!protocolDetail) {
      await fetchProtocolDetail()
    }

    setIsProcessingPayment(true)
    try {
      const privateTotalToPay = protocolDetail ? Number.parseFloat(protocolDetail.private_total_to_pay) : 0

      const response = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAIL(protocol.id), {
        method: "PATCH",
        body: { value_paid: privateTotalToPay.toFixed(2) },
      })

      if (response.ok) {
        const labOwes = protocolDetail ? Number.parseFloat(protocolDetail.lab_to_patient_amount) : 0
        toast.success(`Reembolso completado. Se devolvieron $${labOwes.toFixed(2)} al paciente`, {
          duration: TOAST_DURATION,
        })
        await refreshProtocolDetail()
        onUpdate()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error settling debt"))
      }
    } catch (error) {
      console.error("Error settling debt:", error)
      const message = error instanceof Error ? error.message : "Error al realizar el reembolso"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const handleOpenEditDialog = async () => {
    if (!protocolDetail) {
      await fetchProtocolDetail()
    }
    if (protocolDetail) {
      setEditFormData({
        send_method: protocolDetail.send_method.id.toString(),
        affiliate_number: protocolDetail.affiliate_number || "",
      })
    }
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    setIsSavingEdit(true)
    try {
      const updateData: Record<string, unknown> = {}

      if (editFormData.send_method !== protocolDetail?.send_method.id.toString()) {
        updateData.send_method = Number.parseInt(editFormData.send_method)
      }
      if (editFormData.affiliate_number !== (protocolDetail?.affiliate_number || "")) {
        updateData.affiliate_number = editFormData.affiliate_number
      }

      if (Object.keys(updateData).length === 0) {
        toast.info("No hay cambios para guardar", { duration: TOAST_DURATION })
        setEditDialogOpen(false)
        return
      }

      const response = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAIL(protocol.id), {
        method: "PATCH",
        body: updateData,
      })

      if (response.ok) {
        toast.success("Protocolo actualizado exitosamente", { duration: TOAST_DURATION })
        setEditDialogOpen(false)
        await refreshProtocolDetail()
        onUpdate()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error updating protocol"))
      }
    } catch (error) {
      console.error("Error updating protocol:", error)
      const message = error instanceof Error ? error.message : "Error al actualizar el protocolo"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)
    try {
      const response = await apiRequest(REPORTING_ENDPOINTS.PRINT(protocol.id, reportType), {
        method: "POST",
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const printWindow = window.open(url, "_blank")
        if (printWindow) {
          printWindow.addEventListener("load", () => {
            printWindow.print()
          })
        }
        toast.success("Reporte generado exitosamente", { duration: TOAST_DURATION })
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error generating report"))
      }
    } catch (error) {
      console.error("Error generating report:", error)
      const message = error instanceof Error ? error.message : "Error al generar el reporte"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleSendEmail = async () => {
    setIsSendingEmail(true)
    try {
      const response = await apiRequest(REPORTING_ENDPOINTS.SEND_EMAIL(protocol.id, reportType), {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.detail || "Email enviado exitosamente", { duration: TOAST_DURATION })
        setReportDialogOpen(false)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error sending email"))
      }
    } catch (error) {
      console.error("Error sending email:", error)
      const message = error instanceof Error ? error.message : "Error al enviar el email"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleSendWhatsApp = async () => {
    setIsSendingWhatsApp(true)
    try {
      const response = await apiRequest(REPORTING_ENDPOINTS.SEND_WHATSAPP(protocol.id, reportType), {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.detail || "WhatsApp enviado exitosamente", { duration: TOAST_DURATION })
        setReportDialogOpen(false)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error sending WhatsApp"))
      }
    } catch (error) {
      console.error("Error sending WhatsApp:", error)
      const message = error instanceof Error ? error.message : "Error al enviar el WhatsApp"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  const handleToggleAuthorization = async (detail: ProtocolDetailType) => {
    setUpdatingDetailId(detail.id)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAIL_UPDATE(protocol.id, detail.id), {
        method: "PATCH",
        body: { is_authorized: !detail.is_authorized },
      })

      if (response.ok) {
        setProtocolDetails((prev) =>
          prev.map((d) => (d.id === detail.id ? { ...d, is_authorized: !d.is_authorized } : d)),
        )
        toast.success(`Análisis ${!detail.is_authorized ? "autorizado" : "desautorizado"} exitosamente`, {
          duration: TOAST_DURATION,
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error updating authorization"))
      }
    } catch (error) {
      console.error("Error updating authorization:", error)
      const message = error instanceof Error ? error.message : "Error al actualizar la autorización"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setUpdatingDetailId(null)
    }
  }

  const handleAnalysisDialogClose = async (open: boolean) => {
    setAnalysisDialogOpen(open)
    if (!open) {
      // Refresh protocol detail when dialog closes
      await refreshProtocolDetail()
    }
  }

  const getPatientName = () => {
    if (protocol.patient && typeof protocol.patient === "object") {
      return `${protocol.patient.first_name || ""} ${protocol.patient.last_name || ""}`.trim() || "Sin nombre"
    }
    return "Sin nombre"
  }

  const getDoctorName = () => {
    if (protocolDetail?.doctor) {
      return `Dr. ${protocolDetail.doctor.first_name} ${protocolDetail.doctor.last_name}`.trim()
    }
    return "Cargando..."
  }

  const getInsuranceName = () => {
    if (protocolDetail?.insurance) {
      return protocolDetail.insurance.name
    }
    return "Cargando..."
  }

  const getSendMethodName = () => {
    if (protocolDetail?.send_method) {
      return protocolDetail.send_method.name
    }
    return "Cargando..."
  }

  const statusId = protocol.status?.id ?? 0
  const canBeCancelled = statusId !== 4 && statusId !== 5 && statusId !== 7
  const isEditable = statusId !== 4 && statusId !== 5 && statusId !== 7
  const showReports = statusId !== 4

  const patientDebt = protocolDetail ? Number.parseFloat(protocolDetail.patient_to_lab_amount) : 0
  const labDebt = protocolDetail ? Number.parseFloat(protocolDetail.lab_to_patient_amount) : 0
  const balance = Number.parseFloat(protocol.balance || "0")
  const hasPatientDebt = patientDebt > 0
  const labOwesPatient = labDebt > 0

  const getBorderColor = (statusId: number): string => {
    const borderColors: Record<number, string> = {
      1: "border-l-yellow-500", // Pendiente de carga
      2: "border-l-blue-500", // Pendiente de validación
      3: "border-l-orange-500", // Pago incompleto
      4: "border-l-red-500", // Cancelado
      5: "border-l-green-500", // Completado
      6: "border-l-purple-500", // Pendiente de Retiro
      7: "border-l-rose-500", // Envío fallido
      8: "border-l-teal-500", // Pendiente de Facturación
    }
    return borderColors[statusId] || "border-l-gray-500"
  }

  return (
    <>
      <Card
        className={`transition-all duration-300 shadow-sm hover:shadow-lg cursor-pointer bg-white ${
          isExpanded ? "ring-2 ring-[#204983] ring-opacity-20" : ""
        } ${isSelected ? "ring-2 ring-[#204983]" : ""} border-l-4 ${getBorderColor(statusId)}`}
        onClick={handleCardClick}
      >
        <CardContent className="p-4 pb-3">
          {isSelectionMode && (
            <div className="flex items-center mb-2" data-no-expand>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSelection?.(protocol.id)
                }}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-[#204983] border-[#204983]"
                      : "border-gray-300 hover:border-[#204983]"
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span>Protocolo #{protocol.id}</span>
              </button>
            </div>
          )}
          <ProtocolHeader
            protocolId={protocol.id}
            status={protocol.status}
            patientName={getPatientName()}
            paymentStatus={protocol.payment_status}
            balance={balance}
            isPrinted={protocol.is_printed}
            canRegisterPayment={hasPatientDebt && canBeCancelled}
            labOwesPatient={labOwesPatient && canBeCancelled}
            isExpanded={isExpanded}
            creation={protocol.creation}
            lastChange={protocol.last_change}
            onRegisterPayment={handleOpenPaymentDialog}
            onSettleDebt={handleSettleDebt}
          />
        </CardContent>

        {isExpanded && (
          <CardContent className="px-4 pb-4 pt-0 border-t border-gray-100">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#204983]"></div>
              </div>
            ) : (
              <>
                <ProtocolDetailsSection
                  patientName={getPatientName()}
                  doctorName={getDoctorName()}
                  insuranceName={getInsuranceName()}
                  affiliateNumber={protocolDetail?.affiliate_number}
                  sendMethodName={getSendMethodName()}
                  valuePaid={protocolDetail?.value_paid || "0"}
                  paymentStatus={protocol.payment_status}
                  balance={balance}
                  insuranceUbValue={protocolDetail?.insurance_ub_value}
                  privateUbValue={protocolDetail?.private_ub_value}
                  isPrinted={protocolDetail?.is_printed}
                  onOpenHistoryDialog={() => setHistoryDialogOpen(true)}
                  // New payment fields
                  insuranceTotalToPay={protocolDetail?.insurance_total_to_pay}
                  privateTotalToPay={protocolDetail?.private_total_to_pay}
                  patientToLabAmount={protocolDetail?.patient_to_lab_amount}
                  labToPatientAmount={protocolDetail?.lab_to_patient_amount}
                />
                <ProtocolActions
                  protocolId={protocol.id}
                  canBeCancelled={canBeCancelled}
                  isEditable={isEditable}
                  showReports={showReports}
                  isCancelling={isCancelling}
                  onViewAnalysis={handleAnalysisDialog}
                  onEdit={handleOpenEditDialog}
                  onReports={() => setReportDialogOpen(true)}
                  onCancel={handleCancelProtocol}
                />
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* Dialogs */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        protocolId={protocol.id}
        balance={patientDebt}
        valuePaid={protocolDetail?.value_paid || "0"}
        paymentAmount={paymentAmount}
        onPaymentAmountChange={setPaymentAmount}
        onConfirm={handleProcessPayment}
        isProcessing={isProcessingPayment}
      />

      <AnalysisDialog
        open={analysisDialogOpen}
        onOpenChange={handleAnalysisDialogClose}
        protocolId={protocol.id}
        protocolNumber={protocol.id}
        details={protocolDetails}
        isLoading={loadingAnalyses}
        updatingDetailId={updatingDetailId}
        onToggleAuthorization={handleToggleAuthorization}
        isEditable={isEditable}
        insuranceId={protocolDetail?.insurance?.id}
      />

      <AuditDialog
        open={auditDialogOpen}
        onOpenChange={setAuditDialogOpen}
        protocolId={protocol.id}
        protocolNumber={protocol.id}
        history={protocolDetail?.history}
        totalChanges={protocolDetail?.total_changes}
        isLoading={loadingDetail}
      />

      <EditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        protocolId={protocol.id}
        formData={editFormData}
        onFormDataChange={setEditFormData}
        sendMethods={sendMethods}
        onSave={handleSaveEdit}
        isSaving={isSavingEdit}
        insuranceId={protocolDetail?.insurance?.id}
      />

      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        protocolId={protocol.id}
        reportType={reportType}
        onReportTypeChange={setReportType}
        onGenerateReport={handleGenerateReport}
        onSendEmail={handleSendEmail}
        onSendWhatsApp={handleSendWhatsApp}
        isGenerating={isGeneratingReport}
        isSending={isSendingEmail}
        isSendingWhatsApp={isSendingWhatsApp}
      />

      <ProtocolHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        protocolId={protocol.id}
        protocolNumber={protocol.id}
        history={protocolDetail?.history}
        totalChanges={protocolDetail?.total_changes}
        isLoading={loadingDetail}
      />
    </>
  )
}
