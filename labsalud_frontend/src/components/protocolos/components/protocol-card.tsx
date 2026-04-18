"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Card, CardContent } from "../../ui/card"
import { Skeleton } from "../../ui/skeleton"
import { useApi } from "../../../hooks/use-api"
import { toast } from "sonner"
import { PROTOCOL_ENDPOINTS, REPORTING_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog"
import type {
  ProtocolListItem,
  ProtocolDetail as ProtocolDetailType,
  SendMethod,
  HistoryEntry,
  PaymentStatus,
  BillingStatus,
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
  insurance_ub_value: string
  private_ub_value: string
  // Payment fields (new API format)
  amount_due: string
  amount_pending: string
  patient_paid: string
  amount_to_return: string
  payment_status: PaymentStatus
  billing_status?: BillingStatus
  is_printed: boolean
  is_active: boolean
  details: ProtocolDetailType[]
  history?: HistoryEntry[]
  total_changes?: number
}

type ReportProtocolDetail = ProtocolDetailType & {
  is_sent?: boolean
  is_valid?: boolean
}

const EXCLUDED_REPORT_ANALYSIS_CODES = new Set([660001, 661001])

const isSelectableForReport = (analysis: ReportProtocolDetail) => {
  return !EXCLUDED_REPORT_ANALYSIS_CODES.has(analysis.code) && analysis.is_valid !== false
}

const isReportableAnalysis = (analysis: ReportProtocolDetail) => {
  return !EXCLUDED_REPORT_ANALYSIS_CODES.has(analysis.code)
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
  const [protocolDetails, setProtocolDetails] = useState<ReportProtocolDetail[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [loadingAnalyses, setLoadingAnalyses] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isArcaBilling, setIsArcaBilling] = useState(false)

  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
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
  const [reportDate, setReportDate] = useState("")
  const [reportTime, setReportTime] = useState("")
  const [reportCustomizationOpen, setReportCustomizationOpen] = useState(false)
  const [selectedReportAnalysisIds, setSelectedReportAnalysisIds] = useState<number[]>([])
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isDownloadingReport, setIsDownloadingReport] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const [sendConfirmationOpen, setSendConfirmationOpen] = useState(false)
  const [pendingSendMethod, setPendingSendMethod] = useState<"email" | "whatsapp" | null>(null)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)

  const handleReportDateChange = (newDate: string) => {
    setReportDate(newDate)
  }

  const handleClearReportDateTime = () => {
    setReportDate("")
    setReportTime("")
  }

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

  const getReportRequestOptions = () => {
    const date = reportDate.trim()
    const time = reportTime.trim()
    const reportableAnalyses = protocolDetails.filter(isReportableAnalysis)
    const includedAnalysisIds = selectedReportAnalysisIds.filter((analysisId) =>
      reportableAnalyses.some((analysis) => analysis.id === analysisId),
    )
    const excludedAnalysisIds = reportableAnalyses
      .filter((analysis) => !includedAnalysisIds.includes(analysis.id))
      .map((analysis) => analysis.id)

    if (!date && !time) {
      return {
        method: "POST" as const,
        body: {
          analysis_ids: includedAnalysisIds,
          exclude_analysis_ids: excludedAnalysisIds,
        },
      }
    }

    const body: Record<string, unknown> = {}
    if (date) body.protocol_date = date
    if (time) body.protocol_time = time
    body.analysis_ids = includedAnalysisIds
    body.exclude_analysis_ids = excludedAnalysisIds

    return {
      method: "POST" as const,
      body,
    }
  }

  const loadProtocolAnalyses = useCallback(async (): Promise<ReportProtocolDetail[] | null> => {
    if (protocolDetails.length > 0) {
      return protocolDetails
    }

    setLoadingAnalyses(true)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAILS(protocol.id))

      if (response.ok) {
        const data: ReportProtocolDetail[] = await response.json()
        setProtocolDetails(data)
        return data
      }

      const errorData = await response.json().catch(() => ({}))
      throw new Error(extractErrorMessage(errorData, "Error fetching protocol details"))
    } catch (error) {
      console.error("Error fetching protocol details:", error)
      const message = error instanceof Error ? error.message : "Error al cargar los análisis del protocolo"
      toast.error(message, { duration: TOAST_DURATION })
      return null
    } finally {
      setLoadingAnalyses(false)
    }
  }, [apiRequest, protocol.id, protocolDetails])

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
    const analyses = await loadProtocolAnalyses()
    if (!analyses) {
      return
    }
    setAnalysisDialogOpen(true)
  }

  const handleOpenReportDialog = async () => {
    const analyses = await loadProtocolAnalyses()
    if (!analyses) {
      return
    }

    setSelectedReportAnalysisIds(analyses.filter(isSelectableForReport).map((analysis) => analysis.id))
    setReportCustomizationOpen(false)
    setReportDialogOpen(true)
  }

  const handleToggleReportAnalysis = (analysisId: number) => {
    const analysis = protocolDetails.find((item) => item.id === analysisId)
    if (!analysis || !isSelectableForReport(analysis)) {
      return
    }

    setSelectedReportAnalysisIds((prev) =>
      prev.includes(analysisId) ? prev.filter((id) => id !== analysisId) : [...prev, analysisId],
    )
  }

  const handleReportDialogOpenChange = (open: boolean) => {
    setReportDialogOpen(open)
    if (!open) {
      setReportCustomizationOpen(false)
    }
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

  const handleArcaBilling = async () => {
    setIsArcaBilling(true)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.ARCA_BILLING(protocol.id), {
        method: "POST",
        body: { bill_to: "patient" },
      })

      if (response.ok) {
        const data = await response.json().catch(() => ({}))
        toast.success(data.detail || "Facturación ARCA generada exitosamente", { duration: TOAST_DURATION })
        await refreshProtocolDetail()
        onUpdate()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "No se pudo facturar a ARCA"))
      }
    } catch (error) {
      console.error("Error ARCA billing:", error)
      const message = error instanceof Error ? error.message : "Error al emitir facturación ARCA"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsArcaBilling(false)
    }
  }

  const handleOpenPaymentDialog = async () => {
    if (!protocolDetail) {
      await fetchProtocolDetail()
    }
    setPaymentDialogOpen(true)
  }

  const handleRegularizeBalance = async (amount: number, operation: "patient_paid" | "refunded_to_patient"): Promise<boolean> => {
    setIsProcessingPayment(true)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.REGULARIZE_BALANCE(protocol.id), {
        method: "POST",
        body: { operation, amount: amount.toFixed(2) },
      })

      if (response.ok) {
        const label = operation === "patient_paid" ? "Pago" : "Devolucion"
        toast.success(`${label} de $${amount.toFixed(2)} registrado exitosamente`, { duration: TOAST_DURATION })
        await refreshProtocolDetail()
        onUpdate()
        return true
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, `Error al registrar ${operation === "patient_paid" ? "pago" : "devolucion"}`))
      }
    } catch (error) {
      console.error("Error regularize balance:", error)
      const message = error instanceof Error ? error.message : "Error al procesar la operacion"
      toast.error(message, { duration: TOAST_DURATION })
      return false
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
      const response = await apiRequest(REPORTING_ENDPOINTS.PRINT(protocol.id, reportType), getReportRequestOptions())

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)

        const previewLink = document.createElement("a")
        previewLink.href = url
        previewLink.target = "_blank"
        previewLink.rel = "noopener noreferrer"
        document.body.appendChild(previewLink)
        previewLink.click()
        previewLink.remove()

        // Liberar el blob URL después de darle tiempo a que cargue la vista previa.
        setTimeout(() => {
          window.URL.revokeObjectURL(url)
        }, 30000)

        toast.success("Reporte listo para imprimir", { duration: TOAST_DURATION })
        setReportDialogOpen(false)
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

  const handleDownloadReport = async () => {
    setIsDownloadingReport(true)

    try {
      const response = await apiRequest(REPORTING_ENDPOINTS.PRINT(protocol.id, reportType), getReportRequestOptions())

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const reportDate = new Date().toISOString().slice(0, 10)
        const fileName = `reporte_labsalud_${protocol.id}_${reportDate}.pdf`

        // Crear link de descarga
        const link = document.createElement("a")
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)

        toast.success("Reporte descargado exitosamente", { duration: TOAST_DURATION })
        setReportDialogOpen(false)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error downloading report"))
      }
    } catch (error) {
      console.error("Error downloading report:", error)
      const message = error instanceof Error ? error.message : "Error al descargar el reporte"
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsDownloadingReport(false)
    }
  }

  const executeSendEmail = async () => {
    setIsSendingEmail(true)
    try {
      const response = await apiRequest(REPORTING_ENDPOINTS.SEND_EMAIL(protocol.id, reportType), getReportRequestOptions())

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

  const executeSendWhatsApp = async () => {
    setIsSendingWhatsApp(true)
    try {
      const response = await apiRequest(REPORTING_ENDPOINTS.SEND_WHATSAPP(protocol.id, reportType), getReportRequestOptions())

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

  const handleSendEmail = () => {
    setPendingSendMethod("email")
    setSendConfirmationOpen(true)
  }

  const handleSendWhatsApp = () => {
    setPendingSendMethod("whatsapp")
    setSendConfirmationOpen(true)
  }

  const handleConfirmSend = async () => {
    setSendConfirmationOpen(false)
    const method = pendingSendMethod
    setPendingSendMethod(null)

    if (method === "email") {
      await executeSendEmail()
    }

    if (method === "whatsapp") {
      await executeSendWhatsApp()
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
  const canBeCancelled = statusId !== 4 && statusId !== 5 && statusId !== 7 && statusId !== 10
  const isEditable = statusId !== 4 && statusId !== 5 && statusId !== 7 && statusId !== 10
  const showReports = statusId !== 4

  const amountPending = protocolDetail ? Number.parseFloat(protocolDetail.amount_pending || "0") : 0
  const amountToReturn = protocolDetail ? Number.parseFloat(protocolDetail.amount_to_return || "0") : 0
  const balance = Number.parseFloat(protocol.balance || "0")
  const hasPatientDebt = amountPending > 0
  const labOwesPatient = amountToReturn > 0

  const getBorderColor = (statusId: number): string => {
    const borderColors: Record<number, string> = {
      1: "border-l-yellow-500", // Pendiente de carga
      2: "border-l-sky-500", // Pendiente de validación
      3: "border-l-orange-500", // Pago incompleto
      4: "border-l-red-500", // Cancelado
      5: "border-l-green-500", // Completado
      6: "border-l-purple-500", // Pendiente de Retiro
      7: "border-l-pink-500", // Envío fallido
      8: "border-l-teal-500", // Pendiente de Facturación
      10: "border-l-indigo-500", // Pendiente de envío
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
        <CardContent className="px-4 py-2.5 sm:py-3">
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
          />
        </CardContent>

        {isExpanded && (
          <CardContent className="px-4 pb-4 pt-0 border-t border-gray-100">
            {loadingDetail ? (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-3 w-20 rounded" />
                      <Skeleton className="h-5 w-full rounded" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-px w-full" />
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <ProtocolDetailsSection
                  patientName={getPatientName()}
                  doctorName={getDoctorName()}
                  insuranceName={getInsuranceName()}
                  affiliateNumber={protocolDetail?.affiliate_number}
                  sendMethodName={getSendMethodName()}
                  paymentStatus={protocol.payment_status}
                  balance={balance}
                  amountDue={protocolDetail?.amount_due || "0"}
                  amountPending={protocolDetail?.amount_pending || "0"}
                  patientPaid={protocolDetail?.patient_paid || "0"}
                  amountToReturn={protocolDetail?.amount_to_return || "0"}
                  insuranceUbValue={protocolDetail?.insurance_ub_value}
                  privateUbValue={protocolDetail?.private_ub_value}
                  isPrinted={protocolDetail?.is_printed}
                  onOpenHistoryDialog={() => setHistoryDialogOpen(true)}
                />
                <ProtocolActions
                  protocolId={protocol.id}
                  canBeCancelled={canBeCancelled}
                  isEditable={isEditable}
                  showReports={showReports}
                  isCancelling={isCancelling}
                  isArcaBilling={isArcaBilling}
                  onViewAnalysis={handleAnalysisDialog}
                  onEdit={handleOpenEditDialog}
                  onReports={handleOpenReportDialog}
                  onCancel={handleCancelProtocol}
                  onArcaBilling={handleArcaBilling}
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
        amountDue={protocolDetail?.amount_due || "0"}
        amountPending={protocolDetail?.amount_pending || "0"}
        patientPaid={protocolDetail?.patient_paid || "0"}
        amountToReturn={protocolDetail?.amount_to_return || "0"}
        paymentStatusName={protocolDetail?.payment_status?.name || protocol.payment_status?.name || ""}
        onRegularize={handleRegularizeBalance}
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
        onOpenChange={handleReportDialogOpenChange}
        protocolId={protocol.id}
        reportType={reportType}
        onReportTypeChange={setReportType}
        reportDate={reportDate}
        onReportDateChange={handleReportDateChange}
        reportTime={reportTime}
        onReportTimeChange={setReportTime}
        onClearDateTime={handleClearReportDateTime}
        analyses={protocolDetails}
        selectedAnalysisIds={selectedReportAnalysisIds}
        onToggleAnalysis={handleToggleReportAnalysis}
        customizationOpen={reportCustomizationOpen}
        onToggleCustomizationOpen={setReportCustomizationOpen}
        onGenerateReport={handleGenerateReport}
        onDownloadReport={handleDownloadReport}
        onSendEmail={handleSendEmail}
        onSendWhatsApp={handleSendWhatsApp}
        isGenerating={isGeneratingReport}
        isDownloading={isDownloadingReport}
        isSending={isSendingEmail}
        isSendingWhatsApp={isSendingWhatsApp}
      />

      <AlertDialog
        open={sendConfirmationOpen}
        onOpenChange={(open) => {
          setSendConfirmationOpen(open)
          if (!open) {
            setPendingSendMethod(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envío</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSendMethod === "email"
                ? "Vas a enviar el reporte por email. Confirmá para continuar."
                : "Vas a enviar el reporte por WhatsApp. Confirmá para continuar."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSendMethod(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
