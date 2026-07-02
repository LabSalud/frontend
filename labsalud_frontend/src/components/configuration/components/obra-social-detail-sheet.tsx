"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { AuditAvatars } from "@/components/common/audit-avatars"
import { DollarSign, Edit, History, Loader2 } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { getNbuDisplayName } from "@/hooks/use-nbu-options"
import { MEDICAL_ENDPOINTS } from "@/config/api"
import type { NBU, ObraSocial } from "@/types"

interface ObraSocialDetailSheetProps {
  obraSocial: ObraSocial | null
  open: boolean
  onOpenChange: (open: boolean) => void
  nbus?: NBU[]
  onEdit: (os: ObraSocial) => void
  onToggleActive: (os: ObraSocial, newStatus: boolean) => void
  isToggling?: boolean
  onShowHistory: (os: ObraSocial) => void
}

export function ObraSocialDetailSheet({
  obraSocial,
  open,
  onOpenChange,
  nbus = [],
  onEdit,
  onToggleActive,
  isToggling,
  onShowHistory,
}: ObraSocialDetailSheetProps) {
  const { apiRequest } = useApi()
  const [details, setDetails] = useState<ObraSocial | null>(null)
  const [loading, setLoading] = useState(false)

  // Al abrir, traemos el detalle completo (los flags de cobro no vienen en la lista).
  useEffect(() => {
    if (!open || !obraSocial?.id) return
    setDetails(null)
    setLoading(true)
    apiRequest(MEDICAL_ENDPOINTS.INSURANCE_DETAIL(obraSocial.id))
      .then((r) => r.json())
      .then((d) => setDetails(d))
      .catch(() => setDetails(null))
      .finally(() => setLoading(false))
  }, [open, obraSocial?.id, apiRequest])

  if (!obraSocial) return null

  const data = details ?? obraSocial
  const nbuLabel = getNbuDisplayName(data.nbu, nbus)
  const flags = [
    { label: "Coseguro", active: data.charges_coseguro },
    { label: "Material descartable", active: data.charges_material_descartable },
    { label: "Derivación", active: data.charges_derivacion },
    { label: "Preautorización", active: data.requires_preauthorization },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#204983] text-xs font-bold text-white">
              OS
            </span>
            <div className="min-w-0">
              <SheetTitle className="truncate text-lg">{obraSocial.name}</SheetTitle>
              <SheetDescription>
                <Badge variant={obraSocial.is_active ? "default" : "secondary"} className="mt-0.5">
                  {obraSocial.is_active ? "Activa" : "Inactiva"}
                </Badge>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 p-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
            <span className="text-sm font-medium text-gray-700">Obra social activa</span>
            <div className="flex items-center gap-2">
              {isToggling && <Loader2 className="h-4 w-4 animate-spin text-[#204983]" />}
              <Switch
                checked={obraSocial.is_active}
                onCheckedChange={(v) => onToggleActive(obraSocial, v)}
                disabled={isToggling}
                className="data-[state=checked]:bg-[#204983]"
              />
            </div>
          </div>

          {data.description && <p className="text-sm text-gray-600">{data.description}</p>}

          {data.ub_value && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs font-medium text-gray-600">Valor UB</p>
                <p className="text-lg font-semibold text-green-700">{data.ub_value}</p>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Conceptos que cobra</p>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {flags.map((f) => (
                  <Badge
                    key={f.label}
                    variant={f.active ? "default" : "secondary"}
                    className={f.active ? "bg-[#204983] hover:bg-[#1a3d6f]" : "bg-gray-200 text-gray-500"}
                  >
                    {f.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Nomenclador</p>
            <p className="text-sm font-medium text-gray-800">{nbuLabel || "—"}</p>
          </div>

          {(data.creation || data.last_change) && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Auditoría</span>
                <AuditAvatars creation={data.creation} lastChange={data.last_change} size="sm" />
              </div>
            </>
          )}
        </div>

        <div className="mt-auto space-y-2 border-t border-gray-100 p-4">
          <Button variant="outline" size="sm" className="w-full" onClick={() => onShowHistory(obraSocial)}>
            <History className="mr-1.5 h-4 w-4 text-[#204983]" />
            Ver historial de cambios
            {details?.total_changes ? <span className="ml-1 text-xs text-gray-400">({details.total_changes})</span> : null}
          </Button>
          <Button size="sm" className="w-full bg-[#204983] hover:bg-[#1a3d6f]" onClick={() => onEdit(obraSocial)}>
            <Edit className="mr-1.5 h-4 w-4" />
            Editar obra social
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
