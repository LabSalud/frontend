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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, TestTube } from "lucide-react"
import { CATALOG_ENDPOINTS } from "@/config/api"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

interface EditAnalysisCatalogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (updatedAnalysis: Analysis) => void
  analysis: Analysis
}

export const EditAnalysisCatalogDialog: React.FC<EditAnalysisCatalogDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  analysis,
}) => {
  const { apiRequest } = useApi()
  const toastActions = useToast()
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [bioUnit, setBioUnit] = useState("")
  const [isUrgent, setIsUrgent] = useState(false)
  const [requiresDerivacion, setRequiresDerivacion] = useState(false)
  const [category, setCategory] = useState<string>("")
  const [isObsolete, setIsObsolete] = useState(false)
  const [isRefNormalized, setIsRefNormalized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (analysis && open) {
      setCode(analysis.code.toString())
      setName(analysis.name)
      setBioUnit(analysis.bio_unit)
      setIsUrgent(analysis.is_urgent)
      setRequiresDerivacion(analysis.requires_derivacion ?? false)
      setCategory(analysis.category ?? "")
      setIsObsolete(analysis.is_obsolete ?? false)
      setIsRefNormalized(analysis.is_ref_normalized ?? false)
      setErrors({})
    }
  }, [analysis, open])

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
    if (!analysis || !validateForm()) return

    setIsLoading(true)
    try {
      const analysisUpdateData: Partial<Analysis> = {}
      if (Number.parseInt(code, 10) !== analysis.code) analysisUpdateData.code = Number.parseInt(code, 10)
      if (name !== analysis.name) analysisUpdateData.name = name
      if (bioUnit !== analysis.bio_unit) analysisUpdateData.bio_unit = bioUnit
      if (isUrgent !== analysis.is_urgent) analysisUpdateData.is_urgent = isUrgent
      if (requiresDerivacion !== (analysis.requires_derivacion ?? false)) {
        analysisUpdateData.requires_derivacion = requiresDerivacion
      }
      if (category !== (analysis.category ?? "")) {
        analysisUpdateData.category = category as Analysis["category"]
      }
      if (isObsolete !== (analysis.is_obsolete ?? false)) analysisUpdateData.is_obsolete = isObsolete
      if (isRefNormalized !== (analysis.is_ref_normalized ?? false)) analysisUpdateData.is_ref_normalized = isRefNormalized

      if (Object.keys(analysisUpdateData).length === 0) {
        toastActions.info("Sin cambios", { description: "No se realizaron modificaciones." })
        onOpenChange(false)
        return
      }

      const response = await apiRequest(CATALOG_ENDPOINTS.ANALYSIS_DETAIL(analysis.id), {
        method: "PATCH",
        body: analysisUpdateData,
      })

      if (response.ok) {
        const updatedAnalysis = await response.json()
        toastActions.success("Éxito", { description: "Análisis actualizado correctamente." })
        onSuccess(updatedAnalysis)
        onOpenChange(false)
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Error desconocido" }))
        const errorMessage = formatApiError(errorData, "No se pudo actualizar el análisis.")
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
          setErrors({ form: backendErrors || "Error al actualizar el análisis." })
        }
        toastActions.error("Error", { description: errorMessage })
      }
    } catch (error) {
      console.error("Error updating analysis:", error)
      const errorMessage = getErrorMessage(error, "Ocurrió un error de red o servidor.")
      setErrors({ form: errorMessage })
      toastActions.error("Error", { description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  if (!analysis) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeading icon={TestTube} title="Editar análisis" description={analysis.name} />
        <div className="space-y-6 py-4">
          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{errors.form}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-code">Código *</Label>
            <Input
              id="edit-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ingrese el código numérico"
            />
            {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingrese el nombre del análisis"
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-bioUnit">Unidad Bioquímica (principal) *</Label>
            <Input
              id="edit-bioUnit"
              value={bioUnit}
              onChange={(e) => setBioUnit(e.target.value)}
              placeholder="Ingrese la unidad bioquímica principal"
            />
            <p className="text-xs text-gray-500">
              Es la UB que se usa por defecto. Cada OOSS puede elegir la UB de un año específico según su nomenclador.
            </p>
            {errors.bioUnit && <p className="text-sm text-red-500">{errors.bioUnit}</p>}
          </div>

          {analysis.bio_unit_values && analysis.bio_unit_values.length > 0 && (
            <div className="space-y-2 rounded-md border border-blue-100 bg-blue-50/50 p-3">
              <Label className="text-sm font-semibold text-blue-900">
                UB históricas por año (referencia)
              </Label>
              <p className="text-xs text-blue-800">
                Estos valores se importan desde el catálogo Excel. Cada obra social usa la UB del año de su nomenclador asignado.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {analysis.bio_unit_values.map((item) => (
                  <span
                    key={item.year}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-mono text-blue-700"
                  >
                    <span className="font-semibold">{item.year}</span>
                    <span className="text-blue-400">·</span>
                    <span>{item.value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="edit-isUrgent" className="font-medium">
                Análisis Urgente
              </Label>
              <p className="text-sm text-gray-500">Marcar si este análisis es de carácter urgente</p>
            </div>
            <Switch id="edit-isUrgent" checked={isUrgent} onCheckedChange={setIsUrgent} />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="edit-requiresDerivacion" className="font-medium">
                Requiere derivación
              </Label>
              <p className="text-sm text-gray-500">
                Si la obra social cobra derivación, este análisis suma el monto fijo.
              </p>
            </div>
            <Switch
              id="edit-requiresDerivacion"
              checked={requiresDerivacion}
              onCheckedChange={setRequiresDerivacion}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-category">Categoría NBU</Label>
            <Select value={category || "none"} onValueChange={(v) => setCategory(v === "none" ? "" : v)}>
              <SelectTrigger id="edit-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin clasificar</SelectItem>
                <SelectItem value="pmo">PMO</SelectItem>
                <SelectItem value="pe">PE</SelectItem>
                <SelectItem value="gestion">Gestión</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="edit-isObsolete" className="font-medium">
                En desuso
              </Label>
              <p className="text-sm text-gray-500">Práctica dada de baja del nomenclador (sin UB vigente).</p>
            </div>
            <Switch id="edit-isObsolete" checked={isObsolete} onCheckedChange={setIsObsolete} />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="edit-isRefNormalized" className="font-medium">
                Normalizado (N)
              </Label>
              <p className="text-sm text-gray-500">Marca "N" del NBU (referencia normalizada).</p>
            </div>
            <Switch id="edit-isRefNormalized" checked={isRefNormalized} onCheckedChange={setIsRefNormalized} />
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
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
