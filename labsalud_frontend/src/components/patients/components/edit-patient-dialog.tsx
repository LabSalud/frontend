"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { Patient } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { AlertCircle, CheckCircle, UserCog, Sparkles } from "lucide-react"
import { PATIENT_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import type { ApiRequestOptions } from "@/hooks/use-api"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import { isValidCuil } from "@/lib/cuil"

interface EditPatientDialogProps {
  isOpen: boolean
  onClose: () => void
  patient: Patient | null
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>
  apiRequest: (url: string, options?: ApiRequestOptions) => Promise<Response>
}

interface ValidationState {
  cuil: { isValid: boolean; message: string }
  first_name: { isValid: boolean; message: string }
  last_name: { isValid: boolean; message: string }
  email: { isValid: boolean; message: string }
  phone_mobile: { isValid: boolean; message: string }
  alt_phone: { isValid: boolean; message: string }
  birth_date: { isValid: boolean; message: string }
}

export function EditPatientDialog({ isOpen, onClose, patient, setPatients, apiRequest }: EditPatientDialogProps) {
  const [formData, setFormData] = useState({
    cuil: "",
    first_name: "",
    last_name: "",
    birth_date: "",
    gender: "",
    phone_mobile: "",
    alt_phone: "",
    email: "",
    country: "",
    province: "",
    city: "",
    address: "",
    observations: "",
  })

  const [validation, setValidation] = useState<ValidationState>({
    cuil: { isValid: true, message: "" },
    first_name: { isValid: true, message: "" },
    last_name: { isValid: true, message: "" },
    email: { isValid: true, message: "" },
    phone_mobile: { isValid: true, message: "" },
    alt_phone: { isValid: true, message: "" },
    birth_date: { isValid: true, message: "" },
  })

  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Funciones de validación (iguales a las de crear)
  const validateCUIL = (cuil: string) => {
    const digits = cuil.replace(/-/g, "")
    if (!digits.trim()) {
      return { isValid: false, message: "El CUIL es obligatorio" }
    }
    if (!/^\d+$/.test(digits)) {
      return { isValid: false, message: "El CUIL solo debe contener números" }
    }
    if (digits.length !== 11) return { isValid: false, message: "El CUIL debe tener 11 dígitos" }
    if (!isValidCuil(digits)) return { isValid: false, message: "El CUIL no es válido" }
    return { isValid: true, message: "CUIL válido" }
  }

  const validateName = (name: string, field: string) => {
    if (!name.trim()) {
      return { isValid: false, message: `${field} es obligatorio` }
    }
    if (name.trim().length < 2) {
      return { isValid: false, message: "Mínimo 2 caracteres" }
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name.trim())) {
      return { isValid: false, message: "Solo letras y espacios" }
    }
    return { isValid: true, message: `${field} válido` }
  }

  const validateEmail = (email: string) => {
    if (!email.trim()) {
      return { isValid: true, message: "" }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { isValid: false, message: "Formato de email inválido (ejemplo: usuario@dominio.com)" }
    }
    return { isValid: true, message: "Email válido" }
  }

  const validatePhone = (phone: string, field: string) => {
    if (!phone.trim()) {
      return { isValid: true, message: "" }
    }
    if (!/^[\d\s\-+()]+$/.test(phone)) {
      return { isValid: false, message: `${field} solo puede contener números, espacios, guiones y paréntesis` }
    }
    if (phone.replace(/\D/g, "").length < 8) {
      return { isValid: false, message: `${field} debe tener al menos 8 dígitos` }
    }
    return { isValid: true, message: `${field} válido` }
  }

  const validateBirthDate = (date: string) => {
    if (!date) {
      return { isValid: false, message: "La fecha de nacimiento es obligatoria" }
    }
    const birthDate = new Date(date)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()

    if (birthDate > today) {
      return { isValid: false, message: "La fecha no puede ser futura" }
    }
    if (age > 120) {
      return { isValid: false, message: "La fecha parece incorrecta (edad mayor a 120 años)" }
    }
    if (age < 0) {
      return { isValid: false, message: "La fecha parece incorrecta" }
    }
    return { isValid: true, message: "Fecha válida" }
  }

  const validateField = (name: string, value: string) => {
    let result
    switch (name) {
      case "cuil":
        result = validateCUIL(value)
        break
      case "first_name":
        result = validateName(value, "El nombre")
        break
      case "last_name":
        result = validateName(value, "El apellido")
        break
      case "email":
        result = validateEmail(value)
        break
      case "phone_mobile":
        result = validatePhone(value, "El teléfono móvil")
        break
      case "alt_phone":
        result = validatePhone(value, "El teléfono alternativo")
        break
      case "birth_date":
        result = validateBirthDate(value)
        break
      default:
        return
    }

    setValidation((prev) => ({
      ...prev,
      [name]: result,
    }))
  }

  useEffect(() => {
    if (patient) {
      const formatDateForInput = (dateString: string) => {
        if (!dateString) return ""

        if (dateString.includes("/")) {
          const parts = dateString.split("/")
          if (parts[0].length === 4) {
            const [year, month, day] = parts
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
          } else {
            const [day, month, year] = parts
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
          }
        }
        return dateString.split("T")[0]
      }

      const newFormData = {
        cuil: patient.cuil || "",
        first_name: patient.first_name,
        last_name: patient.last_name,
        birth_date: formatDateForInput(patient.birth_date),
        gender: patient.gender,
        phone_mobile: patient.phone_mobile,
        alt_phone: patient.alt_phone,
        email: patient.email,
        country: patient.country,
        province: patient.province,
        city: patient.city,
        address: patient.address,
        observations: patient.observations || "",
      }

      setFormData(newFormData)

      // Validar campos iniciales
      Object.keys(newFormData).forEach((key) => {
        if (
          key !== "gender" &&
          key !== "country" &&
          key !== "province" &&
          key !== "city" &&
          key !== "address" &&
          key !== "observations"
        ) {
          validateField(key, newFormData[key as keyof typeof newFormData] as string)
        }
      })

      setTouched({})
    }
  }, [patient])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name === "cuil") {
      const cleaned = value.replace(/[^\d-]/g, "")
      setFormData((prev) => ({
        ...prev,
        [name]: cleaned,
      }))

      setTouched((prev) => ({ ...prev, [name]: true }))
      validateField(name, cleaned)
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))

      setTouched((prev) => ({ ...prev, [name]: true }))
      validateField(name, value)
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const isFormValid = () => {
    if (patient?.is_anonymous) {
      const optionalFieldsValid = ["email", "phone_mobile", "alt_phone"].every((field) => {
        const fieldValidation = validation[field as keyof ValidationState]
        return fieldValidation.isValid
      })
      const cuilDigits = formData.cuil.replace(/-/g, "")
      const cuilValid = !cuilDigits || validation.cuil.isValid
      return formData.first_name.trim().length >= 2 && optionalFieldsValid && cuilValid
    }

    const requiredFields = ["cuil", "first_name", "last_name", "birth_date"]
    const requiredFieldsValid = requiredFields.every((field) => {
      const fieldValidation = validation[field as keyof ValidationState]
      return fieldValidation.isValid
    })

    const optionalFieldsValid = ["email", "phone_mobile", "alt_phone"].every((field) => {
      const fieldValidation = validation[field as keyof ValidationState]
      return fieldValidation.isValid
    })

    return requiredFieldsValid && optionalFieldsValid && formData.gender !== ""
  }

  const handleUpdatePatient = async () => {
    if (!patient) return

    const requiredFields = patient.is_anonymous ? ["first_name"] : ["cuil", "first_name", "last_name", "birth_date"]
    const newTouched = requiredFields.reduce((acc, field) => ({ ...acc, [field]: true }), touched)
    setTouched(newTouched)

    requiredFields.forEach((field) => {
      validateField(field, formData[field as keyof typeof formData] as string)
    })

    if (!isFormValid()) {
      toast.error("Formulario inválido", {
        description: patient.is_anonymous
          ? "El identificador debe tener al menos 2 caracteres. Revisá CUIL, email o teléfonos si los cargaste."
          : "Por favor, corrige los errores antes de continuar.",
        duration: TOAST_DURATION,
      })
      return
    }

    try {
      const loadingId = toast.loading("Actualizando paciente...")

      const dataToSend = {
        ...formData,
        cuil: formData.cuil.replace(/-/g, ""),
        birth_date: formData.birth_date,
      }

      const response = await apiRequest(PATIENT_ENDPOINTS.PATIENT_DETAIL(patient.id), {
        method: "PATCH",
        body: dataToSend,
      })

      toast.dismiss(loadingId)

      if (response.ok) {
        const updatedPatient = await response.json()
        setPatients((prev) => prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p)))
        toast.success("Paciente actualizado", {
          description: `El paciente ${updatedPatient.first_name} ${updatedPatient.last_name} ha sido actualizado exitosamente.`,
          duration: TOAST_DURATION,
        })
        onClose()
      } else {
        const errorData = await response.json()
        toast.error("Error al actualizar paciente", {
          description: formatApiError(errorData, "Ha ocurrido un error al actualizar el paciente."),
          duration: TOAST_DURATION,
        })
      }
    } catch (error) {
      console.error("Error al actualizar paciente:", error)
      toast.error("Error", {
        description: getErrorMessage(error, "Ha ocurrido un error al actualizar el paciente."),
        duration: TOAST_DURATION,
      })
    }
  }

  const formatCuilDisplay = (cuil: string) => {
    const digits = cuil.replace(/-/g, "")
    if (digits.length === 11) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
    }
    return cuil
  }

  const getFieldStyle = (fieldName: string) => {
    if (!touched[fieldName]) return ""
    const field = validation[fieldName as keyof ValidationState]
    return field?.isValid ? "border-green-500 focus:ring-green-500" : "border-red-500 focus:ring-red-500"
  }

  const renderFieldMessage = (fieldName: string) => {
    if (!touched[fieldName]) return null
    const field = validation[fieldName as keyof ValidationState]
    if (!field || !field.message) return null

    return (
      <div className={`flex items-center gap-1 text-xs mt-1 ${field.isValid ? "text-green-600" : "text-red-600"}`}>
        {field.isValid ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
        <span>{field.message}</span>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Paciente
            {patient?.is_anonymous && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
                <UserCog className="h-3 w-3" />
                Anónimo
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        {patient?.is_anonymous && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-900">
              <p className="font-semibold">Este es un paciente anónimo.</p>
              <p>
                Cuando completes CUIL, apellido, fecha de nacimiento y género, el paciente dejará de ser anónimo automáticamente al guardar.
              </p>
            </div>
          </div>
        )}
        <div className="grid gap-4 py-4">
          {/* CUIL - Campo principal */}
          <div className="space-y-2">
            <Label htmlFor="edit-cuil" className="text-base font-semibold">
              CUIL {patient?.is_anonymous ? "" : "*"}
            </Label>
            <Input
              id="edit-cuil"
              name="cuil"
              value={formData.cuil}
              onChange={handleInputChange}
              placeholder="20-12345678-4"
              maxLength={13}
              className={`font-mono text-lg ${getFieldStyle("cuil")}`}
              required
            />
            {renderFieldMessage("cuil")}
            {formData.cuil && <p className="text-xs text-gray-500">Vista previa: {formatCuilDisplay(formData.cuil)}</p>}
          </div>

          {/* Información personal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first_name">Nombre *</Label>
              <Input
                id="edit-first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                placeholder="Juan"
                className={getFieldStyle("first_name")}
                required
              />
              {renderFieldMessage("first_name")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last_name">Apellido {patient?.is_anonymous ? "" : "*"}</Label>
              <Input
                id="edit-last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                placeholder="Pérez"
                className={getFieldStyle("last_name")}
                required
              />
              {renderFieldMessage("last_name")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-birth_date">Fecha de nacimiento {patient?.is_anonymous ? "" : "*"}</Label>
              <Input
                id="edit-birth_date"
                name="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={handleInputChange}
                className={getFieldStyle("birth_date")}
                required
              />
              {renderFieldMessage("birth_date")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gender">Género {patient?.is_anonymous ? "" : "*"}</Label>
              <Select value={formData.gender} onValueChange={(value) => handleSelectChange("gender", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar género" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                  <SelectItem value="O">Otro</SelectItem>
                  <SelectItem value="N">No especificar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Información de contacto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-phone_mobile">Teléfono móvil</Label>
              <Input
                id="edit-phone_mobile"
                name="phone_mobile"
                value={formData.phone_mobile}
                onChange={handleInputChange}
                placeholder="Teléfono móvil"
                className={getFieldStyle("phone_mobile")}
              />
              {renderFieldMessage("phone_mobile")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-alt_phone">Teléfono alternativo</Label>
              <Input
                id="edit-alt_phone"
                name="alt_phone"
                value={formData.alt_phone}
                onChange={handleInputChange}
                placeholder="Teléfono alternativo"
                className={getFieldStyle("alt_phone")}
              />
              {renderFieldMessage("alt_phone")}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="correo@ejemplo.com"
              className={getFieldStyle("email")}
            />
            {renderFieldMessage("email")}
          </div>

          {/* Información de ubicación */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-country">País</Label>
              <Input
                id="edit-country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                placeholder="País"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-province">Provincia</Label>
              <Input
                id="edit-province"
                name="province"
                value={formData.province}
                onChange={handleInputChange}
                placeholder="Provincia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city">Ciudad</Label>
              <Input
                id="edit-city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Ciudad"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-address">Dirección</Label>
            <Input
              id="edit-address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Dirección completa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-observations">Observaciones</Label>
            <Textarea
              id="edit-observations"
              name="observations"
              value={formData.observations}
              onChange={handleInputChange}
              placeholder="Notas internas, cama, institución, aclaraciones de contacto"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button className="bg-[#204983]" onClick={handleUpdatePatient} disabled={!isFormValid()}>
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
