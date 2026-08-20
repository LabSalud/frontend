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
import { useNbuOptions } from "@/hooks/use-nbu-options"
import { resolverUb } from "@/lib/ub-por-nomenclador"

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

  // EL UB QUE SE COBRA ES ESTE, NO EL DE ARRIBA
  // `bio_unit` es una etiqueta que se muestra en la pantalla de resultados. Lo
  // que decide cuánto paga el paciente es el UB del nomenclador de su obra
  // social, y hasta ahora solo se podía tocar desde la pantalla de
  // Nomencladores, escribiendo el código del análisis de memoria.
  const { nbus } = useNbuOptions()
  const [ubPorNbu, setUbPorNbu] = useState<Record<number, string>>({})
  const [ubOriginal, setUbOriginal] = useState<Record<number, string>>({})

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
      // Se arma con los valores del análisis y NO con la lista de nomencladores:
      // esa lista se rehace en cada render mientras carga, y con ella en las
      // dependencias el efecto volvía a correr y borraba lo tipeado.
      const propios: Record<number, string> = {}
      for (const valor of analysis.bio_unit_values ?? []) {
        if (valor.nbu_id) propios[valor.nbu_id] = valor.value
      }
      setUbPorNbu(propios)
      setUbOriginal(propios)
    }
  }, [analysis, open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = "El nombre es requerido."
    // Alfanumérico: la mayoría son los 6 dígitos del NBU, pero el laboratorio
    // también numera sus propias prácticas (`A15`, `INT-3`).
    if (!code.trim()) newErrors.code = "El código es requerido."
    else if (!/^[\w.-]+$/.test(code.trim()))
      newErrors.code = "El código no puede tener espacios ni símbolos raros."
    if (!bioUnit.trim()) newErrors.bioUnit = "La unidad bioquímica es requerida."

    // El principal es el último eslabón de la cadena: si se lo vacía no queda de
    // dónde heredar y el análisis deja de poder cobrarse. El backend también lo
    // rechaza; acá se avisa antes de escribir nada.
    const principal = nbus.find((nbu) => nbu.is_default)
    if (principal && ubOriginal[principal.id] && !(ubPorNbu[principal.id] ?? "").trim()) {
      newErrors.ub = `${principal.name} es el nomenclador principal: no puede quedarse sin UB. Cambiá el valor, o quitalo desde una actualización que cuelgue de él.`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!analysis || !validateForm()) return

    setIsLoading(true)
    try {
      const analysisUpdateData: Partial<Analysis> = {}
      if (code.trim() !== analysis.code) analysisUpdateData.code = code.trim()
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

      // Los UB van PRIMERO y con el código viejo: si en la misma pasada se
      // cambió el código, quitar un UB pide el código con el que está guardado.
      const cambiosDeUb = nbus.filter(
        (nbu) => (ubPorNbu[nbu.id] ?? "").trim() !== (ubOriginal[nbu.id] ?? ""),
      )
      for (const nbu of cambiosDeUb) {
        const valor = (ubPorNbu[nbu.id] ?? "").trim()
        const respuesta = valor
          ? await apiRequest(CATALOG_ENDPOINTS.NBU_UPDATE_UB_VALUE(nbu.id), {
              method: "POST",
              body: { analysis_id: analysis.id, value: valor },
            })
          : await apiRequest(CATALOG_ENDPOINTS.NBU_DELETE_UB_VALUE(nbu.id, analysis.code), {
              method: "DELETE",
            })
        if (!respuesta.ok) {
          const datos = await respuesta.json().catch(() => ({}))
          throw new Error(formatApiError(datos, `No se pudo guardar el UB en ${nbu.name}.`))
        }
      }

      if (Object.keys(analysisUpdateData).length === 0) {
        if (cambiosDeUb.length === 0) {
          toastActions.info("Sin cambios", { description: "No se realizaron modificaciones." })
          onOpenChange(false)
          return
        }
        toastActions.success("Éxito", { description: "UB actualizado correctamente." })
        onSuccess(analysis)
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
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
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
            <Label htmlFor="edit-bioUnit">Unidad Bioquímica (etiqueta) *</Label>
            <Input
              id="edit-bioUnit"
              value={bioUnit}
              onChange={(e) => setBioUnit(e.target.value)}
              placeholder="Ingrese la unidad bioquímica principal"
            />
            <p className="text-xs text-gray-500">
              Es el texto que se muestra junto al análisis. No interviene en el precio: lo que se
              cobra sale del UB por nomenclador, más abajo.
            </p>
            {errors.bioUnit && <p className="text-sm text-red-500">{errors.bioUnit}</p>}
          </div>

          {/* ESTE ES EL UB QUE SE COBRA.
              Antes se listaba de solo lectura, "UB históricas por año", y para
              cambiar uno había que ir a Nomencladores y escribir el código del
              análisis de memoria. Es el número que multiplica el valor de la UB
              de cada obra social: es acá donde se lo busca cuando algo se está
              cobrando mal. */}
          {nbus.length > 0 && (
            <div className="space-y-2 rounded-md border border-blue-100 bg-blue-50/50 p-3">
              <Label className="text-sm font-semibold text-blue-900">UB por nomenclador</Label>
              <p className="text-xs text-blue-800">
                Es lo que se cobra: cada obra social usa el nomenclador que tiene asignado. Dejarlo
                vacío hace que el análisis herede el UB del nomenclador del que cuelga — así solo se
                carga lo que cambió en cada actualización.
              </p>
              {errors.ub && <p className="text-sm text-red-600">{errors.ub}</p>}
              <div className="mt-1 space-y-1.5">
                {nbus.map((nbu) => {
                  const rige = resolverUb(analysis.bio_unit_values, nbu.id, nbus)
                  return (
                    <div key={nbu.id} className="flex items-center gap-2 rounded-md bg-white p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-gray-900">
                          {nbu.name}
                          {nbu.year ? <span className="text-gray-400"> · {nbu.year}</span> : null}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {rige.esPropio
                            ? "Valor propio"
                            : rige.valor
                              ? `Hereda ${rige.valor} de ${rige.heredadoDe}`
                              : "Sin UB en esta cadena"}
                        </p>
                      </div>
                      <Input
                        value={ubPorNbu[nbu.id] ?? ""}
                        onChange={(e) => setUbPorNbu((previo) => ({ ...previo, [nbu.id]: e.target.value }))}
                        placeholder={rige.valor && !rige.esPropio ? `${rige.valor} (heredado)` : "UB"}
                        className="h-8 w-24 shrink-0 tabular-nums"
                        aria-label={`UB en ${nbu.name}`}
                      />
                    </div>
                  )
                })}
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
