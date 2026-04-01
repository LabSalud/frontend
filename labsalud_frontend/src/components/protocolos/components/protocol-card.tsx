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
    const reportWindow = window.open("/report-center", "_blank")

    if (!reportWindow) {
      toast.error("El navegador bloqueó la ventana de impresión. Habilitá los popups para este sitio.", {
        duration: TOAST_DURATION,
      })
      setIsGeneratingReport(false)
      return
    }

    reportWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Labsalud - Generando reporte</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #adadad;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              color: #1f2937;
            }
            .loader-card {
              width: min(520px, calc(100% - 32px));
              background: #ffffff;
              border-radius: 16px;
              padding: 24px;
              box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
              text-align: center;
            }
            .spinner {
              width: 34px;
              height: 34px;
              border: 3px solid #c7d2fe;
              border-top-color: #204983;
              border-radius: 50%;
              margin: 0 auto 14px;
              animation: spin 0.9s linear infinite;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            h1 { margin: 0 0 8px; font-size: 20px; color: #204983; }
            p { margin: 0; color: #4b5563; }
          </style>
          <script>
            window.history.replaceState({}, "", "/report-center");
          </script>
        </head>
        <body>
          <div class="loader-card">
            <div class="spinner"></div>
            <h1>Labsalud</h1>
            <p>Generando reporte, por favor espere...</p>
          </div>
        </body>
      </html>
    `)
    reportWindow.document.close()

    try {
      const response = await apiRequest(REPORTING_ENDPOINTS.PRINT(protocol.id, reportType), {
        method: "POST",
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const reportDate = new Date().toISOString().slice(0, 10)
        const fileName = `reporte_labsalud_${protocol.id}_${reportDate}.pdf`
        const requestId = `report-${protocol.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`

        const sendReportToChannel = async (channel: "email" | "whatsapp") => {
          const endpoint =
            channel === "email"
              ? REPORTING_ENDPOINTS.SEND_EMAIL(protocol.id, reportType)
              : REPORTING_ENDPOINTS.SEND_WHATSAPP(protocol.id, reportType)

          const response = await apiRequest(endpoint, { method: "POST" })
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(
              extractErrorMessage(errorData, channel === "email" ? "Error sending email" : "Error sending WhatsApp"),
            )
          }

          const data = await response.json().catch(() => ({}))
          toast.success(
            data?.detail || (channel === "email" ? "Email enviado exitosamente" : "WhatsApp enviado exitosamente"),
            { duration: TOAST_DURATION },
          )
        }

        const postStatusToPopup = (status: "idle" | "sending" | "sent" | "error", message?: string) => {
          reportWindow.postMessage(
            {
              type: "labsalud-report-status",
              requestId,
              status,
              message,
            },
            window.location.origin,
          )
        }

        const handlePopupMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return
          if (event.source !== reportWindow) return

          const payload = event.data as {
            type?: string
            requestId?: string
            action?: "send-email" | "send-whatsapp" | "revoke-url"
          }

          if (payload?.type !== "labsalud-report-action" || payload.requestId !== requestId) {
            return
          }

          if (payload.action === "send-email" || payload.action === "send-whatsapp") {
            try {
              postStatusToPopup("sending", payload.action === "send-email" ? "Enviando por email..." : "Enviando por WhatsApp...")
              await sendReportToChannel(payload.action === "send-email" ? "email" : "whatsapp")
              postStatusToPopup("sent", "Reporte enviado correctamente")
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : payload.action === "send-email"
                    ? "Error al enviar el email"
                    : "Error al enviar el WhatsApp"
              postStatusToPopup("error", message)
              toast.error(message, { duration: TOAST_DURATION })
            }
          }

          if (payload.action === "revoke-url") {
            window.URL.revokeObjectURL(url)
            window.removeEventListener("message", handlePopupMessage)
          }
        }

        window.addEventListener("message", handlePopupMessage)

        reportWindow.document.open()
        reportWindow.document.write(`
          <!doctype html>
          <html lang="es">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>Reporte Labsalud #${protocol.id}</title>
              <style>
                * { box-sizing: border-box; }
                body {
                  margin: 0;
                  min-height: 100vh;
                  display: flex;
                  flex-direction: column;
                  background: #e5e7eb;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }
                .toolbar {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 10px;
                  align-items: center;
                  justify-content: space-between;
                  padding: 14px 16px;
                  background: #ffffff;
                  border-bottom: 1px solid #d1d5db;
                  position: sticky;
                  top: 0;
                  z-index: 10;
                }
                .brand {
                  display: flex;
                  flex-direction: column;
                }
                .brand-title {
                  margin: 0;
                  font-size: 16px;
                  color: #204983;
                  font-weight: 700;
                }
                .brand-subtitle {
                  margin: 0;
                  font-size: 12px;
                  color: #6b7280;
                }
                .actions {
                  display: flex;
                  gap: 8px;
                  flex-wrap: wrap;
                  align-items: center;
                }
                .search-wrap {
                  display: flex;
                  gap: 6px;
                  align-items: center;
                  background: #f8fafc;
                  border: 1px solid #d1d5db;
                  border-radius: 8px;
                  padding: 4px;
                }
                .search-input {
                  border: 0;
                  background: transparent;
                  outline: none;
                  font-size: 13px;
                  width: 180px;
                  padding: 4px 6px;
                  color: #111827;
                }
                .search-btn {
                  padding: 7px 10px;
                  font-size: 12px;
                  border-radius: 6px;
                  background: #e5e7eb;
                  color: #111827;
                }
                .zoom-wrap {
                  display: flex;
                  gap: 4px;
                  align-items: center;
                }
                .zoom-btn {
                  padding: 7px 10px;
                  font-size: 12px;
                  border-radius: 6px;
                  background: #e5e7eb;
                  color: #111827;
                }
                .zoom-label {
                  font-size: 12px;
                  color: #4b5563;
                  min-width: 46px;
                  text-align: center;
                }
                button {
                  border: 0;
                  border-radius: 8px;
                  padding: 10px 14px;
                  font-weight: 600;
                  cursor: pointer;
                  font-size: 13px;
                }
                .btn-primary { background: #204983; color: #fff; }
                .btn-primary:hover { background: #1a3d6f; }
                .btn-secondary { background: #eef2ff; color: #1f2937; }
                .btn-secondary:hover { background: #e0e7ff; }
                .viewer-layout {
                  flex: 1;
                  display: grid;
                  grid-template-columns: 220px 1fr;
                  gap: 12px;
                  padding: 12px;
                  min-height: 0;
                }
                .sidebar {
                  background: #ffffff;
                  border: 1px solid #d1d5db;
                  border-radius: 10px;
                  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
                  padding: 10px;
                  display: flex;
                  flex-direction: column;
                  min-height: 0;
                }
                .sidebar-title {
                  margin: 0 0 8px;
                  font-size: 12px;
                  color: #4b5563;
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 0.03em;
                }
                .thumbs {
                  overflow: auto;
                  display: grid;
                  gap: 8px;
                }
                .thumb-item {
                  border: 1px solid #d1d5db;
                  border-radius: 8px;
                  background: #fff;
                  cursor: pointer;
                  padding: 6px;
                }
                .thumb-item.active {
                  border-color: #204983;
                  box-shadow: 0 0 0 1px #204983 inset;
                }
                .thumb-canvas {
                  display: block;
                  width: 100%;
                  height: auto;
                  border-radius: 4px;
                  background: #f3f4f6;
                }
                .thumb-label {
                  margin-top: 4px;
                  font-size: 11px;
                  color: #4b5563;
                }
                .viewer-wrap {
                  overflow: auto;
                  min-height: 0;
                }
                .pages {
                  width: min(980px, 100%);
                  margin: 0 auto;
                  display: grid;
                  gap: 16px;
                }
                .page {
                  background: #ffffff;
                  border-radius: 10px;
                  border: 1px solid #d1d5db;
                  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
                  overflow: visible;
                  padding: 10px;
                }
                .page-canvas-wrap {
                  position: relative;
                  width: fit-content;
                  margin: 0 auto;
                }
                .page canvas {
                  display: block;
                  max-width: 100%;
                  height: auto;
                }
                .textLayer {
                  position: absolute;
                  inset: 0;
                  overflow: hidden;
                  opacity: 1;
                  line-height: 1;
                  transform-origin: 0 0;
                  user-select: text;
                  -webkit-user-select: text;
                }
                .textLayer span,
                .textLayer br {
                  color: transparent;
                  position: absolute;
                  white-space: pre;
                  cursor: text;
                  transform-origin: 0% 0%;
                }
                .textLayer span.search-hit {
                  background: rgba(250, 204, 21, 0.45);
                }
                .textLayer span.search-hit.active {
                  background: rgba(245, 158, 11, 0.8);
                }
                .inline-status {
                  margin: 0;
                  font-size: 12px;
                  color: #6b7280;
                }
                .send-menu-wrap {
                  position: relative;
                }
                .send-menu {
                  position: absolute;
                  top: calc(100% + 8px);
                  right: 0;
                  min-width: 180px;
                  background: #ffffff;
                  border: 1px solid #d1d5db;
                  border-radius: 10px;
                  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
                  padding: 6px;
                  display: none;
                  z-index: 20;
                }
                .send-menu.open {
                  display: block;
                }
                .send-option {
                  width: 100%;
                  text-align: left;
                  background: #fff;
                  color: #111827;
                  font-size: 13px;
                  font-weight: 600;
                  padding: 9px 10px;
                  border-radius: 8px;
                }
                .send-option:hover {
                  background: #f3f4f6;
                }
                .rendering {
                  width: min(980px, 100%);
                  margin: 0 auto;
                  background: #fff;
                  border-radius: 10px;
                  border: 1px solid #d1d5db;
                  padding: 18px;
                  color: #4b5563;
                }
                @media (max-width: 768px) {
                  .toolbar { align-items: flex-start; }
                  .viewer-layout { grid-template-columns: 1fr; }
                  .sidebar { max-height: 180px; }
                }
              </style>
              <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
              <script>
                window.history.replaceState({}, "", "/report-center");
              </script>
            </head>
            <body>
              <header class="toolbar">
                <div class="brand">
                  <h1 class="brand-title">Labsalud - Reporte PDF</h1>
                  <p class="brand-subtitle">Protocolo #${protocol.id} • Tipo: ${reportType === "full" ? "Completo" : "Resumen"}</p>
                </div>
                <div class="actions">
                  <div class="search-wrap">
                    <input id="searchInput" class="search-input" type="text" placeholder="Buscar en PDF" />
                    <button id="searchPrevBtn" class="search-btn" type="button">◀</button>
                    <button id="searchNextBtn" class="search-btn" type="button">▶</button>
                  </div>
                  <div class="zoom-wrap">
                    <button id="zoomOutBtn" class="zoom-btn" type="button">-</button>
                    <span id="zoomLabel" class="zoom-label">100%</span>
                    <button id="zoomInBtn" class="zoom-btn" type="button">+</button>
                    <button id="zoomResetBtn" class="zoom-btn" type="button">100%</button>
                  </div>
                  <button id="downloadBtn" class="btn-primary" type="button">Descargar</button>
                  <button id="printBtn" class="btn-secondary" type="button">Imprimir</button>
                  <div class="send-menu-wrap">
                    <button id="sendBtn" class="btn-secondary" type="button">Enviar</button>
                    <div id="sendMenu" class="send-menu" role="menu" aria-label="Opciones de envío">
                      <button id="sendEmailBtn" class="send-option" type="button" role="menuitem">Por Email</button>
                      <button id="sendWhatsAppBtn" class="send-option" type="button" role="menuitem">Por WhatsApp</button>
                    </div>
                  </div>
                  <p id="statusText" class="inline-status"></p>
                </div>
              </header>
              <main class="viewer-layout">
                <aside class="sidebar">
                  <h2 class="sidebar-title">Páginas (<span id="pageCount">0</span>)</h2>
                  <div id="thumbs" class="thumbs" aria-label="Miniaturas de páginas"></div>
                </aside>
                <div class="viewer-wrap" id="viewerScroll">
                  <div id="renderingText" class="rendering">Renderizando reporte...</div>
                  <section id="pdfPages" class="pages" aria-live="polite"></section>
                </div>
              </main>

              <script>
                const pdfUrl = ${JSON.stringify(url)};
                const reportFileName = ${JSON.stringify(fileName)};
                const requestId = ${JSON.stringify(requestId)};
                const statusText = document.getElementById("statusText");
                const sendBtn = document.getElementById("sendBtn");
                const sendMenu = document.getElementById("sendMenu");
                const pagesRoot = document.getElementById("pdfPages");
                const renderingText = document.getElementById("renderingText");
                const thumbsRoot = document.getElementById("thumbs");
                const pageCount = document.getElementById("pageCount");
                const viewerScroll = document.getElementById("viewerScroll");
                const pageElements = new Map();
                const thumbButtons = new Map();
                const zoomLabel = document.getElementById("zoomLabel");
                const searchInput = document.getElementById("searchInput");
                const searchNextBtn = document.getElementById("searchNextBtn");
                const searchPrevBtn = document.getElementById("searchPrevBtn");

                let pdfDoc = null;
                let currentScale = 1.5;
                let activeObserver = null;
                let searchMatches = [];
                let activeMatchIndex = -1;

                const pdfjsLib = window.pdfjsLib;
                if (pdfjsLib) {
                  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
                }

                const clearRenderedContent = () => {
                  pageElements.clear();
                  thumbButtons.clear();
                  searchMatches = [];
                  activeMatchIndex = -1;
                  pagesRoot && (pagesRoot.innerHTML = "");
                  thumbsRoot && (thumbsRoot.innerHTML = "");
                  if (activeObserver) {
                    activeObserver.disconnect();
                    activeObserver = null;
                  }
                };

                const updateZoomLabel = () => {
                  if (!zoomLabel) return;
                  zoomLabel.textContent = Math.round((currentScale / 1.5) * 100) + "%";
                };

                const applySearch = (rawQuery) => {
                  const query = (rawQuery || "").trim().toLowerCase();
                  searchMatches.forEach((span) => {
                    span.classList.remove("search-hit", "active");
                  });
                  searchMatches = [];
                  activeMatchIndex = -1;

                  if (!query || !pagesRoot) return;

                  const spans = pagesRoot.querySelectorAll(".textLayer span");
                  spans.forEach((span) => {
                    const text = (span.textContent || "").toLowerCase();
                    if (text.includes(query)) {
                      span.classList.add("search-hit");
                      searchMatches.push(span);
                    }
                  });

                  if (searchMatches.length > 0) {
                    activeMatchIndex = 0;
                    searchMatches[0].classList.add("active");
                    searchMatches[0].scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                };

                const focusMatch = (step) => {
                  if (searchMatches.length === 0) return;
                  if (activeMatchIndex >= 0) {
                    searchMatches[activeMatchIndex].classList.remove("active");
                  }
                  activeMatchIndex = (activeMatchIndex + step + searchMatches.length) % searchMatches.length;
                  const active = searchMatches[activeMatchIndex];
                  active.classList.add("active");
                  active.scrollIntoView({ behavior: "smooth", block: "center" });
                };

                const renderPdfPages = async () => {
                  if (!pdfjsLib || !pagesRoot) {
                    if (renderingText) {
                      renderingText.textContent = "No se pudo inicializar el render del PDF.";
                      renderingText.style.color = "#b91c1c";
                    }
                    return;
                  }

                  try {
                    if (!pdfDoc) {
                      const loadingTask = pdfjsLib.getDocument(pdfUrl);
                      pdfDoc = await loadingTask.promise;
                    }
                    clearRenderedContent();
                    const pixelRatio = window.devicePixelRatio || 1;
                    if (pageCount) pageCount.textContent = String(pdfDoc.numPages);
                    updateZoomLabel();

                    if (renderingText && !renderingText.isConnected) {
                      const placeholder = document.createElement("div");
                      placeholder.id = "renderingText";
                      placeholder.className = "rendering";
                      placeholder.textContent = "Renderizando reporte...";
                      pagesRoot.parentElement?.insertBefore(placeholder, pagesRoot);
                    }

                    const liveRenderingText = document.getElementById("renderingText");

                    for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
                      const page = await pdfDoc.getPage(pageNumber);
                      const viewport = page.getViewport({ scale: currentScale });
                      const canvas = document.createElement("canvas");
                      const context = canvas.getContext("2d");
                      if (!context) continue;

                      canvas.width = Math.floor(viewport.width * pixelRatio);
                      canvas.height = Math.floor(viewport.height * pixelRatio);
                      canvas.style.width = Math.floor(viewport.width) + "px";
                      canvas.style.height = Math.floor(viewport.height) + "px";

                      const pageContainer = document.createElement("article");
                      pageContainer.className = "page";
                      pageContainer.id = "page-" + pageNumber;
                      pageContainer.setAttribute("data-page", String(pageNumber));

                      const canvasWrap = document.createElement("div");
                      canvasWrap.className = "page-canvas-wrap";
                      canvasWrap.style.width = Math.floor(viewport.width) + "px";
                      canvasWrap.style.height = Math.floor(viewport.height) + "px";

                      const textLayer = document.createElement("div");
                      textLayer.className = "textLayer";
                      textLayer.style.width = Math.floor(viewport.width) + "px";
                      textLayer.style.height = Math.floor(viewport.height) + "px";

                      canvasWrap.appendChild(canvas);
                      canvasWrap.appendChild(textLayer);
                      pageContainer.appendChild(canvasWrap);
                      pagesRoot.appendChild(pageContainer);
                      pageElements.set(pageNumber, pageContainer);

                      await page.render({
                        canvasContext: context,
                        viewport,
                        transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
                      }).promise;

                      const textContent = await page.getTextContent();
                      const textLayerTask = pdfjsLib.renderTextLayer({
                        textContentSource: textContent,
                        container: textLayer,
                        viewport,
                        textDivs: [],
                      });
                      if (textLayerTask?.promise) {
                        await textLayerTask.promise;
                      }

                      if (thumbsRoot) {
                        const thumbButton = document.createElement("button");
                        thumbButton.type = "button";
                        thumbButton.className = "thumb-item";
                        thumbButton.setAttribute("data-page", String(pageNumber));

                        const thumbCanvas = document.createElement("canvas");
                        thumbCanvas.className = "thumb-canvas";
                        const thumbContext = thumbCanvas.getContext("2d");
                        if (thumbContext) {
                          const thumbScale = 0.22;
                          const thumbViewport = page.getViewport({ scale: thumbScale });
                          thumbCanvas.width = Math.floor(thumbViewport.width * pixelRatio);
                          thumbCanvas.height = Math.floor(thumbViewport.height * pixelRatio);
                          thumbCanvas.style.width = Math.floor(thumbViewport.width) + "px";
                          thumbCanvas.style.height = Math.floor(thumbViewport.height) + "px";
                          await page.render({
                            canvasContext: thumbContext,
                            viewport: thumbViewport,
                            transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
                          }).promise;
                        }

                        const thumbLabel = document.createElement("div");
                        thumbLabel.className = "thumb-label";
                        thumbLabel.textContent = "Página " + pageNumber;

                        thumbButton.appendChild(thumbCanvas);
                        thumbButton.appendChild(thumbLabel);
                        thumbButton.addEventListener("click", () => {
                          const targetPage = pageElements.get(pageNumber);
                          targetPage?.scrollIntoView({ behavior: "smooth", block: "start" });
                        });
                        thumbsRoot.appendChild(thumbButton);
                        thumbButtons.set(pageNumber, thumbButton);
                      }
                    }

                    activeObserver = new IntersectionObserver(
                      (entries) => {
                        for (const entry of entries) {
                          const page = Number(entry.target.getAttribute("data-page") || "0");
                          if (!page) continue;
                          const thumb = thumbButtons.get(page);
                          if (!thumb) continue;
                          if (entry.isIntersecting) {
                            thumb.classList.add("active");
                          } else {
                            thumb.classList.remove("active");
                          }
                        }
                      },
                      {
                        root: viewerScroll,
                        threshold: 0.55,
                      },
                    );

                    for (const pageContainer of pageElements.values()) {
                      activeObserver.observe(pageContainer);
                    }

                    liveRenderingText?.remove();

                    applySearch(searchInput && "value" in searchInput ? searchInput.value : "");
                  } catch (error) {
                    const liveRenderingText = document.getElementById("renderingText");
                    if (liveRenderingText) {
                      liveRenderingText.textContent = "No se pudo mostrar el reporte en pantalla.";
                      liveRenderingText.style.color = "#b91c1c";
                    }
                  }
                };

                renderPdfPages();

                document.getElementById("zoomInBtn")?.addEventListener("click", async () => {
                  currentScale = Math.min(currentScale + 0.2, 3);
                  await renderPdfPages();
                });

                document.getElementById("zoomOutBtn")?.addEventListener("click", async () => {
                  currentScale = Math.max(currentScale - 0.2, 0.8);
                  await renderPdfPages();
                });

                document.getElementById("zoomResetBtn")?.addEventListener("click", async () => {
                  currentScale = 1.5;
                  await renderPdfPages();
                });

                searchInput?.addEventListener("input", (event) => {
                  const target = event.target;
                  if (!(target instanceof HTMLInputElement)) return;
                  applySearch(target.value);
                });

                searchNextBtn?.addEventListener("click", () => {
                  focusMatch(1);
                });

                searchPrevBtn?.addEventListener("click", () => {
                  focusMatch(-1);
                });

                const createDownloadLink = () => {
                  const link = document.createElement("a");
                  link.href = pdfUrl;
                  link.download = reportFileName;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                };

                document.getElementById("downloadBtn")?.addEventListener("click", () => {
                  createDownloadLink();
                });

                document.getElementById("printBtn")?.addEventListener("click", () => {
                  const printFrame = document.createElement("iframe");
                  printFrame.style.position = "fixed";
                  printFrame.style.right = "0";
                  printFrame.style.bottom = "0";
                  printFrame.style.width = "0";
                  printFrame.style.height = "0";
                  printFrame.style.border = "0";
                  printFrame.src = pdfUrl;
                  document.body.appendChild(printFrame);

                  printFrame.onload = () => {
                    const frameWindow = printFrame.contentWindow;
                    if (frameWindow) {
                      frameWindow.focus();
                      frameWindow.print();
                    }
                    setTimeout(() => printFrame.remove(), 1500);
                  };
                });

                sendBtn?.addEventListener("click", (event) => {
                  event.stopPropagation();
                  sendMenu?.classList.toggle("open");
                });

                document.addEventListener("click", (event) => {
                  if (!sendMenu || !sendBtn) return;
                  const target = event.target;
                  if (!(target instanceof Node)) return;
                  if (!sendMenu.contains(target) && !sendBtn.contains(target)) {
                    sendMenu.classList.remove("open");
                  }
                });

                const sendActionToOpener = (action) => {
                  window.opener?.postMessage(
                    {
                      type: "labsalud-report-action",
                      requestId,
                      action,
                    },
                    window.location.origin,
                  );
                };

                document.getElementById("sendEmailBtn")?.addEventListener("click", () => {
                  sendMenu?.classList.remove("open");
                  sendActionToOpener("send-email");
                });

                document.getElementById("sendWhatsAppBtn")?.addEventListener("click", () => {
                  sendMenu?.classList.remove("open");
                  sendActionToOpener("send-whatsapp");
                });

                window.addEventListener("message", (event) => {
                  if (event.origin !== window.location.origin) return;
                  const payload = event.data || {};
                  if (payload.type !== "labsalud-report-status" || payload.requestId !== requestId) return;

                  if (statusText && payload.message) {
                    statusText.textContent = payload.message;
                  }

                  if (payload.status === "sending") {
                    statusText.textContent = payload.message || "Enviando...";
                    statusText?.setAttribute("style", "color:#6b7280;");
                  }
                  if (payload.status === "sent") {
                    statusText.textContent = payload.message || "Enviado";
                    statusText?.setAttribute("style", "color:#166534;");
                  }
                  if (payload.status === "error") {
                    statusText.textContent = payload.message || "Error";
                    statusText?.setAttribute("style", "color:#b91c1c;");
                  }
                });

                window.addEventListener("beforeunload", () => {
                  window.opener?.postMessage(
                    {
                      type: "labsalud-report-action",
                      requestId,
                      action: "revoke-url",
                    },
                    window.location.origin,
                  );
                });
              </script>
            </body>
          </html>
        `)
        reportWindow.document.close()

        toast.success("Reporte generado exitosamente", { duration: TOAST_DURATION })
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(extractErrorMessage(errorData, "Error generating report"))
      }
    } catch (error) {
      reportWindow.document.open()
      reportWindow.document.write(`
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Labsalud - Error de reporte</title>
            <style>
              body {
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #adadad;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              }
              .error-card {
                width: min(560px, calc(100% - 32px));
                background: #fff;
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
              }
              h1 { margin-top: 0; color: #b91c1c; font-size: 20px; }
              p { margin-bottom: 0; color: #374151; }
            </style>
            <script>
              window.history.replaceState({}, "", "/report-center");
            </script>
          </head>
          <body>
            <div class="error-card">
              <h1>No se pudo generar el reporte</h1>
              <p>Volvé a la aplicación e intentá nuevamente.</p>
            </div>
          </body>
        </html>
      `)
      reportWindow.document.close()

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

  const amountPending = protocolDetail ? Number.parseFloat(protocolDetail.amount_pending || "0") : 0
  const amountToReturn = protocolDetail ? Number.parseFloat(protocolDetail.amount_to_return || "0") : 0
  const balance = Number.parseFloat(protocol.balance || "0")
  const hasPatientDebt = amountPending > 0
  const labOwesPatient = amountToReturn > 0

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
