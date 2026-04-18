"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, FileText, Printer, Mail, MessageCircle, Download, ChevronRight, ArrowRightLeft, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../ui/dialog"
import { Button } from "../../../ui/button"
import { Input } from "../../../ui/input"
import { Checkbox } from "../../../ui/checkbox"
import { Badge } from "../../../ui/badge"
import { Label } from "../../../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select"
import { Separator } from "../../../ui/separator"
import type { ProtocolDetail } from "@/types"

type ReportProtocolAnalysis = ProtocolDetail & {
  is_sent?: boolean
  is_valid?: boolean
}

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  protocolId: number
  reportType: "full" | "summary"
  onReportTypeChange: (type: "full" | "summary") => void
  reportDate: string
  onReportDateChange: (date: string) => void
  reportTime: string
  onReportTimeChange: (time: string) => void
  onClearDateTime: () => void
  analyses: ReportProtocolAnalysis[]
  selectedAnalysisIds: number[]
  onToggleAnalysis: (analysisId: number) => void
  customizationOpen: boolean
  onToggleCustomizationOpen: (open: boolean) => void
  onGenerateReport: () => void
  onDownloadReport: () => void
  onSendEmail: () => void
  onSendWhatsApp: () => void
  isGenerating: boolean
  isDownloading: boolean
  isSending: boolean
  isSendingWhatsApp: boolean
}

interface ActionButtonProps {
  onClick: () => void
  disabled: boolean
  isLoading: boolean
  loadingLabel: string
  icon: React.ReactNode
  label: string
  description: string
  colorClass: string
}

