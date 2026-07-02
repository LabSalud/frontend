"use client"

import type React from "react"
import { useState } from "react"
import { Loader2, Save, AlertTriangle, ShieldCheck, History, CheckCircle2, Circle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  formatEvaluatedReference,
  formatReferenceRange,
  formatReferenceValues,
  getReferenceEvaluationLabel,
} from "@/lib/catalog-format"
import { cn } from "@/lib/utils"
import type { PreviousResult, Result } from "@/types"
import type { ResultValue } from "@/hooks/use-protocol-results"

interface ResultDeterminationRowProps {
  result: Result
  value: ResultValue
  saving: boolean
  readOnly: boolean
  isFormula: boolean
  formulaResolved: boolean
  onChange: (field: "value" | "notes", value: string) => void
  onSave: () => void
  onLoadPrevious: () => void
  registerInput: (el: HTMLInputElement | null) => void
  registerTextarea: (el: HTMLTextAreaElement | null) => void
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onTextareaKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  previous: PreviousResult[]
  loadingPrevious: boolean
}

function fmtDateTime(v?: string | null) {
  if (!v) return ""
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
}
function fmtDate(v?: string | null) {
  if (!v) return ""
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function ResultDeterminationRow({
  result,
  value,
  saving,
  readOnly,
  isFormula,
  formulaResolved,
  onChange,
  onSave,
  onLoadPrevious,
  registerInput,
  registerTextarea,
  onInputKeyDown,
  onTextareaKeyDown,
  previous,
  loadingPrevious,
}: ResultDeterminationRowProps) {
  const [focused, setFocused] = useState(false)
  const det = result.determination
  const unit = det.measure_unit || ""
  const hasValue = !!result.value
  const isValidated = result.is_valid
  const isWrong = result.is_wrong
  const locked = isValidated && !isWrong

  const referenceItems = det.reference_ranges?.length
    ? det.reference_ranges.map(formatReferenceRange)
    : formatReferenceValues(det.reference_values)
  const evaluation = result.reference_range_evaluation
  const isOutOfRange = result.is_out_of_reference_range || evaluation?.is_out_of_reference_range
  const evaluatedReference = formatEvaluatedReference(evaluation)

  return (
    <div
      data-result-row
      className={cn(
        "rounded-lg border p-3 transition-colors",
        isWrong ? "border-red-300 bg-red-50" : isValidated ? "border-emerald-200 bg-emerald-50/40" : hasValue ? "border-blue-200 bg-blue-50/30" : "border-gray-200 bg-white",
      )}
    >
      {/* Línea superior: nombre + estado (con fecha de validación) */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-semibold text-gray-900">{det.name}</span>
          {unit && <span className="ml-1 text-xs text-gray-500">({unit})</span>}
          {isFormula && (
            <Badge variant="outline" className={cn("ml-2 text-[10px]", formulaResolved ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
              {formulaResolved ? "Auto" : "Fórmula pendiente"}
            </Badge>
          )}
          {result.is_sent && (
            <Badge variant="outline" className="ml-2 border-sky-200 bg-sky-50 text-[10px] text-sky-700">
              Enviado
            </Badge>
          )}
        </div>
        {isValidated ? (
          <div className="flex shrink-0 flex-col items-end text-right">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Validado
            </span>
            {result.validated_at && (
              <span className="text-[10px] text-emerald-600">
                {fmtDateTime(result.validated_at)}
                {result.validated_by && ` · ${result.validated_by.first_name} ${result.validated_by.last_name}`}
              </span>
            )}
          </div>
        ) : hasValue ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Cargado
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-gray-400">
            <Circle className="h-3.5 w-3.5" />
            Sin cargar
          </span>
        )}
      </div>

      {/* Cuerpo: valor + referencia + historial + notas + guardar */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
        <div className="lg:w-48">
          <Input
            ref={registerInput}
            placeholder="Valor"
            value={value.value}
            onChange={(e) => onChange("value", e.target.value)}
            onKeyDown={onInputKeyDown}
            onFocus={() => {
              setFocused(true)
              onLoadPrevious()
            }}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            readOnly={readOnly}
            disabled={locked}
            className={cn("h-11 text-base font-semibold", hasValue && !isValidated && "border-blue-300", isValidated && "border-emerald-300 bg-emerald-100")}
          />
          {/* Al enfocar el input se despliega el historial del paciente */}
          {focused && (
            <div className="mt-1.5 rounded-md border border-gray-100 bg-gray-50/70 p-1.5">
              <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                <History className="h-3 w-3" /> Valores anteriores
              </p>
              {loadingPrevious ? (
                <p className="text-[11px] text-gray-400">Buscando…</p>
              ) : previous.length === 0 ? (
                <p className="text-[11px] text-gray-400">Sin resultados anteriores</p>
              ) : (
                <ul className="max-h-32 space-y-0.5 overflow-y-auto">
                  {previous.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-medium text-gray-800">{p.value || "—"}</span>
                      <span className="text-[10px] text-gray-400">{fmtDate(p.validated_at || p.date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="lg:w-52">
          {referenceItems.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {referenceItems.map((item) => (
                <Badge key={item} variant="outline" className="bg-slate-50 text-[10px] text-slate-600">
                  {item}
                </Badge>
              ))}
            </div>
          )}
          {evaluation && evaluation.status !== "not_evaluated" && (
            <div className="mt-1">
              <Badge variant="outline" className={cn("text-[10px]", isOutOfRange ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
                {isOutOfRange && <AlertTriangle className="mr-1 h-3 w-3" />}
                {getReferenceEvaluationLabel(evaluation)}
              </Badge>
              {evaluatedReference && <p className="mt-0.5 text-[10px] text-gray-500">{evaluatedReference}</p>}
            </div>
          )}
        </div>

        <Textarea
          ref={registerTextarea}
          placeholder="Notas (opcional)"
          value={value.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          onKeyDown={onTextareaKeyDown}
          disabled={locked}
          rows={2}
          className="min-h-0 flex-1 resize-none text-sm"
        />
        <Button size="sm" onClick={onSave} disabled={saving || locked} className="h-11 bg-[#204983] hover:bg-[#1a3d6f]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
