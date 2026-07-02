"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AuditAvatars } from "@/components/common/audit-avatars"
import { History, Pencil, Trash, TestTube } from "lucide-react"
import { AnalysisList } from "./analysis-list"
import { formatBioUnitValues } from "@/lib/catalog-format"
import type { Analysis } from "@/types"

interface AnalysisDetailSheetProps {
  analysis: Analysis | null
  open: boolean
  onOpenChange: (open: boolean) => void
  refreshKey: number
  onEdit: (analysis: Analysis) => void
  onDelete: (analysis: Analysis) => void
  onShowHistory: (analysis: Analysis) => void
}

export function AnalysisDetailSheet({
  analysis,
  open,
  onOpenChange,
  refreshKey,
  onEdit,
  onDelete,
  onShowHistory,
}: AnalysisDetailSheetProps) {
  if (!analysis) return null
  const bioUnitItems = formatBioUnitValues(analysis.bio_unit_values)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <TestTube className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2 truncate text-lg">
                {analysis.name || "Sin nombre"}
                {analysis.is_urgent && <Badge variant="destructive">Urgente</Badge>}
              </SheetTitle>
              <SheetDescription>
                Código{" "}
                <span className="font-mono font-semibold text-blue-800">{analysis.code || "N/A"}</span> · UB{" "}
                {analysis.bio_unit || "N/A"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 p-4">
          {bioUnitItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unidades bioquímicas históricas</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {bioUnitItems.map((item) => (
                  <Badge key={item} variant="outline" className="bg-blue-50 text-[10px] text-blue-700">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {(analysis.creation || analysis.last_change) && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Auditoría</span>
              <AuditAvatars creation={analysis.creation} lastChange={analysis.last_change} size="sm" />
            </div>
          )}

          <Separator />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Determinaciones</p>
            <div className="rounded-lg border border-gray-200 bg-gray-50">
              <AnalysisList analysis={analysis} showInactive={false} refreshKey={refreshKey} />
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-2 border-t border-gray-200 p-4">
          <Button variant="outline" size="sm" className="w-full" onClick={() => onShowHistory(analysis)}>
            <History className="mr-1.5 h-4 w-4 text-[#204983]" />
            Ver historial completo
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="bg-[#204983] hover:bg-[#1a3d6f]"
              onClick={() => onEdit(analysis)}
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => onDelete(analysis)}
            >
              <Trash className="mr-1.5 h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
