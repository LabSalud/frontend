"use client"

import type React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import { Card, CardContent } from "../../ui/card"
import { Skeleton } from "../../ui/skeleton"
import { useApi } from "../../../hooks/use-api"
import { toast } from "sonner"
import { PROTOCOL_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import { PERMISSIONS } from "@/config/permissions"
import { ACTO_BIOQUIMICO_CODES } from "@/lib/acto-bioquimico"
import { Mail, MessageCircle } from "lucide-react"
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
  PreauthStatus,
  ReportSignature,
  ProtocolAuditEvent,
} from "@/types"

// Componentes modulares
import { useNavigate } from "react-router-dom"
import { ProtocolHeader } from "./protocol-header"
import { ProtocolDetailView } from "./protocol-detail-view"
import { ProtocolDetailsSection } from "./protocol-details-section"
import { ProtocolActions } from "./protocol-actions"
import {
  PaymentDialog,
  AnalysisDialog,
  AuditDialog,
  EditDialog,
  ReportDialog,
  CoseguroDialog,
  PreauthorizationDialog,
  OrderStatusDialog,
  ArcaBillingDialog,
  UnplannedTransactionsDialog,
} from "./dialogs"
import type { ArcaPayload } from "./dialogs"
import { ProtocolHistoryDialog } from "./dialogs/protocol-history-dialog"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import { useAuth } from "@/contexts/auth-context"
import { getProtocolStatusStyleByName } from "@/lib/status-styles"
import { TRAJO_ORDEN, normalizeTrajoOrden, type TrajoOrdenStatus } from "@/lib/protocol-order"

interface ProtocolDetailResponse {
  id: number
  patient: {
    id: number
    dni: string
    first_name: string
    last_name: string
    email?: string
    phone_mobile?: string
    alt_phone?: string
    is_anonymous?: boolean
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
    charges_coseguro?: boolean
    charges_material_descartable?: boolean
    charges_derivacion?: boolean
    requires_preauthorization?: boolean
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
  // Pricing breakdown (new fields)
  analyses_amount_due?: string
  coseguro_amount?: string
  material_descartable_amount?: string
  derivacion_amount?: string
  extras_total?: string
  unplanned_transactions?: import("@/types").UnplannedTransaction[]
  unplanned_charges_total?: string
  unplanned_payments_total?: string
  private_amount_due?: string
  nbu?: { id: number; name: string } | null
  payment_status: PaymentStatus
  billing_status?: BillingStatus
  is_printed: boolean
  trajo_orden: TrajoOrdenStatus
  preauth_status?: PreauthStatus
  preauth_reference?: string
  preauth_notes?: string
  is_in_patient?: boolean
  is_active: boolean
  created_at?: string
  completed_at?: string | null
  previous_status?: ProtocolStatus | null
  // ARCA
  is_arca_billed?: boolean
  arca_invoice_pdf_url?: string | null
  arca_cae?: string
  arca_cbte_number?: number | null
  details: ProtocolDetailType[]
  history?: HistoryEntry[]
  total_changes?: number
}

type ReportProtocolDetail = ProtocolDetailType

type ReportAction = "download" | "email" | "whatsapp" | "preview"

const EXCLUDED_REPORT_ANALYSIS_CODES = ACTO_BIOQUIMICO_CODES

// Incluible en el reporte: alcanza con tener resultados cargados (el backend
// imprime sólo los validados). Permite impresión parcial de análisis a medio validar.
const isSelectableForReport = (analysis: ReportProtocolDetail) => {
  return !EXCLUDED_REPORT_ANALYSIS_CODES.has(analysis.code) && analysis.is_loaded !== false
}

// Preselección por defecto: sólo los análisis totalmente validados.
const isDefaultReportSelected = (analysis: ReportProtocolDetail) => {
  return isSelectableForReport(analysis) && analysis.is_valid !== false
}

const isReportableAnalysis = (analysis: ReportProtocolDetail) => {
  return !EXCLUDED_REPORT_ANALYSIS_CODES.has(analysis.code)
}

interface ProtocolCardProps {
  protocol: ProtocolListItem
  onUpdate: () => void
  sendMethods?: SendMethod[]
  reportSignatures?: ReportSignature[]
  isSelected?: boolean
  onToggleSelection?: (id: number) => void
  /**
   * Render como contenido de página (`/protocolos/:id`) en vez de card de
   * listado: arranca expandido, sin chrome de card (cursor/hover/checkbox) ni
   * toggle de colapso. La lógica de acciones/diálogos se reutiliza tal cual.
   */
  pageMode?: boolean
  /** Detalle ya cargado por la página, para evitar un segundo fetch. */
  initialDetail?: ProtocolDetailResponse | null
  /** Abre el modal de reporte al montar (ej: venís del botón Reporte de la lista). */
  autoOpenReport?: boolean
}

export function ProtocolCard({
  protocol,
  onUpdate,
  sendMethods = [],
  reportSignatures = [],
  isSelected = false,
  onToggleSelection,
  pageMode = false,
  initialDetail = null,
  autoOpenReport = false,
}: ProtocolCardProps) {
  const { apiRequest } = useApi()
  const { hasPermission, user } = useAuth()
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(pageMode)
  const [protocolDetail, setProtocolDetail] = useState<ProtocolDetailResponse | null>(initialDetail)
  // Estado más fresco que la prop `protocol.status`: algunas acciones (autorizar
  // análisis, transacciones no planificadas) refrescan el detalle en segundo
  // plano sin pedirle al padre que recargue toda la lista. Mientras eso no pasa,
  // `liveStatus` es lo que se muestra; se descarta apenas la prop trae uno nuevo.
  const [liveStatus, setLiveStatus] = useState<ProtocolStatus | null>(null)
  useEffect(() => {
    setLiveStatus(null)
  }, [protocol.id, protocol.status?.id, protocol.status?.name])
  const [auditEvents, setAuditEvents] = useState<ProtocolAuditEvent[]>([])
  const [protocolDetails, setProtocolDetails] = useState<ReportProtocolDetail[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [loadingAnalyses, setLoadingAnalyses] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isUncancelling, setIsUncancelling] = useState(false)
  const [isArcaBilling, setIsArcaBilling] = useState(false)
  // El PDF de la factura ARCA ya no viene en el detalle del protocolo: se pide
  // bajo demanda a arca-detail/ (el detalle solo trae is_arca_billed/cae/cbte).
  const [arcaInvoicePdfUrl, setArcaInvoicePdfUrl] = useState<string | null>(null)
  const [coseguroDialogOpen, setCoseguroDialogOpen] = useState(false)
  const [isProcessingCoseguro, setIsProcessingCoseguro] = useState(false)
  const [unplannedDialogOpen, setUnplannedDialogOpen] = useState(false)
  const [preauthDialogOpen, setPreauthDialogOpen] = useState(false)
  const [isProcessingPreauth, setIsProcessingPreauth] = useState(false)
  const [orderStatusDialogOpen, setOrderStatusDialogOpen] = useState(false)
  const [isProcessingOrderStatus, setIsProcessingOrderStatus] = useState(false)
  const [arcaDialogOpen, setArcaDialogOpen] = useState(false)

  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false)
  const [updatingDetailId, setUpdatingDetailId] = useState<number | null>(null)

