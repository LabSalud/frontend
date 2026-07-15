"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { DialogHeading } from "@/components/common/dialog-heading"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, FlaskConical } from "lucide-react"
import type { Determination } from "@/types"
import { CATALOG_ENDPOINTS } from "@/config/api"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

interface EditDeterminationDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  isOpen?: boolean
  onClose?: () => void
  onSuccess: (updatedDetermination: Determination) => void
  determination: Determination
  analysisId?: number
}

// Los valores de referencia siempre son estos 4 grupos (y puede no tener).
const REF_GROUPS = [
  { key: "hombre", label: "Hombre", sex: "male", age_group: "adult" },
  { key: "mujer", label: "Mujer", sex: "female", age_group: "adult" },
  { key: "nino", label: "Niño", sex: "male", age_group: "child" },
  { key: "nina", label: "Niña", sex: "female", age_group: "child" },
] as const

type RangeMap = Record<string, { min: string; max: string }>
type RefRange = { sex?: string; age_group?: string; min_value?: string; max_value?: string }

const emptyRanges = (): RangeMap => ({
  hombre: { min: "", max: "" },
  mujer: { min: "", max: "" },
  nino: { min: "", max: "" },
  nina: { min: "", max: "" },
})

export const EditDeterminationDialog: React.FC<EditDeterminationDialogProps> = ({
  open,
  onOpenChange,
  isOpen,
  onClose,
  onSuccess,
  determination,
}) => {
  const { apiRequest } = useApi()
  const toastActions = useToast()
  const [name, setName] = useState("")
  const [measureUnit, setMeasureUnit] = useState("")
  const [formula, setFormula] = useState("")
  const [ranges, setRanges] = useState<RangeMap>(emptyRanges)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isDialogOpen = open ?? isOpen ?? false
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen)
    } else if (!newOpen && onClose) {
      onClose()
    }
  }

  useEffect(() => {
    if (determination && isDialogOpen) {
      setName(determination.name)
      setMeasureUnit(determination.measure_unit)
      setFormula(determination.formula || "")
      // Cargar los valores de referencia estructurados (reference_ranges) en los
      // 4 grupos. Antes se leía el JSON `reference_values`, por eso no aparecían.
      const existing = ((determination as { reference_ranges?: RefRange[] }).reference_ranges || [])
      const map = emptyRanges()
      REF_GROUPS.forEach((g) => {
        const found = existing.find((r) => r.sex === g.sex && r.age_group === g.age_group)
        if (found) map[g.key] = { min: found.min_value ?? "", max: found.max_value ?? "" }
      })
      setRanges(map)
      setErrors({})
      setIsLoading(false)
    }
  }, [determination, isDialogOpen])

  const setRange = (key: string, field: "min" | "max", value: string) =>
    setRanges((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = "El nombre es requerido."
    if (!measureUnit.trim()) newErrors.measureUnit = "La unidad de medida es requerida."
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!determination || !validateForm()) return

    setIsLoading(true)
    try {
      const body: Record<string, unknown> = {}
      if (name !== determination.name) body.name = name
      if (measureUnit !== determination.measure_unit) body.measure_unit = measureUnit
      if (formula !== (determination.formula || "")) body.formula = formula.trim() || ""

      // Siempre mandamos los valores de referencia (por si se limpió un grupo).
      body.reference_ranges = REF_GROUPS
        .filter((g) => ranges[g.key].min.trim() || ranges[g.key].max.trim())
        .map((g) => ({
          sex: g.sex,
          age_group: g.age_group,
          min_value: ranges[g.key].min.trim(),
          max_value: ranges[g.key].max.trim(),
        }))

      const response = await apiRequest(CATALOG_ENDPOINTS.DETERMINATION_DETAIL(determination.id), {
        method: "PATCH",
        body,
      })

      if (response.ok) {
        const updatedDetermination = await response.json()
        toastActions.success("Éxito", { description: "Determinación actualizada correctamente." })
        onSuccess(updatedDetermination)
        handleOpenChange(false)
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = formatApiError(errorData, "No se pudo actualizar la determinación.")
        setErrors({ form: errorMessage })
        toastActions.error("Error", { description: errorMessage })
      }
    } catch (error) {
      console.error("Error updating determination:", error)
      const errorMessage = getErrorMessage(error, "Ocurrió un error de red o servidor.")
      setErrors({ form: errorMessage })
      toastActions.error("Error", { description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  if (!determination) return null

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeading icon={FlaskConical} title="Editar determinación" description={determination.name} />
        <div className="space-y-4 md:space-y-6 py-4">
          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs md:text-sm">
              {errors.form}
            </div>
          )}

          {determination.code && (
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Código</Label>
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-700">
                {determination.code}
              </div>
              <p className="text-xs text-gray-500">El código se genera automáticamente y no puede modificarse.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-determination-name" className="text-sm">
              Nombre *
            </Label>
            <Input
              id="edit-determination-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingrese el nombre de la determinación"
              className="text-sm"
            />
            {errors.name && <p className="text-xs md:text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-determination-measureUnit" className="text-sm">
              Unidad de Medida *
            </Label>
            <Input
              id="edit-determination-measureUnit"
              value={measureUnit}
              onChange={(e) => setMeasureUnit(e.target.value)}
              placeholder="ej: mg/dL, UI/L, etc."
              className="text-sm"
            />
            {errors.measureUnit && <p className="text-xs md:text-sm text-red-500">{errors.measureUnit}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-determination-formula" className="text-sm">
              Fórmula (Opcional)
            </Label>
            <Textarea
              id="edit-determination-formula"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="Ingrese la fórmula de cálculo si aplica"
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Valores de referencia (opcional)</Label>
            <p className="text-xs text-gray-500">Dejá vacío el grupo que no aplique. Acepta decimales con «,» o «.».</p>
            <div className="space-y-2">
              <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-2 text-xs font-medium text-gray-500">
                <span />
                <span>Mínimo</span>
                <span>Máximo</span>
              </div>
              {REF_GROUPS.map((g) => (
                <div key={g.key} className="grid grid-cols-[80px_1fr_1fr] items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{g.label}</span>
                  <Input
                    value={ranges[g.key].min}
                    onChange={(e) => setRange(g.key, "min", e.target.value)}
                    placeholder="—"
                    className="h-9 text-sm"
                  />
                  <Input
                    value={ranges[g.key].max}
                    onChange={(e) => setRange(g.key, "max", e.target.value)}
                    placeholder="—"
                    className="h-9 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="w-full sm:w-auto bg-transparent"
            >
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full sm:w-auto bg-[#204983] hover:bg-[#1a3d6f] text-white"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
