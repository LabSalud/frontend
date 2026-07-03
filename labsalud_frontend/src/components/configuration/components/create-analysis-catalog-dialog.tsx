"use client"

import type React from "react"
import type { Analysis } from "@/types"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { DialogHeading } from "@/components/common/dialog-heading"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, TestTube } from "lucide-react"
import { CATALOG_ENDPOINTS } from "@/config/api"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

interface CreateAnalysisCatalogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newAnalysis: Analysis) => void
}

export const CreateAnalysisCatalogDialog: React.FC<CreateAnalysisCatalogDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { apiRequest } = useApi()
  const toastActions = useToast()
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [bioUnit, setBioUnit] = useState("")
  const [isUrgent, setIsUrgent] = useState(false)
  const [requiresDerivacion, setRequiresDerivacion] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setCode("")
      setName("")
      setBioUnit("")
      setIsUrgent(false)
      setRequiresDerivacion(false)
      setErrors({})
      setIsLoading(false)
    }
  }, [open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = "El nombre es requerido."
    if (!code.trim()) newErrors.code = "El código es requerido."
    else if (isNaN(Number(code))) newErrors.code = "El código debe ser numérico."
    if (!bioUnit.trim()) newErrors.bioUnit = "La unidad bioquímica es requerida."

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const analysisData = {
        code: Number.parseInt(code, 10),
        name,
        bio_unit: bioUnit,
        is_urgent: isUrgent,
        requires_derivacion: requiresDerivacion,
      }
      const response = await apiRequest(CATALOG_ENDPOINTS.ANALYSIS, {
        method: "POST",
        body: analysisData,
      })

      if (response.ok) {
        const newAnalysis = await response.json()
        toastActions.success("Éxito", { description: "Análisis creado correctamente." })
        onSuccess(newAnalysis)
        onOpenChange(false)
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Error desconocido" }))
        const errorMessage = formatApiError(errorData, "No se pudo crear el análisis.")
        const backendErrors = errorData.errors || errorData.detail || errorData
        if (typeof backendErrors === "object" && backendErrors !== null) {
          const formattedErrors: Record<string, string> = {}
          for (const key in backendErrors) {
            if (Array.isArray(backendErrors[key])) {
              formattedErrors[key] = backendErrors[key].join(", ")
            } else {
              formattedErrors[key] = backendErrors[key]
            }
          }
          setErrors(formattedErrors)
        } else {
          setErrors({ form: backendErrors || "Error al crear el análisis." })
        }
        toastActions.error("Error", { description: errorMessage })
      }
    } catch (error) {
      console.error("Error creating analysis:", error)
      const errorMessage = getErrorMessage(error, "Ocurrió un error de red o servidor.")
      setErrors({ form: errorMessage })
      toastActions.error("Error", { description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeading icon={TestTube} title="Nuevo análisis" description="Completá los datos para el nuevo análisis." />
        <div className="space-y-6 py-4">
          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{errors.form}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">Código *</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ingrese el código numérico"
            />
            {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingrese el nombre del análisis"
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bioUnit">Unidad Bioquímica *</Label>
            <Input
              id="bioUnit"
              value={bioUnit}
              onChange={(e) => setBioUnit(e.target.value)}
              placeholder="Ingrese la unidad bioquímica"
            />
            {errors.bioUnit && <p className="text-sm text-red-500">{errors.bioUnit}</p>}
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="isUrgent" className="font-medium">
                Análisis Urgente
              </Label>
              <p className="text-sm text-gray-500">Marcar si este análisis es de carácter urgente</p>
            </div>
            <Switch id="isUrgent" checked={isUrgent} onCheckedChange={setIsUrgent} />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="requiresDerivacion" className="font-medium">
                Requiere derivación
              </Label>
              <p className="text-sm text-gray-500">
                Si la obra social cobra derivación, este análisis suma el monto fijo.
              </p>
            </div>
            <Switch
              id="requiresDerivacion"
              checked={requiresDerivacion}
              onCheckedChange={setRequiresDerivacion}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            style={{ backgroundColor: "#204983", color: "white" }}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Análisis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
