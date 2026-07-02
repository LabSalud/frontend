"use client"

import { Printer, Download, Mail, MessageCircle, GitMerge, Loader2, PenLine, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { ReportSignature } from "@/types"

type BatchAction = "print" | "download" | "email" | "whatsapp"

interface BatchActionBarProps {
  selectedCount: number
  reportType: "full" | "summary"
  onReportTypeChange: (type: "full" | "summary") => void
  signed: boolean
  onSignedChange: (signed: boolean) => void
  signatureId: string
  onSignatureIdChange: (id: string) => void
  signatures: ReportSignature[]
  date: string
  onDateChange: (date: string) => void
  isProcessing: boolean
  onSelectAll: () => void
  onDeselectAll: () => void
  onBatch: (action: BatchAction) => void
  onMerge: (action: "print" | BatchAction) => void
}

/**
 * Barra flotante centrada para acciones en lote sobre los protocolos
 * seleccionados (reportes / envío / unificación). Presentacional: recibe todo
 * por props desde la página.
 */
export function BatchActionBar({
  selectedCount,
  reportType,
  onReportTypeChange,
  signed,
  onSignedChange,
  signatureId,
  onSignatureIdChange,
  signatures,
  date,
  onDateChange,
  isProcessing,
  onSelectAll,
  onDeselectAll,
  onBatch,
  onMerge,
}: BatchActionBarProps) {
  const defaultSignature = signatures.find((s) => s.is_default)

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-3">
      <div className="max-h-[70vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
        {/* Opciones (centradas) */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-[#204983] px-2.5 py-1 text-xs font-semibold text-white">{selectedCount} sel.</span>
          <Button variant="ghost" size="sm" onClick={onSelectAll} className="h-8 text-xs">
            Todos
          </Button>
          <Button variant="ghost" size="sm" onClick={onDeselectAll} className="h-8 text-xs">
            Ninguno
          </Button>

          <Select value={reportType} onValueChange={(v) => onReportTypeChange(v as "full" | "summary")}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Reporte completo</SelectItem>
              <SelectItem value="summary">Resumen</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="h-9 w-[150px]"
              title="Fecha de emisión (opcional)"
            />
            {date && (
              <button type="button" onClick={() => onDateChange("")} className="text-gray-400 hover:text-gray-600" title="Limpiar fecha">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSignedChange(!signed)}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors sm:text-sm",
              signed ? "border-[#204983] bg-blue-50 text-[#204983]" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
            )}
          >
            <PenLine className="h-4 w-4 shrink-0" />
            {signed ? "Firma digital" : "Sin firma"}
          </button>

          {signed && (
            <Select value={signatureId} onValueChange={onSignatureIdChange}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Firma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  {defaultSignature ? `${defaultSignature.name} (predeterminada)` : "Predeterminada del sistema"}
                </SelectItem>
                {signatures
                  .filter((s) => !s.is_default)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Acciones (centradas) */}
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 border-t border-gray-100 pt-2.5">
          <Button size="sm" variant="outline" disabled={selectedCount === 0 || isProcessing} onClick={() => onBatch("print")}>
            {isProcessing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Printer className="mr-1 h-4 w-4" />}
            Imprimir
          </Button>
          <Button size="sm" disabled={selectedCount === 0 || isProcessing} onClick={() => onBatch("download")} className="bg-[#204983] hover:bg-[#1a3d6f]">
            {isProcessing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            Descargar
          </Button>
          <Button size="sm" variant="outline" disabled={selectedCount === 0 || isProcessing} onClick={() => onBatch("email")}>
            <Mail className="mr-1 h-4 w-4" />
            Email
          </Button>
          <Button size="sm" variant="outline" disabled={selectedCount === 0 || isProcessing} onClick={() => onBatch("whatsapp")}>
            <MessageCircle className="mr-1 h-4 w-4" />
            WhatsApp
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedCount < 2 || isProcessing}
                className="border-[#204983] text-[#204983] hover:bg-[#204983] hover:text-white"
                title="Combinar varios protocolos del mismo paciente en un único reporte"
              >
                {isProcessing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <GitMerge className="mr-1 h-4 w-4" />}
                Unificar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
              <DropdownMenuLabel>Reporte unificado</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onMerge("print")}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMerge("download")}>
                <Download className="mr-2 h-4 w-4" /> Descargar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMerge("email")}>
                <Mail className="mr-2 h-4 w-4" /> Enviar por email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMerge("whatsapp")}>
                <MessageCircle className="mr-2 h-4 w-4" /> Enviar por WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
