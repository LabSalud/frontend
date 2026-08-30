"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { DialogHeading } from "@/components/common/dialog-heading"
import { Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { MEDICAL_ENDPOINTS } from "@/config/api"
import type { Medico } from "@/types"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

interface EditMedicoDialogProps {
  isOpen: boolean
  medico: Medico
  onClose: () => void
  onSuccess: () => void
}

export const EditMedicoDialog: React.FC<EditMedicoDialogProps> = ({ isOpen, medico, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    license: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const { apiRequest } = useApi()
  const { error } = useToast()

  useEffect(() => {
    if (medico) {
      setFormData({
        first_name: medico.first_name,
        last_name: medico.last_name,
        license: medico.license,
      })
    }
  }, [medico])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await apiRequest(MEDICAL_ENDPOINTS.DOCTOR_DETAIL(medico.id), {
        method: "PATCH",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(formatApiError(errorData, "Error al actualizar el médico"))
      }

      error("Médico actualizado", { description: "Los cambios se guardaron correctamente" })
      onSuccess()
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Error desconocido")
      error("Error al actualizar médico", { description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeading icon={Stethoscope} title="Editar médico" description="Modificá los datos del médico." />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="first_name">Nombre</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="last_name">Apellido</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="license">Matrícula</Label>
            <Input
              id="license"
              value={formData.license}
              onChange={(e) => setFormData({ ...formData, license: e.target.value })}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-[#204983] hover:bg-[#1a3d6f]">
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
