"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import type { Determination } from "@/types"
import { CATALOG_ENDPOINTS } from "@/config/api"

interface EditDeterminationDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  isOpen?: boolean
  onClose?: () => void
  onSuccess: (updatedDetermination: Determination) => void
  determination: Determination
  analysisId?: number
}

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
      setErrors({})
      setIsLoading(false)
    }
  }, [determination, isDialogOpen])

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
      const determinationUpdateData: Partial<Determination> = {}

      if (name !== determination.name) determinationUpdateData.name = name
      if (measureUnit !== determination.measure_unit) determinationUpdateData.measure_unit = measureUnit
      if (formula !== (determination.formula || "")) {
        determinationUpdateData.formula = formula.trim() || ""
      }

      if (Object.keys(determinationUpdateData).length === 0) {
        toastActions.info("Sin cambios", { description: "No se realizaron modificaciones." })
        handleOpenChange(false)
        return
      }

      const response = await apiRequest(CATALOG_ENDPOINTS.DETERMINATION_DETAIL(determination.id), {
        method: "PATCH",
        body: determinationUpdateData,
      })

      if (response.ok) {
        const updatedDetermination = await response.json()
        toastActions.success("Éxito", { description: "Determinación actualizada correctamente." })
        onSuccess(updatedDetermination)
        handleOpenChange(false)
      } else {
        const errorData = await response.json()
        const backendErrors = errorData.detail || errorData.errors || errorData.error || errorData
        if (typeof backendErrors === "string") {
          setErrors({ form: backendErrors })
          toastActions.error("Error", { description: backendErrors })
        } else if (typeof backendErrors === "object" && backendErrors !== null) {
          const formattedErrors: Record<string, string> = {}
          for (const key in backendErrors) {
            if (Array.isArray(backendErrors[key])) {
              formattedErrors[key] = backendErrors[key].join(", ")
            } else {
              formattedErrors[key] = String(backendErrors[key])
            }
          }
          setErrors(formattedErrors)
          toastActions.error("Error", { description: "No se pudo actualizar la determinación." })
        } else {
          setErrors({ form: "Error al actualizar la determinación." })
          toastActions.error("Error", { description: "No se pudo actualizar la determinación." })
        }
      }
    } catch (error) {
      console.error("Error updating determination:", error)
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error de red o servidor."
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
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">Editar Determinación: {determination.name}</DialogTitle>
          <DialogDescription className="text-xs md:text-sm">Modifica los datos de la determinación.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 md:space-y-6 py-4">
          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs md:text-sm">
              {errors.form}
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
            {errors.formula && <p className="text-xs md:text-sm text-red-500">{errors.formula}</p>}
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
