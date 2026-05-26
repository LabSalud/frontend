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
import { formatApiError, getErrorMessage } from "@/lib/api-error"

interface CreateDeterminationDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  isOpen?: boolean
  onClose?: () => void
  onSuccess: (newDetermination: Determination) => void
  analysisId: number
  analysis?: { id: number; name: string | null; code: number | null }
}

export const CreateDeterminationDialog: React.FC<CreateDeterminationDialogProps> = ({
  open,
  onOpenChange,
  isOpen,
  onClose,
  onSuccess,
  analysisId,
  analysis,
}) => {
  const { apiRequest } = useApi()
  const toastActions = useToast()
  const [name, setName] = useState("")
  const [measureUnit, setMeasureUnit] = useState("")
  const [formula, setFormula] = useState("")
  const [referenceValues, setReferenceValues] = useState("")
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

  const finalAnalysisId = analysisId ?? analysis?.id

  useEffect(() => {
    if (isDialogOpen) {
      setName("")
      setMeasureUnit("")
      setFormula("")
      setReferenceValues("")
      setErrors({})
      setIsLoading(false)
    }
  }, [isDialogOpen])

  const parseReferenceValues = () => {
    if (!referenceValues.trim()) return undefined

    try {
      return JSON.parse(referenceValues)
    } catch {
      return null
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = "El nombre es requerido."
    if (!measureUnit.trim()) newErrors.measureUnit = "La unidad de medida es requerida."
    if (referenceValues.trim() && parseReferenceValues() === null) {
      newErrors.referenceValues = "Los valores de referencia deben ser un JSON válido."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm() || !finalAnalysisId) return

    setIsLoading(true)
    try {
      const parsedReferenceValues = parseReferenceValues()
      const determinationData = {
        analysis: finalAnalysisId,
        name,
        measure_unit: measureUnit,
        formula: formula || "",
        ...(parsedReferenceValues ? { reference_values: parsedReferenceValues } : {}),
      }
      const response = await apiRequest(CATALOG_ENDPOINTS.DETERMINATIONS, {
        method: "POST",
        body: determinationData,
      })

      if (response.ok) {
        const newDetermination = await response.json()
        toastActions.success("Éxito", { description: "Determinación creada correctamente." })
        onSuccess(newDetermination)
        handleOpenChange(false)
      } else {
        const errorData = await response.json()
        const errorMessage = formatApiError(errorData, "No se pudo crear la determinación.")
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
          toastActions.error("Error", { description: errorMessage })
        } else {
          setErrors({ form: "Error al crear la determinación." })
          toastActions.error("Error", { description: errorMessage })
        }
      }
    } catch (error) {
      console.error("Error creating determination:", error)
      const errorMessage = getErrorMessage(error, "Ocurrió un error de red o servidor.")
      setErrors({ form: errorMessage })
      toastActions.error("Error", { description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">Nueva Determinación</DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Completa los datos para la nueva determinación del análisis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 md:space-y-6 py-4">
          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs md:text-sm">
              {errors.form}
            </div>
          )}

          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            El código se genera automáticamente al crear la determinación.
          </div>

          <div className="space-y-2">
            <Label htmlFor="determination-name" className="text-sm">
              Nombre *
            </Label>
            <Input
              id="determination-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingrese el nombre de la determinación"
              className="text-sm"
            />
            {errors.name && <p className="text-xs md:text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="determination-measureUnit" className="text-sm">
              Unidad de Medida *
            </Label>
            <Input
              id="determination-measureUnit"
              value={measureUnit}
              onChange={(e) => setMeasureUnit(e.target.value)}
              placeholder="ej: mg/dL, UI/L, etc."
              className="text-sm"
            />
            {errors.measureUnit && <p className="text-xs md:text-sm text-red-500">{errors.measureUnit}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="determination-formula" className="text-sm">
              Fórmula (Opcional)
            </Label>
            <Textarea
              id="determination-formula"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="Ingrese la fórmula de cálculo si aplica"
              rows={3}
              className="text-sm"
            />
            {errors.formula && <p className="text-xs md:text-sm text-red-500">{errors.formula}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="determination-reference-values" className="text-sm">
              Valores de Referencia (JSON opcional)
            </Label>
            <Textarea
              id="determination-reference-values"
              value={referenceValues}
              onChange={(e) => setReferenceValues(e.target.value)}
              placeholder='{"hombre_mayor":{"min":"70","max":"110"}}'
              rows={4}
              className="font-mono text-xs"
            />
            {errors.referenceValues && (
              <p className="text-xs md:text-sm text-red-500">{errors.referenceValues}</p>
            )}
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
            Crear Determinación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
