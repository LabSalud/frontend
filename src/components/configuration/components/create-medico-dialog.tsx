"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { DialogHeading } from "@/components/common/dialog-heading"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Stethoscope } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { toast } from "sonner"
import { MEDICAL_ENDPOINTS } from "@/config/api"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

interface CreateMedicoDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSuccess: () => void
  onClose: () => void
}

interface FormData {
  first_name: string
  last_name: string
  license: string
}

interface ValidationState {
  first_name: { isValid: boolean; message: string }
  last_name: { isValid: boolean; message: string }
  license: { isValid: boolean; message: string }
}

export function CreateMedicoDialog({ isOpen, onOpenChange, onSuccess }: CreateMedicoDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    last_name: "",
    license: "",
  })
  const [validation, setValidation] = useState<ValidationState>({
    first_name: { isValid: false, message: "" },
    last_name: { isValid: false, message: "" },
    license: { isValid: false, message: "" },
  })
  const [loading, setLoading] = useState(false)

  const { apiRequest } = useApi()

  const validateField = (name: keyof FormData, value: string) => {
    let isValid = false
    let message = ""

    switch (name) {
      case "first_name":
        isValid = value.trim().length >= 2
        message = isValid ? "Nombre válido" : "El nombre debe tener al menos 2 caracteres"
        break
      case "last_name":
        isValid = value.trim().length >= 2
        message = isValid ? "Apellido válido" : "El apellido debe tener al menos 2 caracteres"
        break
      case "license":
        isValid = value.trim().length >= 3
        message = isValid ? "Matrícula válida" : "La matrícula debe tener al menos 3 caracteres"
        break
    }

    setValidation((prev) => ({
      ...prev,
      [name]: { isValid, message },
    }))
  }

  const handleInputChange = (name: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    validateField(name, value)
  }

  const isFormValid = () => {
    return Object.values(validation).every((field) => field.isValid)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid()) return

    try {
      setLoading(true)
      const response = await apiRequest(MEDICAL_ENDPOINTS.DOCTORS, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        toast.success("Médico creado exitosamente")
        onSuccess()
        setFormData({ first_name: "", last_name: "", license: "" })
        setValidation({
          first_name: { isValid: false, message: "" },
          last_name: { isValid: false, message: "" },
          license: { isValid: false, message: "" },
        })
      } else {
        const errorData = await response.json()
        console.error("Error creating medico:", errorData)
        toast.error("Error al crear el médico", {
          description: formatApiError(errorData, "Error al crear el médico"),
        })
      }
    } catch (error) {
      console.error("Error creating medico:", error)
      toast.error("Error al crear el médico", {
        description: getErrorMessage(error, "Error de conexión con el servidor"),
      })
    } finally {
      setLoading(false)
    }
  }

  const renderValidationIcon = (field: keyof ValidationState) => {
    if (!formData[field]) return null
    return validation[field].isValid ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <AlertCircle className="w-4 h-4 text-red-500" />
    )
  }

  const renderValidationMessage = (field: keyof ValidationState) => {
    if (!formData[field] || !validation[field].message) return null
    return (
      <p className={`text-xs mt-1 ${validation[field].isValid ? "text-green-600" : "text-red-600"}`}>
        {validation[field].message}
      </p>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeading icon={Stethoscope} title="Nuevo médico" description="Ingresá los datos del nuevo médico." />
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre</Label>
              <div className="relative">
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange("first_name", e.target.value)}
                  placeholder="Ingresa el nombre"
                  className={`pr-10 ${
                    formData.first_name
                      ? validation.first_name.isValid
                        ? "border-green-500 focus:border-green-500"
                        : "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {renderValidationIcon("first_name")}
                </div>
              </div>
              {renderValidationMessage("first_name")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido</Label>
              <div className="relative">
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange("last_name", e.target.value)}
                  placeholder="Ingresa el apellido"
                  className={`pr-10 ${
                    formData.last_name
                      ? validation.last_name.isValid
                        ? "border-green-500 focus:border-green-500"
                        : "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {renderValidationIcon("last_name")}
                </div>
              </div>
              {renderValidationMessage("last_name")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="license">Matrícula Profesional</Label>
              <div className="relative">
                <Input
                  id="license"
                  value={formData.license}
                  onChange={(e) => handleInputChange("license", e.target.value)}
                  placeholder="Ingresa la matrícula profesional"
                  className={`pr-10 ${
                    formData.license
                      ? validation.license.isValid
                        ? "border-green-500 focus:border-green-500"
                        : "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {renderValidationIcon("license")}
                </div>
              </div>
              {renderValidationMessage("license")}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#204983] hover:bg-[#1a3d6f]" disabled={!isFormValid() || loading}>
              {loading ? "Creando..." : "Crear médico"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
