"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, ChevronDown, DollarSign, History } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { AuditAvatars } from "@/components/common/audit-avatars"
import type { ObraSocial } from "@/types"
import { useApi } from "@/hooks/use-api"
import { getNbuDisplayName } from "@/hooks/use-nbu-options"
import { MEDICAL_ENDPOINTS } from "@/config/api"
import { ObraSocialHistoryDialog } from "./obra-social-history-dialog"
import type { NBU } from "@/types"

interface ObraSocialCardProps {
  obraSocial: ObraSocial
  nbus?: NBU[]
  onEdit?: (os: ObraSocial) => void
  onToggleActive?: (os: ObraSocial, newStatus: boolean) => void
  isToggling?: boolean
}

const formatDateShort = (dateString?: string) => {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export const ObraSocialCard: React.FC<ObraSocialCardProps> = ({
  obraSocial,
  nbus = [],
  onEdit,
  onToggleActive,
  isToggling,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [fullDetails, setFullDetails] = useState<ObraSocial | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const { apiRequest } = useApi()

  const {
    name,
    description,
    ub_value,
    is_active,
    creation,
    last_change,
    charges_coseguro,
    charges_material_descartable,
    charges_derivacion,
    requires_preauthorization,
  } = obraSocial

  const detailFlags = fullDetails ?? obraSocial
  const flags: Array<{ label: string; active?: boolean }> = [
    { label: "Coseguro", active: detailFlags.charges_coseguro },
    { label: "Material descartable", active: detailFlags.charges_material_descartable },
    { label: "Derivación", active: detailFlags.charges_derivacion },
    { label: "Preautorización", active: detailFlags.requires_preauthorization },
  ]
  const hasFlags = charges_coseguro || charges_material_descartable || charges_derivacion || requires_preauthorization
  const nbuLabel = getNbuDisplayName((fullDetails ?? obraSocial).nbu, nbus)

  const handleToggle = (newStatus: boolean) => {
    if (onToggleActive) {
      onToggleActive(obraSocial, newStatus)
    }
  }

  const handleCardClick = async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-expand]")) {
      return
    }

    const newExpandedState = !isExpanded
    setIsExpanded(newExpandedState)

    if (newExpandedState && !fullDetails && obraSocial.id) {
      setIsLoadingDetails(true)
      try {
        const response = await apiRequest(MEDICAL_ENDPOINTS.INSURANCE_DETAIL(obraSocial.id))
        const data = await response.json()
        setFullDetails(data)
      } catch (error) {
        console.error("Error fetching obra social details:", error)
      } finally {
        setIsLoadingDetails(false)
      }
    }
  }

  const canBeToggled = true

  return (
    <Card
      className={`transition-all duration-300 shadow-sm hover:shadow-lg cursor-pointer ${
        !is_active ? "bg-gray-50 opacity-75" : "bg-white"
      } ${isExpanded ? "ring-2 ring-[#204983] ring-opacity-20" : ""}`}
      onClick={handleCardClick}
    >
      <CardHeader className="p-3 md:p-4 pb-2 md:pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="flex-shrink-0 bg-[#204983] p-1.5 md:p-2 rounded-full">
                <div className="h-4 w-4 md:h-5 md:w-5 bg-white rounded-sm flex items-center justify-center">
                  <span className="text-[#204983] text-[10px] md:text-xs font-bold">OS</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className={`text-sm md:text-base font-semibold truncate ${is_active ? "text-gray-800" : "text-gray-500"}`}
                  title={name}
                >
                  {name}
                </h3>
                <div className="flex items-center flex-wrap gap-1 md:gap-2 mt-1">
                  <Badge variant={is_active ? "default" : "secondary"} className="text-[10px] md:text-xs">
                    {is_active ? "Activa" : "Inactiva"}
                  </Badge>
                  {ub_value && (
                    <>
                      <span className="text-xs text-gray-400 hidden sm:inline">•</span>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3 text-green-600" />
                        <span className="text-[10px] md:text-xs text-gray-600 font-medium">{ub_value}</span>
                      </div>
                    </>
                  )}
                  <span className="text-xs text-gray-400 hidden sm:inline">•</span>
                  <span className="text-xs md:text-xs text-gray-500 hidden sm:inline">
                    {formatDateShort(creation?.date)}
                  </span>
                  {hasFlags && (
                    <span className="text-[10px] md:text-xs text-[#204983] font-medium hidden sm:inline">
                      • Cobra extras
                    </span>
                  )}
                  {nbuLabel && (
                    <span className="text-[10px] md:text-xs text-gray-500 hidden sm:inline">
                      • {nbuLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 md:space-x-2" data-no-expand>
            <Switch
              checked={is_active}
              onCheckedChange={handleToggle}
              disabled={!canBeToggled || isToggling}
              className={`${
                is_active ? "data-[state=checked]:bg-[#204983]" : "opacity-50 data-[state=unchecked]:bg-gray-300"
              }`}
            />
            {isToggling && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-[#204983]" />
            )}
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        {!isExpanded && (creation || last_change) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <AuditAvatars creation={creation} lastChange={last_change} size="sm" />
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="px-3 md:px-4 pb-3 md:pb-4 pt-0 border-t border-gray-100">
          <div className="space-y-3 md:space-y-4 mt-3 md:mt-4">
            {description && (
              <div className="p-2 md:p-3 bg-gray-50 rounded-md">
                <p className="text-xs md:text-sm text-gray-700">{description}</p>
              </div>
            )}

            {ub_value && (
              <div className="flex items-center space-x-2 p-2 md:p-3 bg-green-50 rounded-md">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                <div>
                  <p className="text-[10px] md:text-xs text-gray-600 font-medium">Valor UB</p>
                  <p className="text-base md:text-lg font-semibold text-green-700">{ub_value}</p>
                </div>
              </div>
            )}

            <div className="p-2 md:p-3 bg-gray-50 rounded-md space-y-2">
              <p className="text-xs md:text-sm text-gray-700 font-semibold">Conceptos que cobra</p>
              <div className="flex flex-wrap gap-1.5">
                {flags.map((flag) => (
                  <Badge
                    key={flag.label}
                    variant={flag.active ? "default" : "secondary"}
                    className={`text-[10px] md:text-xs ${
                      flag.active ? "bg-[#204983] hover:bg-[#1a3d6f]" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {flag.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-2 md:p-3 bg-blue-50 rounded-md">
              <p className="text-[10px] md:text-xs text-blue-700 font-medium">Nomenclador</p>
              <p className="text-xs md:text-sm text-blue-900 font-semibold">{nbuLabel}</p>
            </div>

            {(creation || last_change) && (
              <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-md">
                <span className="text-xs md:text-sm text-gray-600 font-medium">Auditoría</span>
                <AuditAvatars creation={creation} lastChange={last_change} size="sm" />
              </div>
            )}

            <div data-no-expand>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs md:text-sm"
                disabled={isLoadingDetails}
                onClick={() => setHistoryOpen(true)}
              >
                <History className="h-3 w-3 md:h-4 md:w-4 mr-2 text-[#204983]" />
                Ver Historial de Cambios
                {fullDetails?.total_changes ? (
                  <span className="ml-2 text-[10px] md:text-xs text-muted-foreground">
                    ({fullDetails.total_changes})
                  </span>
                ) : null}
              </Button>
            </div>

            {onEdit && (
              <div className="pt-2 border-t border-gray-100" data-no-expand>
                <Button
                  onClick={() => onEdit(obraSocial)}
                  className="w-full bg-[#204983] hover:bg-[#1a3d6f] text-white shadow-sm text-xs md:text-sm"
                  size="sm"
                >
                  <Edit className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  Editar Obra Social
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}

      <ObraSocialHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        obraSocialId={obraSocial.id}
        obraSocialName={name}
      />
    </Card>
  )
}
