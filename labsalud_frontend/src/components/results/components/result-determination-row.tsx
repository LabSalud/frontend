"use client"

import type React from "react"
import { Loader2, Save, AlertTriangle, ShieldCheck, History } from "lucide-react"
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
  onFocus: () => void
  registerInput: (el: HTMLInputElement | null) => void
  registerTextarea: (el: HTMLTextAreaElement | null) => void
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onTextareaKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  previous: PreviousResult[]
  loadingPrevious: boolean
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
  onFocus,
  registerInput,
  registerTextarea,
  onInputKeyDown,
  onTextareaKeyDown,
  previous,
  loadingPrevious,
}: ResultDeterminationRowProps) {
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
      className={cn(
        "rounded-lg border p-3 shadow-sm transition-colors",
        isWrong ? "border-red-300 bg-red-50" : isValidated ? "border-emerald-200 bg-emerald-50/50" : hasValue ? "border-blue-200" : "border-gray-200 bg-white",
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        {/* Determinación + referencia */}
        <div className="md:w-2/5">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{det.name}</p>
            {unit && <span className="text-xs text-gray-500">({unit})</span>}
          </div>
          {isFormula && (
            <Badge variant="outline" className={cn("mt-1 text-[10px]", formulaResolved ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
              {formulaResolved ? "Calculado automáticamente" : "Fórmula pendiente"}
            </Badge>
          )}
          {referenceItems.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {referenceItems.map((item) => (
                <Badge key={item} variant="outline" className="bg-slate-50 text-[10px] text-slate-600">
                  {item}
                </Badge>
              ))}
            </div>
          )}
          {evaluation && evaluation.status !== "not_evaluated" && (
            <div className="mt-1.5">
              <Badge variant="outline" className={cn("text-[10px]", isOutOfRange ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
                {isOutOfRange && <AlertTriangle className="mr-1 h-3 w-3" />}
                {getReferenceEvaluationLabel(evaluation)}
              </Badge>
              {evaluatedReference && <p className="mt-0.5 text-[10px] text-gray-500">{evaluatedReference}</p>}
            </div>
          )}
          {locked && result.validated_by && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-700">
              <ShieldCheck className="h-3 w-3" />
              Validado por {result.validated_by.first_name} {result.validated_by.last_name}
            </p>
          )}
        </div>

        {/* Valor + anteriores */}
        <div className="md:w-1/4">
          <Input
            ref={registerInput}
            placeholder="Valor"
            value={value.value}
            onChange={(e) => onChange("value", e.target.value)}
            onKeyDown={onInputKeyDown}
            onFocus={onFocus}
            readOnly={readOnly}
            disabled={locked}
            className={cn(
              "font-medium",
              isWrong ? "border-red-300 bg-red-50" : isValidated ? "border-emerald-300 bg-emerald-100" : hasValue ? "border-blue-300 bg-blue-50" : "",
            )}
          />
          {previous.length > 0 && (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
              <History className="h-3 w-3" />
              Anterior: <span className="font-medium text-gray-700">{previous[0].value || "—"}</span>
            </div>
          )}
          {loadingPrevious && <p className="mt-1 text-[10px] text-gray-400">Buscando anteriores…</p>}
        </div>

        {/* Notas + guardar */}
        <div className="flex flex-1 items-start gap-2">
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
          <Button size="sm" onClick={onSave} disabled={saving || locked} className="bg-[#204983] hover:bg-[#1a3d6f]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