  const [auditDialogOpen, setAuditDialogOpen] = useState(false)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editFormData, setEditFormData] = useState<{
    send_method: string
    affiliate_number: string
    trajo_orden: TrajoOrdenStatus
    is_in_patient: boolean
  }>({
    send_method: "",
    affiliate_number: "",
    trajo_orden: TRAJO_ORDEN.COMPLETA,
    is_in_patient: false,
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportType, setReportType] = useState<"full" | "summary">("full")
  const [reportSigned, setReportSigned] = useState(true)
  const [reportSignatureId, setReportSignatureId] = useState("default")
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
  // Preview del PDF (mismo que se enviará) para confirmar antes de mandar.
  const [sendPreviewUrl, setSendPreviewUrl] = useState<string | null>(null)
  const [sendPreviewLoading, setSendPreviewLoading] = useState(false)
  const [sendPreviewError, setSendPreviewError] = useState<string | null>(null)
  // Confirmación al editar un protocolo COMPLETADO (antes de cada cambio).
  const [completedEditConfirmOpen, setCompletedEditConfirmOpen] = useState(false)
  const pendingCompletedEditRef = useRef<null | (() => void)>(null)
  const bypassCompletedGuardRef = useRef(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)

  const handleReportDateChange = (newDate: string) => {
    setReportDate(newDate)
  }

  const handleClearReportDateTime = () => {
    setReportDate("")
    setReportTime("")
  }

  const handleReportTypeChange = (type: "full" | "summary") => {
    setReportType(type)
    setReportSigned(type === "full")
  }

  const extractErrorMessage = (error: unknown, defaultMessage: string): string => {
    return formatApiError(error, defaultMessage)
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

    const body: Record<string, unknown> = {
      signed: reportSigned,
      analysis_ids: includedAnalysisIds,
      exclude_analysis_ids: excludedAnalysisIds,
    }
    if (reportSigned && reportSignatureId !== "default") {
      body.signature_id = Number(reportSignatureId)
    }
    if (date) body.protocol_date = date
    if (time) body.protocol_time = time

    return {
      method: "POST" as const,
      body,
    }
  }

  const executeSingleReportRequest = async (action: ReportAction) => {
    const reportRequest = getReportRequestOptions()
    const reportPayload = (reportRequest.body ?? {}) as Record<string, unknown>

    return apiRequest(PROTOCOL_ENDPOINTS.REPORT(protocol.id), {
      method: "POST",
      body: {
        action,
        type: reportType,
        ...reportPayload,
      },
    })
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
      throw new Error(extractErrorMessage(errorData, "Error al cargar los análisis del protocolo"))
    } catch (error) {
      console.error("Error fetching protocol details:", error)
      const message = getErrorMessage(error, "Error al cargar los análisis del protocolo")
      toast.error(message, { duration: TOAST_DURATION })
      return null
    } finally {
      setLoadingAnalyses(false)
    }
  }, [apiRequest, protocol.id, protocolDetails])

  const refreshProtocolDetail = useCallback(async (): Promise<ProtocolDetailResponse | null> => {
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAIL(protocol.id))
      if (response.ok) {
        const data: ProtocolDetailResponse = await response.json()
        setProtocolDetail(data)
        setLiveStatus(data.status)
        return data
      }
    } catch (error) {
      console.error("Error refreshing protocol detail:", error)
    }
    return null
  }, [apiRequest, protocol.id])

  const fetchProtocolDetail = async (): Promise<ProtocolDetailResponse | null> => {
    if (protocolDetail) return protocolDetail

    setLoadingDetail(true)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAIL(protocol.id))

      if (response.ok) {
        const data: ProtocolDetailResponse = await response.json()
        setProtocolDetail(data)
        return data
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error al cargar el detalle del protocolo"))
      }
    } catch (error) {
      console.error("Error fetching protocol detail:", error)
      const message = getErrorMessage(error, "Error al cargar los detalles del protocolo")
      toast.error(message, { duration: TOAST_DURATION })
      return null
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
    if (pageMode) return
    if ((e.target as HTMLElement).closest("[data-no-expand]")) {
      return
    }
    handleExpand()
  }

  // En modo página: asegurar el detalle cargado y traer los últimos eventos
  // legibles del historial (audit-timeline) para la sección Historial.
  useEffect(() => {
    if (!pageMode) return
    if (!protocolDetail) void fetchProtocolDetail()
    if (autoOpenReport) void handleOpenReportDialog()
    let cancelled = false
    apiRequest(`${PROTOCOL_ENDPOINTS.AUDIT_TIMELINE(protocol.id)}?limit=5`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setAuditEvents(data.events || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageMode])

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

    setSelectedReportAnalysisIds(analyses.filter(isDefaultReportSelected).map((analysis) => analysis.id))
    setReportType("full")
    setReportSigned(true)
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

  const handleSelectAllReportAnalyses = () => {
    setSelectedReportAnalysisIds(protocolDetails.filter(isSelectableForReport).map((analysis) => analysis.id))
  }

  const handleDeselectAllReportAnalyses = () => {
    setSelectedReportAnalysisIds([])
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
      const message = getErrorMessage(error, "Error al cancelar el protocolo")
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsCancelling(false)
    }
  }

  // El detalle del protocolo ya no embebe la URL del PDF: se pide aparte al
  // bloque arca-detail/ (solo tiene sentido si el protocolo ya está facturado).
  const fetchArcaInvoicePdfUrl = useCallback(async () => {
    try {
      const res = await apiRequest(PROTOCOL_ENDPOINTS.ARCA_DETAIL(protocol.id))
      if (res.ok) {
        const data = await res.json()
        setArcaInvoicePdfUrl(data.arca_invoice_pdf_url ?? null)
      }
    } catch (error) {
      console.error("Error fetching ARCA detail:", error)
    }
  }, [apiRequest, protocol.id])

  const handleOpenArcaDialog = async () => {
    const detail = protocolDetail ?? (await fetchProtocolDetail())
    if (detail?.is_arca_billed) {
      await fetchArcaInvoicePdfUrl()
    }
    setArcaDialogOpen(true)
  }

  const handleArcaBilling = async (payload: ArcaPayload): Promise<boolean> => {
    setIsArcaBilling(true)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.ARCA_BILLING(protocol.id), {
        method: "POST",
        body: payload,
      })

      if (response.ok) {
        const data = await response.json().catch(() => ({}))
        toast.success(data.detail || "Facturación ARCA generada exitosamente", { duration: TOAST_DURATION })
        // El POST de ARCA devuelve la URL del PDF recién generado.
        if (data.invoice_pdf_url) setArcaInvoicePdfUrl(data.invoice_pdf_url)
        await refreshProtocolDetail()
        onUpdate()
        return true
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(extractErrorMessage(errorData, "No se pudo facturar a ARCA"))
    } catch (error) {
      console.error("Error ARCA billing:", error)
      const message = getErrorMessage(error, "Error al emitir facturación ARCA")
      toast.error(message, { duration: TOAST_DURATION })
      return false
    } finally {
      setIsArcaBilling(false)
    }
  }

  const handleOpenPaymentDialog = async () => {
    if (needsCompletedConfirm(handleOpenPaymentDialog)) return
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
        const data = await response.json().catch(() => ({}))
        const label = operation === "patient_paid" ? "Pago" : "Devolución"
        toast.success(`${label} de $${amount.toFixed(2)} registrado exitosamente`, { duration: TOAST_DURATION })
        // Registrar un pago suele cambiar el estado (ej. "Pago incompleto" ->
        // "Pendiente de envío"): la respuesta ya lo trae, no hace falta esperar
        // el refresh de fondo para reflejarlo.
        if (data.status !== undefined) setLiveStatus(data.status)
        await refreshProtocolDetail()
        onUpdate()
        return true
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, `Error al registrar ${operation === "patient_paid" ? "pago" : "devolución"}`))
      }
    } catch (error) {
      console.error("Error regularize balance:", error)
      const message = getErrorMessage(error, "Error al procesar la operacion")
      toast.error(message, { duration: TOAST_DURATION })
      return false
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const handleOpenEditDialog = async () => {
    if (needsCompletedConfirm(handleOpenEditDialog)) return
    const detail = protocolDetail || (await fetchProtocolDetail())
    if (detail) {
      setEditFormData({
        send_method: detail.send_method.id.toString(),
        affiliate_number: detail.affiliate_number || "",
        trajo_orden: normalizeTrajoOrden(detail.trajo_orden),
        is_in_patient: detail.is_in_patient ?? false,
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
        updateData.affiliate_number = editFormData.affiliate_number.trim()
      }
      if (editFormData.trajo_orden !== normalizeTrajoOrden(protocolDetail?.trajo_orden)) {
        updateData.trajo_orden = editFormData.trajo_orden
      }
      if (editFormData.is_in_patient !== (protocolDetail?.is_in_patient ?? false)) {
        updateData.is_in_patient = editFormData.is_in_patient
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
        throw new Error(extractErrorMessage(errorData, "Error al actualizar el protocolo"))
      }
    } catch (error) {
      console.error("Error updating protocol:", error)
      const message = getErrorMessage(error, "Error al actualizar el protocolo")
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)

    try {
      const response = await executeSingleReportRequest("download")

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
        throw new Error(extractErrorMessage(errorData, "Error al generar el reporte"))
      }
    } catch (error) {
      console.error("Error generating report:", error)
      const message = getErrorMessage(error, "Error al generar el reporte")
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleDownloadReport = async () => {
    setIsDownloadingReport(true)

    try {
      const response = await executeSingleReportRequest("download")

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
        throw new Error(extractErrorMessage(errorData, "Error al descargar el reporte"))
      }
    } catch (error) {
      console.error("Error downloading report:", error)
      const message = getErrorMessage(error, "Error al descargar el reporte")
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsDownloadingReport(false)
    }
  }

  const executeSendEmail = async () => {
    setIsSendingEmail(true)
    try {
      const response = await executeSingleReportRequest("email")

      if (response.ok) {
        const data = await response.json()
        toast.success(data.detail || "Email enviado exitosamente", { duration: TOAST_DURATION })
        if (data.protocol_status !== undefined) setLiveStatus(data.protocol_status)
        setReportDialogOpen(false)
        await refreshProtocolDetail()
        onUpdate()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error al enviar el email"))
      }
    } catch (error) {
      console.error("Error sending email:", error)
      const message = getErrorMessage(error, "Error al enviar el email")
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const executeSendWhatsApp = async () => {
    setIsSendingWhatsApp(true)
    try {
      const response = await executeSingleReportRequest("whatsapp")

      if (response.ok) {
        const data = await response.json()
        toast.success(data.detail || "WhatsApp enviado exitosamente", { duration: TOAST_DURATION })
        if (data.protocol_status !== undefined) setLiveStatus(data.protocol_status)
        setReportDialogOpen(false)
        await refreshProtocolDetail()
        onUpdate()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error al enviar el WhatsApp"))
      }
    } catch (error) {
      console.error("Error sending WhatsApp:", error)
      const message = getErrorMessage(error, "Error al enviar el WhatsApp")
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  const clearSendPreview = () => {
    setSendPreviewUrl((prev) => {
      if (prev) window.URL.revokeObjectURL(prev)
      return null
    })
    setSendPreviewError(null)
    setSendPreviewLoading(false)
  }

  // Genera el MISMO PDF que se enviará (modo 'preview', sin marcar como
  // enviado) para mostrarlo embebido y confirmar antes de mandar.
  const loadSendPreview = async () => {
    clearSendPreview()
    setSendPreviewLoading(true)
    try {
      const response = await executeSingleReportRequest("preview")
      if (response.ok) {
        const blob = await response.blob()
        setSendPreviewUrl(window.URL.createObjectURL(blob))
      } else {
        const errorData = await response.json().catch(() => ({}))
        setSendPreviewError(extractErrorMessage(errorData, "No se pudo generar la vista previa"))
      }
    } catch (error) {
      setSendPreviewError(getErrorMessage(error, "No se pudo generar la vista previa"))
    } finally {
      setSendPreviewLoading(false)
    }
  }

  const openSendConfirmation = (method: "email" | "whatsapp") => {
    setPendingSendMethod(method)
    setSendConfirmationOpen(true)
    void loadSendPreview()
  }

  const handleSendEmail = () => openSendConfirmation("email")
  const handleSendWhatsApp = () => openSendConfirmation("whatsapp")

  const handleConfirmSend = async () => {
    setSendConfirmationOpen(false)
    const method = pendingSendMethod
    setPendingSendMethod(null)
    clearSendPreview()

    if (method === "email") {
      await executeSendEmail()
    }

    if (method === "whatsapp") {
      await executeSendWhatsApp()
    }
  }

  const handleToggleAuthorization = async (detail: ProtocolDetailType) => {
    if (needsCompletedConfirm(() => handleToggleAuthorization(detail))) return
    setUpdatingDetailId(detail.id)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAIL_UPDATE(protocol.id, detail.id), {
        method: "PATCH",
        body: { is_authorized: !detail.is_authorized },
      })

      if (response.ok) {
        // La respuesta es el protocolo completo (detalle + status actualizado),
        // no solo la fila del análisis: hay que sacar la fila puntual de
        // `.details` en vez de mezclar el objeto entero sobre `d` (pisaría
        // `d.id` con el id del protocolo).
        const updatedProtocol: ProtocolDetailResponse | null = await response.json().catch(() => null)
        const updatedRow = updatedProtocol?.details.find((d) => d.id === detail.id)
        setProtocolDetails((prev) =>
          prev.map((d) => (d.id === detail.id ? { ...d, ...(updatedRow || { is_authorized: !detail.is_authorized }) } : d)),
        )
        if (updatedProtocol) {
          setProtocolDetail(updatedProtocol)
          setLiveStatus(updatedProtocol.status)
        }
        toast.success(`Análisis ${!detail.is_authorized ? "autorizado" : "desautorizado"} exitosamente`, {
          duration: TOAST_DURATION,
        })
        // La respuesta ya trae el protocolo completo actualizado: no hace falta
        // un refreshProtocolDetail() aparte, ni recargar toda la lista con onUpdate().
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error al actualizar la autorización"))
      }
    } catch (error) {
      console.error("Error updating authorization:", error)
      const message = getErrorMessage(error, "Error al actualizar la autorización")
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

  const handleUncancelProtocol = async () => {
    setIsUncancelling(true)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.UNCANCEL(protocol.id), {
        method: "POST",
      })
      if (response.ok) {
        toast.success("Protocolo descancelado correctamente", { duration: TOAST_DURATION })
        await refreshProtocolDetail()
        onUpdate()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "No se pudo descancelar el protocolo"))
      }
    } catch (error) {
      console.error("Error uncancelling protocol:", error)
      const message = getErrorMessage(error, "Error al descancelar el protocolo")
      toast.error(message, { duration: TOAST_DURATION })
    } finally {
      setIsUncancelling(false)
    }
  }

  const handleOpenCoseguroDialog = async () => {
    if (needsCompletedConfirm(handleOpenCoseguroDialog)) return
    if (!protocolDetail) {
      await fetchProtocolDetail()
    }
    setCoseguroDialogOpen(true)
  }

  const handleSetCoseguro = async (amount: number): Promise<boolean> => {
    setIsProcessingCoseguro(true)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.SET_COSEGURO(protocol.id), {
        method: "POST",
        body: { amount: amount.toFixed(2) },
      })
      if (response.ok) {
        const data = await response.json().catch(() => ({}))
        toast.success(data.detail || "Coseguro actualizado correctamente", { duration: TOAST_DURATION })
        await refreshProtocolDetail()
        onUpdate()
        return true
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(extractErrorMessage(errorData, "No se pudo cargar el coseguro"))
    } catch (error) {
      console.error("Error setting coseguro:", error)
      toast.error(getErrorMessage(error, "Error al cargar el coseguro"), { duration: TOAST_DURATION })
      return false
    } finally {
      setIsProcessingCoseguro(false)
    }
  }

  const handleOpenOrderStatusDialog = async () => {
    if (needsCompletedConfirm(handleOpenOrderStatusDialog)) return
    const detail = protocolDetail || (await fetchProtocolDetail())
    if (!detail) return

    if (detail.insurance?.name?.toLowerCase() === "particular") {
      toast.info("Los protocolos particulares no requieren estado de orden médica.", { duration: TOAST_DURATION })
      return
    }

    setOrderStatusDialogOpen(true)
  }

  const handleUpdateOrderStatus = async (status: TrajoOrdenStatus): Promise<boolean> => {
    const currentStatus = normalizeTrajoOrden(protocolDetail?.trajo_orden ?? protocol.trajo_orden)
    if (status === currentStatus) {
      toast.info("La orden ya tiene ese estado", { duration: TOAST_DURATION })
      return true
    }

    setIsProcessingOrderStatus(true)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAIL(protocol.id), {
        method: "PATCH",
        body: { trajo_orden: status },
      })

      if (response.ok) {
        toast.success("Estado de orden actualizado correctamente", { duration: TOAST_DURATION })
        await refreshProtocolDetail()
        onUpdate()
        return true
      }

      const errorData = await response.json().catch(() => ({}))
      throw new Error(extractErrorMessage(errorData, "No se pudo actualizar la orden"))
    } catch (error) {
      console.error("Error updating order status:", error)
      toast.error(getErrorMessage(error, "Error al actualizar la orden"), { duration: TOAST_DURATION })
      return false
    } finally {
      setIsProcessingOrderStatus(false)
    }
  }

  const handleOpenPreauthDialog = async () => {
    if (needsCompletedConfirm(handleOpenPreauthDialog)) return
    if (!protocolDetail) {
      const detail = await fetchProtocolDetail()
      if (!detail) return
    }
    setPreauthDialogOpen(true)
  }

  const handleApplyPreauthorization = async (payload: {
    preauth_status: Exclude<PreauthStatus, "not_required">
    preauth_reference?: string
    preauth_notes?: string
  }): Promise<boolean> => {
    setIsProcessingPreauth(true)
    try {
      const response = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAIL(protocol.id), {
        method: "PATCH",
        body: payload,
      })
      if (response.ok) {
        toast.success("Preautorización actualizada correctamente", { duration: TOAST_DURATION })
        await refreshProtocolDetail()
        onUpdate()
        return true
      }
      const errorData = await response.json().catch(() => ({}))
      throw new Error(extractErrorMessage(errorData, "No se pudo actualizar la preautorización"))
    } catch (error) {
      console.error("Error updating preauthorization:", error)
      toast.error(getErrorMessage(error, "Error al actualizar la preautorización"), { duration: TOAST_DURATION })
      return false
    } finally {
      setIsProcessingPreauth(false)
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

  const effectiveStatus = liveStatus ?? protocol.status
  const statusId = effectiveStatus?.id ?? 0
  const statusName = effectiveStatus?.name || "este estado"
  const isCancelled = statusId === 4
  const isCompleted = statusId === 5
  // Un protocolo COMPLETADO ahora se puede editar (el backend ya lo permite):
  // solo Cancelado bloquea de verdad. Cada cambio sobre un completado pide
  // confirmación antes (needsCompletedConfirm).
  const isLockedForChanges = isCancelled
  const isEditable = !isLockedForChanges
  // Un protocolo Completado ahora SÍ se puede cancelar (solo se excluye el que
  // ya está cancelado).
  const canBeCancelled = !isCancelled

  // Guarda de edición sobre completados: frena la acción y pide confirmar; al
  // confirmar se re-ejecuta la misma acción (con un flag de bypass puntual).
  const needsCompletedConfirm = (rerun: () => void) => {
    if (bypassCompletedGuardRef.current) {
      bypassCompletedGuardRef.current = false
      return false
    }
    if (isCompleted) {
      pendingCompletedEditRef.current = rerun
      setCompletedEditConfirmOpen(true)
      return true
    }
    return false
  }
  const handleConfirmCompletedEdit = () => {
    setCompletedEditConfirmOpen(false)
    const rerun = pendingCompletedEditRef.current
    pendingCompletedEditRef.current = null
    if (rerun) {
      bypassCompletedGuardRef.current = true
      rerun()
    }
  }
  const handleOpenUnplanned = () => {
    if (needsCompletedConfirm(handleOpenUnplanned)) return
    setUnplannedDialogOpen(true)
  }

  const showReports = !isCancelled
  const editDisabledReason = !isEditable ? `No se puede editar un protocolo en estado "${statusName}".` : undefined
  const cancelDisabledReason = !canBeCancelled ? `No se puede cancelar un protocolo en estado "${statusName}".` : undefined
  const reportsDisabledReason = !showReports ? "No se pueden generar ni enviar reportes de un protocolo cancelado." : undefined
  const arcaDisabledReason = isCancelled ? "No se puede facturar ARCA para un protocolo cancelado." : undefined
  const canUncancel =
    isCancelled &&
    (user?.is_superuser ||
      hasPermission(PERMISSIONS.UNCANCEL_PROTOCOLS.codename) ||
      hasPermission("laboratory_protocols.descancelar_protocolos"))
  const isPrivateProtocol = protocolDetail?.insurance?.name?.toLowerCase() === "particular"
  const insuranceChargesCoseguro = Boolean(protocolDetail?.insurance?.charges_coseguro)
  const insuranceRequiresPreauth = Boolean(protocolDetail?.insurance?.requires_preauthorization)
  const showOrderAction = !isCancelled && !isPrivateProtocol
  const orderDisabledReason = isCancelled
    ? `No se puede modificar la orden en estado "${statusName}".`
    : undefined
  const showCoseguroAction = !isCancelled && insuranceChargesCoseguro
  const coseguroDisabledReason = isCancelled
    ? `No se puede cargar coseguro en estado "${statusName}".`
    : undefined
  const hasPreauthStatus = Boolean(protocol.preauth_status && protocol.preauth_status !== "not_required")
  const showPreauthAction = !isCancelled && (insuranceRequiresPreauth || hasPreauthStatus)
  const preauthDisabledReason = isCancelled
    ? `No se puede aplicar preautorización en estado "${statusName}".`
    : undefined

  const amountPending = protocolDetail ? Number.parseFloat(protocolDetail.amount_pending || "0") : 0
  const amountToReturn = protocolDetail ? Number.parseFloat(protocolDetail.amount_to_return || "0") : 0
  const balance = Number.parseFloat(protocol.balance || "0")
  const hasPatientDebt = amountPending > 0
  const labOwesPatient = amountToReturn > 0
  const hasBalanceToRegularize = hasPatientDebt || labOwesPatient
  const paymentDisabledReason =
    hasBalanceToRegularize && !isEditable
      ? `No se pueden registrar pagos o devoluciones en estado "${statusName}".`
      : undefined
  const patientEmail = protocolDetail?.patient.email?.trim()
  const patientPhone = (protocolDetail?.patient.phone_mobile || protocolDetail?.patient.alt_phone || "").trim()
  const emailDisabledReason =
    protocolDetail && "email" in protocolDetail.patient && !patientEmail
      ? "No se puede enviar por email porque el paciente no tiene email cargado."
      : undefined
  const whatsappDisabledReason =
    protocolDetail &&
    ("phone_mobile" in protocolDetail.patient || "alt_phone" in protocolDetail.patient) &&
    !patientPhone
      ? "No se puede enviar por WhatsApp porque el paciente no tiene teléfono cargado."
      : undefined

  const getBorderColor = (statusName: string): string => {
    return getProtocolStatusStyleByName(statusName).border
  }

  return (
    <>
      {pageMode ? (
        <ProtocolDetailView
          detail={protocolDetail ?? { id: protocol.id, status: effectiveStatus }}
          patientName={getPatientName()}
          patientAge={protocol.patient?.age}
          doctorName={getDoctorName()}
          insuranceName={getInsuranceName()}
          sendMethodName={getSendMethodName()}
          statusId={statusId}
          statusName={statusName}
          onReport={handleOpenReportDialog}
          onPayment={handleOpenPaymentDialog}
          onEdit={handleOpenEditDialog}
          onCancel={handleCancelProtocol}
          onUncancel={handleUncancelProtocol}
          onArca={handleOpenArcaDialog}
          onOrderStatus={handleOpenOrderStatusDialog}
          onPreauth={handleOpenPreauthDialog}
          onCoseguro={handleOpenCoseguroDialog}
          onHistory={() => setHistoryDialogOpen(true)}
          onUnplanned={handleOpenUnplanned}
          onToggleAuthorization={handleToggleAuthorization}
          updatingDetailId={updatingDetailId}
          auditEvents={auditEvents}
          onGoResults={() => navigate(`/resultados/${protocol.id}`)}
          onGoValidation={() => navigate(`/validacion/${protocol.id}`)}
          onGoPatient={() => (protocol.patient?.id ? navigate(`/pacientes/${protocol.patient.id}`) : navigate("/pacientes"))}
          isEditable={isEditable}
          showReports={showReports}
          canBeCancelled={canBeCancelled}
          isCancelled={isCancelled}
          canUncancel={Boolean(canUncancel)}
          showOrderAction={showOrderAction}
          showPreauthAction={showPreauthAction}
          showCoseguroAction={showCoseguroAction}
        />
      ) : (
      <Card
        className={`bg-white border-l-4 ${getBorderColor(statusName)} ${
          pageMode
            ? "shadow-sm"
            : `transition-all duration-300 shadow-sm hover:shadow-lg cursor-pointer ${
                isExpanded ? "ring-2 ring-[#204983] ring-opacity-20" : ""
              } ${isSelected ? "ring-2 ring-[#204983]" : ""}`
        }`}
        onClick={handleCardClick}
      >
        <CardContent className="px-4 py-2.5 sm:py-3">
          <div className="flex items-start gap-3">
            {!pageMode && (
            <button
              type="button"
              data-no-expand
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelection?.(protocol.id)
              }}
              className="mt-1 shrink-0"
              aria-label={isSelected ? "Quitar selección" : "Seleccionar protocolo"}
              title={isSelected ? "Quitar selección" : "Seleccionar para acciones en lote"}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected
                    ? "bg-[#204983] border-[#204983]"
                    : "border-gray-300 hover:border-[#204983]"
                }`}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
            )}
            <div className="flex-1 min-w-0">
              <ProtocolHeader
                protocolId={protocol.id}
                status={effectiveStatus}
                patientName={getPatientName()}
                isAnonymousPatient={Boolean(protocol.patient?.is_anonymous)}
                paymentStatus={protocol.payment_status}
                balance={balance}
                isPrinted={protocol.is_printed}
                canRegisterPayment={hasPatientDebt && isEditable}
                labOwesPatient={labOwesPatient && isEditable}
                paymentDisabledReason={paymentDisabledReason}
                isExpanded={isExpanded}
                creation={protocol.creation}
                lastChange={protocol.last_change}
                onRegisterPayment={handleOpenPaymentDialog}
              />
            </div>
          </div>
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
                  trajoOrden={protocolDetail?.trajo_orden}
                  preauthStatus={protocolDetail?.preauth_status}
                  isInPatient={protocolDetail?.is_in_patient}
                  analysesAmountDue={protocolDetail?.analyses_amount_due}
                  coseguroAmount={protocolDetail?.coseguro_amount}
                  materialDescartableAmount={protocolDetail?.material_descartable_amount}
                  derivacionAmount={protocolDetail?.derivacion_amount}
                  extrasTotal={protocolDetail?.extras_total}
                  nbu={protocolDetail?.nbu}
                  showOrderButton={showOrderAction}
                  orderDisabledReason={orderDisabledReason}
                  showPreauthButton={showPreauthAction}
                  preauthDisabledReason={preauthDisabledReason}
                  showCoseguroButton={showCoseguroAction}
                  coseguroDisabledReason={coseguroDisabledReason}
                  unplannedTransactions={protocolDetail?.unplanned_transactions}
                  unplannedChargesTotal={protocolDetail?.unplanned_charges_total}
                  unplannedPaymentsTotal={protocolDetail?.unplanned_payments_total}
                  onOpenUnplanned={handleOpenUnplanned}
                  onOpenHistoryDialog={() => setHistoryDialogOpen(true)}
                  onSetOrder={handleOpenOrderStatusDialog}
                  onApplyPreauthorization={handleOpenPreauthDialog}
                  onSetCoseguro={handleOpenCoseguroDialog}
                />
                <ProtocolActions
                  protocolId={protocol.id}
                  canBeCancelled={canBeCancelled}
                  isCancelled={isCancelled}
                  canUncancel={Boolean(canUncancel)}
                  isEditable={isEditable}
                  showReports={showReports}
                  showCoseguro={showCoseguroAction}
                  editDisabledReason={editDisabledReason}
                  reportsDisabledReason={reportsDisabledReason}
                  cancelDisabledReason={cancelDisabledReason}
                  arcaDisabledReason={arcaDisabledReason}
                  coseguroDisabledReason={coseguroDisabledReason}
                  isCancelling={isCancelling}
                  isUncancelling={isUncancelling}
                  isArcaBilling={isArcaBilling}
                  onViewAnalysis={handleAnalysisDialog}
                  onEdit={handleOpenEditDialog}
                  onReports={handleOpenReportDialog}
                  onCancel={handleCancelProtocol}
                  onUncancel={handleUncancelProtocol}
                  onArcaBilling={handleOpenArcaDialog}
                  onSetCoseguro={handleOpenCoseguroDialog}
                />
              </>
            )}
          </CardContent>
        )}
      </Card>
      )}

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
        readOnlyReason={editDisabledReason}
        isPrivateProtocol={isPrivateProtocol}
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
      />

      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={handleReportDialogOpenChange}
        protocolId={protocol.id}
        reportType={reportType}
        onReportTypeChange={handleReportTypeChange}
        signed={reportSigned}
        onSignedChange={setReportSigned}
        signatureId={reportSignatureId}
        onSignatureIdChange={setReportSignatureId}
        signatures={reportSignatures}
        reportDate={reportDate}
        onReportDateChange={handleReportDateChange}
        reportTime={reportTime}
        onReportTimeChange={setReportTime}
        onClearDateTime={handleClearReportDateTime}
        analyses={protocolDetails}
        selectedAnalysisIds={selectedReportAnalysisIds}
        onToggleAnalysis={handleToggleReportAnalysis}
        onSelectAllAnalyses={handleSelectAllReportAnalyses}
        onDeselectAllAnalyses={handleDeselectAllReportAnalyses}
        customizationOpen={reportCustomizationOpen}
        onToggleCustomizationOpen={setReportCustomizationOpen}
        onGenerateReport={handleGenerateReport}
        onDownloadReport={handleDownloadReport}
        onSendEmail={handleSendEmail}
        onSendWhatsApp={handleSendWhatsApp}
        sendMethodName={protocolDetail?.send_method?.name || ""}
        emailDisabledReason={emailDisabledReason}
        whatsappDisabledReason={whatsappDisabledReason}
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
            clearSendPreview()
          }
        }}
      >
        <AlertDialogContent className="flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden border-0 p-0 shadow-2xl sm:max-w-3xl">
          <div
            className={
              pendingSendMethod === "email"
                ? "shrink-0 bg-gradient-to-r from-[#204983] to-sky-600 px-6 py-5 text-white"
                : "shrink-0 bg-gradient-to-r from-emerald-600 to-green-500 px-6 py-5 text-white"
            }
          >
            <AlertDialogHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                {pendingSendMethod === "email" ? <Mail className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
              </div>
              <AlertDialogTitle className="text-white">
                {pendingSendMethod === "email" ? "Enviar reporte por email" : "Enviar reporte por WhatsApp"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white/85">
                Revisá la vista previa del reporte tal como se enviará y, si está todo bien, confirmá.{" "}
                {pendingSendMethod === "email"
                  ? "Se enviará al email cargado en el paciente."
                  : "Se enviará al teléfono cargado para WhatsApp."}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Vista previa ({reportType === "summary" ? "resumen" : "reporte completo"})
            </p>
            <div className="mb-4 h-[45vh] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:h-[440px]">
              {sendPreviewLoading ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#204983]" />
                  <span className="text-sm">Generando vista previa…</span>
                </div>
              ) : sendPreviewError ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-600">
                  {sendPreviewError}
                </div>
              ) : sendPreviewUrl ? (
                <iframe title="Vista previa del reporte" src={sendPreviewUrl} className="h-full w-full" />
              ) : null}
            </div>
            {sendPreviewUrl && (
              <button
                type="button"
                onClick={() => window.open(sendPreviewUrl, "_blank", "noopener,noreferrer")}
                className="mb-3 self-start text-xs font-medium text-[#204983] underline underline-offset-2 hover:text-[#1a3d6f]"
              >
                Abrir vista completa (en el celular, para ver todas las páginas)
              </button>
            )}
          </div>
          <div className="shrink-0 bg-white px-6 pb-4">
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setPendingSendMethod(null)
                  clearSendPreview()
                }}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmSend}
                disabled={sendPreviewLoading}
                className={
                  pendingSendMethod === "email"
                    ? "bg-[#204983] text-white hover:bg-[#1a3d6f]"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }
              >
                Confirmar y enviar
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={completedEditConfirmOpen}
        onOpenChange={(open) => {
          setCompletedEditConfirmOpen(open)
          if (!open) pendingCompletedEditRef.current = null
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Protocolo completado</AlertDialogTitle>
            <AlertDialogDescription>
              Este protocolo ya está <strong>completado</strong>. Igual podés modificarlo
              (cargar pagos, cambiar la orden, coseguro, análisis, etc.), pero tené en
              cuenta que el cambio puede recalcular su estado. ¿Querés continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { pendingCompletedEditRef.current = null }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCompletedEdit}
              className="bg-[#204983] text-white hover:bg-[#1a3d6f]"
            >
              Sí, modificar
            </AlertDialogAction>
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

      <CoseguroDialog
        open={coseguroDialogOpen}
        onOpenChange={setCoseguroDialogOpen}
        protocolId={protocol.id}
        currentCoseguro={protocolDetail?.coseguro_amount || "0"}
        insuranceChargesCoseguro={insuranceChargesCoseguro}
        onConfirm={handleSetCoseguro}
        isProcessing={isProcessingCoseguro}
      />

      <UnplannedTransactionsDialog
        open={unplannedDialogOpen}
        onOpenChange={setUnplannedDialogOpen}
        protocolId={protocol.id}
        isEditable={isEditable}
        onChanged={() => {
          void refreshProtocolDetail()
        }}
        onStatusChange={(status) => setLiveStatus(status)}
      />

      <OrderStatusDialog
        open={orderStatusDialogOpen}
        onOpenChange={setOrderStatusDialogOpen}
        protocolId={protocol.id}
        currentStatus={protocolDetail?.trajo_orden ?? protocol.trajo_orden}
        onConfirm={handleUpdateOrderStatus}
        isProcessing={isProcessingOrderStatus}
      />

      <PreauthorizationDialog
        open={preauthDialogOpen}
        onOpenChange={setPreauthDialogOpen}
        protocolId={protocol.id}
        currentStatus={protocolDetail?.preauth_status}
        currentReference={protocolDetail?.preauth_reference}
        currentNotes={protocolDetail?.preauth_notes}
        onConfirm={handleApplyPreauthorization}
        isProcessing={isProcessingPreauth}
      />

      <ArcaBillingDialog
        open={arcaDialogOpen}
        onOpenChange={setArcaDialogOpen}
        protocolId={protocol.id}
        patientName={getPatientName()}
        patientDni={protocol.patient?.dni}
        invoicePdfUrl={arcaInvoicePdfUrl ?? protocolDetail?.arca_invoice_pdf_url ?? null}
        arcaCae={protocolDetail?.arca_cae}
        arcaCbteNumber={protocolDetail?.arca_cbte_number ?? null}
        isAlreadyBilled={Boolean(protocolDetail?.is_arca_billed)}
        onConfirm={handleArcaBilling}
        isProcessing={isArcaBilling}
      />
    </>
  )
}
