"use client"

import { Loader2, FileText, Printer, Mail, MessageCircle, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../ui/dialog"
import { Button } from "../../../ui/button"
import { Label } from "../../../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select"
import { Separator } from "../../../ui/separator"

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  protocolId: number
  reportType: "full" | "summary"
  onReportTypeChange: (type: "full" | "summary") => void
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
        <span className="text-sm font-semibold leading-tight">
          {isLoading ? loadingLabel : label}
        </span>
        {!isLoading && (
          <span className="text-xs opacity-75 leading-tight mt-0.5 truncate">{description}</span>
        )}
      </span>
    </button>
  )
}

export function ReportDialog({
  open,
  onOpenChange,
  protocolId,
  reportType,
  onReportTypeChange,
  onGenerateReport,
  onDownloadReport,
  onSendEmail,
  onSendWhatsApp,
  isGenerating,
  isDownloading,
  isSending,
  isSendingWhatsApp,
}: ReportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[480px] gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-[#204983]" />
              Reportes — Protocolo #{protocolId}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Seleccione el tipo de reporte y la accion a realizar.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Separator />

        {/* Report type selector */}
        <div className="px-6 py-4 flex flex-col gap-2">
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

        <Separator />

        {/* Action buttons */}
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

        {/* Footer */}
        <div className="px-6 py-3 flex justify-end bg-gray-50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