function ActionButton({
  onClick,
  disabled,
  isLoading,
  loadingLabel,
  icon,
  label,
  description,
  colorClass,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-3 w-full rounded-lg border px-4 py-3
        text-left transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${colorClass}
      `}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/20">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      </span>
      <span className="flex flex-col min-w-0">
        <span className="text-sm font-semibold leading-tight">{isLoading ? loadingLabel : label}</span>
        {!isLoading && <span className="text-xs opacity-75 leading-tight mt-0.5 truncate">{description}</span>}
      </span>
    </button>
  )
}

interface ReportCustomizationDrawerProps {
  open: boolean
  analyses: ReportProtocolAnalysis[]
  selectedAnalysisIds: number[]
  onToggleAnalysis: (analysisId: number) => void
  onToggleOpen: (open: boolean) => void
}

const EXCLUDED_ANALYSIS_CODE = 660001

function isSelectableAnalysis(analysis: ReportProtocolAnalysis) {
  return analysis.code !== EXCLUDED_ANALYSIS_CODE && analysis.is_valid !== false
}

function isVisibleAnalysis(analysis: ReportProtocolAnalysis) {
  return analysis.code !== EXCLUDED_ANALYSIS_CODE
}

function ReportCustomizationDrawer({
  open,
  analyses,
  selectedAnalysisIds,
  onToggleAnalysis,
  onToggleOpen,
}: ReportCustomizationDrawerProps) {
  const visibleAnalyses = analyses.filter(isVisibleAnalysis)
  const selectedCount = selectedAnalysisIds.filter((id) => visibleAnalyses.some((analysis) => analysis.id === id)).length

  return (
    <div
      style={{ left: "calc(50% - 112px)" }}
      className="absolute top-0 h-full w-[404px] overflow-visible pointer-events-auto"
    >
      <div
        className={`absolute inset-y-0 right-0 z-10 flex h-full w-[340px] flex-col overflow-hidden rounded-r-[28px] border border-l-0 border-slate-200 bg-slate-50 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-[280px]" : "translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col pl-6 pr-12">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Personalizar reporte</p>
              <p className="text-xs text-slate-500">{selectedCount} análisis seleccionados</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {visibleAnalyses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                No hay análisis disponibles para personalizar.
              </div>
            ) : (
              <div className="space-y-2">
                {visibleAnalyses.map((analysis) => {
                  const checked = selectedAnalysisIds.includes(analysis.id)
                  const isDisabled = !isSelectableAnalysis(analysis)
                  return (
                    <button
                      key={analysis.id}
                      type="button"
                      onClick={() => {
                        if (!isDisabled) {
                          onToggleAnalysis(analysis.id)
                        }
                      }}
                      disabled={isDisabled}
                      className={`w-full rounded-lg border p-3 text-left transition-all duration-200 ${
                        checked ? "border-[#204983] bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                      } ${analysis.is_sent ? "ring-1 ring-emerald-200" : ""} ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={checked}
                          disabled={isDisabled}
                          onCheckedChange={() => {
                            if (!isDisabled) {
                              onToggleAnalysis(analysis.id)
                            }
                          }}
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{analysis.name}</p>
                              <p className="text-xs text-slate-500">Código {analysis.code} · UB {analysis.ub}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {analysis.is_urgent && (
                                <Badge variant="destructive" className="text-[10px] px-2 py-0">
                                  Urgente
                                </Badge>
                              )}
                              <Badge
                                variant={analysis.is_sent ? "default" : "secondary"}
                                className={analysis.is_sent ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}
                              >
                                {analysis.is_sent ? "Ya enviado" : "Pendiente"}
                              </Badge>
                              {isDisabled && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                  No validado
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-slate-600">
                            {isDisabled
                              ? "No se incluirá hasta que el análisis esté validado."
                              : checked
                                ? "Se incluirá en el reporte."
                                : "No se enviará en este reporte."}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onToggleOpen(!open)}
        className={`absolute left-[356px] top-0 z-10 h-full w-12 rounded-r-[28px] border-l border-slate-200 bg-slate-50 shadow-lg transition-transform duration-300 ease-out transition-colors hover:bg-slate-100 ${
          open ? "translate-x-[280px]" : "translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col items-center justify-center gap-2 px-1 py-3">
          <span className="text-[11px] font-semibold leading-none text-[#204983] [writing-mode:vertical-rl] rotate-180">
            Personalizar reporte
          </span>
          <Badge variant="outline" className="border-[#204983] text-[#204983] px-1 py-0 text-[10px]">
            {selectedCount}
          </Badge>
          <ChevronRight className={`h-4 w-4 text-[#204983] transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
    </div>
  )
}

export function ReportDialog({
  open,
  onOpenChange,
  protocolId,
  reportType,
  onReportTypeChange,
  reportDate,
  onReportDateChange,
  reportTime,
  onReportTimeChange,
  onClearDateTime,
  analyses,
  selectedAnalysisIds,
  onToggleAnalysis,
  customizationOpen,
  onToggleCustomizationOpen,
  onGenerateReport,
  onDownloadReport,
  onSendEmail,
  onSendWhatsApp,
  isGenerating,
  isDownloading,
  isSending,
  isSendingWhatsApp,
}: ReportDialogProps) {
  const [mobileDragY, setMobileDragY] = useState(0)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const touchStartYRef = useRef<number | null>(null)
  const canDragToCloseRef = useRef(false)
  const startScrollTopRef = useRef(0)
  const frontScrollRef = useRef<HTMLDivElement | null>(null)
  const backScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const apply = () => setIsMobileViewport(media.matches)

    apply()

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", apply)
      return () => media.removeEventListener("change", apply)
    }

    media.addListener(apply)
    return () => media.removeListener(apply)
  }, [])

  const handleMobileTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touchY = e.touches[0]?.clientY ?? 0
    const activeScroll = customizationOpen ? backScrollRef.current : frontScrollRef.current

    touchStartYRef.current = touchY
    startScrollTopRef.current = activeScroll?.scrollTop ?? 0
    canDragToCloseRef.current = (activeScroll?.scrollTop ?? 0) <= 0
  }

  const handleMobileTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!canDragToCloseRef.current || touchStartYRef.current === null) {
      return
    }

    const touchY = e.touches[0]?.clientY ?? 0
    const delta = touchY - touchStartYRef.current

    // Only drag-close when pulling down from top; otherwise keep native scrolling.
    if (startScrollTopRef.current <= 0 && delta > 0) {
      setMobileDragY(Math.max(0, Math.min(220, delta)))
      e.preventDefault()
    }
  }

  const handleMobileTouchEnd = () => {
    if (!canDragToCloseRef.current) {
      touchStartYRef.current = null
      return
    }

    if (mobileDragY > 120) {
      onOpenChange(false)
    }

    setMobileDragY(0)
    touchStartYRef.current = null
    canDragToCloseRef.current = false
    startScrollTopRef.current = 0
  }

  const visibleAnalyses = analyses.filter(isVisibleAnalysis)
  const selectedCount = selectedAnalysisIds.filter((id) => visibleAnalyses.some((analysis) => analysis.id === id)).length
  const dialogContentClass = isMobileViewport
    ? "w-[95vw] max-w-[380px] gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none rounded-none translate-x-[-50%]"
    : `w-[95vw] max-w-[560px] gap-0 overflow-visible rounded-xl border border-slate-200 bg-white p-0 shadow-2xl transition-transform duration-300 ease-out ${
        customizationOpen ? "translate-x-[calc(-50%-146px)]" : "translate-x-[calc(-50%-6px)]"
      }`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={dialogContentClass}>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-[70] hidden h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-700 pointer-events-auto md:inline-flex"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative hidden min-h-[640px] flex-col overflow-visible md:flex">
          <div className="relative z-20 flex flex-1 flex-col overflow-hidden rounded-xl bg-white">
            <div className="px-6 pt-6 pb-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-[#204983]" />
                  Reportes — Protocolo #{protocolId}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Selecciona el tipo de reporte, la fecha y personaliza los análisis incluidos.
                </DialogDescription>
              </DialogHeader>
            </div>

            <Separator />

            <div className="relative px-6 py-4 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">Tipo de reporte</Label>
                <Select value={reportType} onValueChange={onReportTypeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Completo — destinado a PACIENTES</SelectItem>
                    <SelectItem value="summary">Resumen — destinado a FACTURACIÓN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">Fecha del reporte (opcional)</Label>
                <Input
                  type="date"
                  className="min-w-0 w-full"
                  value={reportDate}
                  onChange={(e) => onReportDateChange(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />

                <Label className="text-sm font-medium mt-2">Horario del reporte (opcional)</Label>
                <Input type="time" className="min-w-0 w-full" value={reportTime} onChange={(e) => onReportTimeChange(e.target.value)} step={60} />
                <div className="flex justify-start pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={onClearDateTime}>
                    Limpiar fecha y hora
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">La fecha y el horario son opcionales; podés enviar solo la fecha.</p>
              </div>
            </div>

            <Separator />

            <div className="px-6 py-4 flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Acciones</p>

              <div className="grid grid-cols-2 gap-2">
                <ActionButton
                  onClick={onGenerateReport}
                  disabled={isGenerating || isDownloading || isSending || isSendingWhatsApp}
                  isLoading={isGenerating}
                  loadingLabel="Imprimiendo..."
                  icon={<Printer className="h-5 w-5" />}
                  label="Imprimir"
                  description="Dialogo de impresion del navegador"
                  colorClass="border-[#204983] bg-[#204983] text-white hover:bg-[#1a3d6f] hover:border-[#1a3d6f]"
                />
                <ActionButton
                  onClick={onDownloadReport}
                  disabled={isGenerating || isDownloading || isSending || isSendingWhatsApp}
                  isLoading={isDownloading}
                  loadingLabel="Descargando..."
                  icon={<Download className="h-5 w-5" />}
                  label="Descargar PDF"
                  description="Guardar archivo en el dispositivo"
                  colorClass="border-[#204983] bg-[#204983] text-white hover:bg-[#1a3d6f] hover:border-[#1a3d6f]"
                />
                <ActionButton
                  onClick={onSendEmail}
                  disabled={isGenerating || isDownloading || isSending || isSendingWhatsApp}
                  isLoading={isSending}
                  loadingLabel="Enviando email..."
                  icon={<Mail className="h-5 w-5" />}
                  label="Enviar por email"
                  description="Envia el reporte al paciente"
                  colorClass="border-gray-200 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                />
                <ActionButton
                  onClick={onSendWhatsApp}
                  disabled={isGenerating || isDownloading || isSending || isSendingWhatsApp}
                  isLoading={isSendingWhatsApp}
                  loadingLabel="Enviando..."
                  icon={<MessageCircle className="h-5 w-5" />}
                  label="Enviar por WhatsApp"
                  description="Comparte el reporte por WhatsApp"
                  colorClass="border-green-200 bg-green-50 text-green-800 hover:bg-green-100 hover:border-green-300"
                />
              </div>
            </div>

            <Separator />
          </div>

          <ReportCustomizationDrawer
            open={customizationOpen}
            analyses={analyses}
            selectedAnalysisIds={selectedAnalysisIds}
            onToggleAnalysis={onToggleAnalysis}
            onToggleOpen={onToggleCustomizationOpen}
          />
        </div>

        <div className="md:hidden">
          <div
            className="mx-auto w-full max-w-[360px] [perspective:1400px]"
            onTouchStart={handleMobileTouchStart}
            onTouchMove={handleMobileTouchMove}
            onTouchEnd={handleMobileTouchEnd}
            onTouchCancel={handleMobileTouchEnd}
          >
            <div
              className="relative h-[86vh] max-h-[700px] w-full transition-[transform,opacity] duration-300 ease-out"
              style={{
                transform: `translateY(${mobileDragY}px)`,
                opacity: Math.max(0.7, 1 - mobileDragY / 420),
              }}
            >
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute right-3 top-3 z-50 inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute left-1/2 top-2 z-40 -translate-x-1/2 rounded-full px-2 py-2 touch-none">
                <div className="h-1.5 w-14 rounded-full bg-slate-300" />
              </div>

              <div
                className={`relative h-full w-full [transform-origin:center_center] [transform-style:preserve-3d] transition-transform duration-500 ${
                  customizationOpen ? "[transform:rotateY(180deg)]" : ""
                }`}
              >
                <div
                  className={`absolute inset-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl [backface-visibility:hidden] [transform-origin:center_center] transition-opacity duration-200 ${
                    customizationOpen ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"
                  }`}
                >
                  <div className="flex h-full flex-col">
                    <div className="px-5 pb-4 pt-5">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                          <FileText className="h-5 w-5 text-[#204983]" />
                          Reportes — Protocolo #{protocolId}
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                          Selecciona tipo de reporte y fecha. Luego podés personalizar análisis.
                        </DialogDescription>
                      </DialogHeader>
                    </div>

                    <Separator />

                    <div ref={frontScrollRef} className="flex-1 overflow-y-auto px-5 py-4 pb-24">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-medium">Tipo de reporte</Label>
                          <Select value={reportType} onValueChange={onReportTypeChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full">Completo — destinado a PACIENTES</SelectItem>
                              <SelectItem value="summary">Resumen — destinado a FACTURACIÓN</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <Label className="text-sm font-medium">Fecha del reporte (opcional)</Label>
                          <Input type="date" className="min-w-0 w-full" value={reportDate} onChange={(e) => onReportDateChange(e.target.value)} />

                          <Label className="mt-2 text-sm font-medium">Horario del reporte (opcional)</Label>
                          <Input type="time" className="min-w-0 w-full" value={reportTime} onChange={(e) => onReportTimeChange(e.target.value)} step={60} />

                          <div className="flex justify-start pt-1">
                            <Button type="button" variant="outline" size="sm" onClick={onClearDateTime}>
                              Limpiar fecha y hora
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">La fecha y el horario son opcionales; podés enviar solo la fecha.</p>
                        </div>

                        <Separator />

                        <div className="flex flex-col gap-2">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Acciones</p>
                          <div className="grid grid-cols-1 gap-2">
                            <ActionButton
                              onClick={onGenerateReport}
                              disabled={isGenerating || isDownloading || isSending || isSendingWhatsApp}
                              isLoading={isGenerating}
                              loadingLabel="Imprimiendo..."
                              icon={<Printer className="h-5 w-5" />}
                              label="Imprimir"
                              description="Dialogo de impresion del navegador"
                              colorClass="border-[#204983] bg-[#204983] text-white hover:bg-[#1a3d6f] hover:border-[#1a3d6f]"
                            />
                            <ActionButton
                              onClick={onDownloadReport}
                              disabled={isGenerating || isDownloading || isSending || isSendingWhatsApp}
                              isLoading={isDownloading}
                              loadingLabel="Descargando..."
                              icon={<Download className="h-5 w-5" />}
                              label="Descargar PDF"
                              description="Guardar archivo en el dispositivo"
                              colorClass="border-[#204983] bg-[#204983] text-white hover:bg-[#1a3d6f] hover:border-[#1a3d6f]"
                            />
                            <ActionButton
                              onClick={onSendEmail}
                              disabled={isGenerating || isDownloading || isSending || isSendingWhatsApp}
                              isLoading={isSending}
                              loadingLabel="Enviando email..."
                              icon={<Mail className="h-5 w-5" />}
                              label="Enviar por email"
                              description="Envia el reporte al paciente"
                              colorClass="border-gray-200 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                            />
                            <ActionButton
                              onClick={onSendWhatsApp}
                              disabled={isGenerating || isDownloading || isSending || isSendingWhatsApp}
                              isLoading={isSendingWhatsApp}
                              loadingLabel="Enviando..."
                              icon={<MessageCircle className="h-5 w-5" />}
                              label="Enviar por WhatsApp"
                              description="Comparte el reporte por WhatsApp"
                              colorClass="border-green-200 bg-green-50 text-green-800 hover:bg-green-100 hover:border-green-300"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
                      <Button
                        type="button"
                        onClick={() => onToggleCustomizationOpen(true)}
                        className="rounded-full bg-[#204983] px-5 text-white hover:bg-[#1a3d6f]"
                      >
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        Personalizar ({selectedCount})
                      </Button>
                    </div>
                  </div>
                </div>

                <div
                  className={`absolute inset-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] [transform-origin:center_center] transition-opacity duration-200 ${
                    customizationOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  <div className="flex h-full flex-col">
                    <div className="border-b border-slate-200 bg-white/95 px-5 py-4">
                      <p className="text-sm font-semibold text-slate-800">Personalizar reporte</p>
                      <p className="text-xs text-slate-500">{selectedCount} análisis seleccionados</p>
                    </div>

                    <div ref={backScrollRef} className="flex-1 overflow-y-auto px-5 py-4 pb-24">
                      {visibleAnalyses.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                          No hay análisis disponibles para personalizar.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {visibleAnalyses.map((analysis) => {
                            const checked = selectedAnalysisIds.includes(analysis.id)
                            const isDisabled = !isSelectableAnalysis(analysis)
                            return (
                              <button
                                key={analysis.id}
                                type="button"
                                onClick={() => {
                                  if (!isDisabled) {
                                    onToggleAnalysis(analysis.id)
                                  }
                                }}
                                disabled={isDisabled}
                                className={`w-full rounded-lg border p-3 text-left transition-all duration-200 ${
                                  checked ? "border-[#204983] bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                                } ${analysis.is_sent ? "ring-1 ring-emerald-200" : ""} ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={checked}
                                    disabled={isDisabled}
                                    onCheckedChange={() => {
                                      if (!isDisabled) {
                                        onToggleAnalysis(analysis.id)
                                      }
                                    }}
                                    className="mt-1"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-800">{analysis.name}</p>
                                        <p className="text-xs text-slate-500">Código {analysis.code} · UB {analysis.ub}</p>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        {analysis.is_urgent && (
                                          <Badge variant="destructive" className="px-2 py-0 text-[10px]">
                                            Urgente
                                          </Badge>
                                        )}
                                        <Badge
                                          variant={analysis.is_sent ? "default" : "secondary"}
                                          className={analysis.is_sent ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}
                                        >
                                          {analysis.is_sent ? "Ya enviado" : "Pendiente"}
                                        </Badge>
                                        {isDisabled && (
                                          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                            No validado
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
                      <Button
                        type="button"
                        onClick={() => onToggleCustomizationOpen(false)}
                        className="rounded-full bg-[#204983] px-5 text-white hover:bg-[#1a3d6f]"
                      >
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        Volver al reporte
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
