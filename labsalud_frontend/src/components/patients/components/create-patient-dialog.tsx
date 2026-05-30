"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { AlertCircle, CheckCircle, UserCog } from "lucide-react"
import { PATIENT_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import type { ApiRequestOptions } from "@/hooks/use-api"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import { formatCuilForDisplay, inferGenderFromCuil, isValidCuil, normalizeCuil } from "@/lib/cuil"
import type { Patient } from "@/types"

interface CreatePatientDialogProps {
  isOpen: boolean
  onClose: () => void
  addPatient: (newPatient: Patient) => void
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

const initialValidation: ValidationState = {
  cuil: { isValid: false, message: "Ingresa un CUIL válido (11 dígitos)" },
  first_name: { isValid: false, message: "Ingresa el nombre" },
  last_name: { isValid: false, message: "Ingresa el apellido" },
  email: { isValid: true, message: "" },
  phone_mobile: { isValid: true, message: "" },
  alt_phone: { isValid: true, message: "" },
  birth_date: { isValid: false, message: "Selecciona la fecha de nacimiento" },
}

export function CreatePatientDialog({ isOpen, onClose, addPatient, apiRequest }: CreatePatientDialogProps) {
  const [formData, setFormData] = useState({
    cuil: "",
    first_name: "",
    last_name: "",
    birth_date: "",
    gender: "",
    phone_mobile: "",
    alt_phone: "",
    email: "",
    country: "Argentina",
    province: "Córdoba",
    city: "Leones",
    address: "",
    observations: "",
  })

  const [isAnonymous, setIsAnonymous] = useState(false)
  const [validation, setValidation] = useState<ValidationState>(initialValidation)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Funciones de validación
  const validateCUIL = (cuil: string) => {
    const digits = normalizeCuil(cuil)
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
      return { isValid: true, message: "" } // Email es opcional
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { isValid: false, message: "Formato de email inválido (ejemplo: usuario@dominio.com)" }
    }
    return { isValid: true, message: "Email válido" }
  }

  const validatePhone = (phone: string, field: string) => {
    if (!phone.trim()) {
      return { isValid: true, message: "" } // Teléfonos son opcionales
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

  // Validar campo específico
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Validación especial para CUIL - solo números y guiones
    if (name === "cuil") {
      const cleaned = normalizeCuil(value)
      const inferredGender = inferGenderFromCuil(cleaned)
      setFormData((prev) => ({
        ...prev,
        [name]: cleaned,
        ...(inferredGender ? { gender: inferredGender } : {}),
      }))

      // Marcar como tocado
      setTouched((prev) => ({ ...prev, [name]: true }))

      // Validar en tiempo real
      validateField(name, cleaned)
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))

      // Marcar como tocado
      setTouched((prev) => ({ ...prev, [name]: true }))

      // Validar en tiempo real
      validateField(name, value)
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const resetForm = () => {
    setFormData({
      cuil: "",
      first_name: "",
      last_name: "",
      birth_date: "",
      gender: "",
      phone_mobile: "",
      alt_phone: "",
      email: "",
      country: "Argentina",
      province: "Córdoba",
      city: "Leones",
      address: "",
      observations: "",
    })
    setValidation(initialValidation)
    setTouched({})
    setIsAnonymous(false)
  }

  const isFormValid = () => {
    if (isAnonymous) {
      const firstName = formData.first_name.trim()
      const lastName = formData.last_name.trim()
      const observations = formData.observations.trim()
      if (!firstName && !lastName) return false
      if ((!firstName || !lastName) && !observations) return false
      return true
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

  const handleCreatePatient = async () => {
    if (isAnonymous) {
      const firstName = formData.first_name.trim()
      const lastName = formData.last_name.trim()
      const observations = formData.observations.trim()
      if (!firstName && !lastName) {
        setTouched((prev) => ({ ...prev, first_name: true, last_name: true }))
        toast.error("Formulario inválido", {
          description: "Ingresá al menos nombre o apellido.",
          duration: TOAST_DURATION,
        })
        return
      }
      if ((!firstName || !lastName) && !observations) {
        setTouched((prev) => ({ ...prev, observations: true }))
        toast.error("Falta observación", {
          description: "Si no tenés nombre y apellido, agregá una observación que identifique al paciente.",
          duration: TOAST_DURATION,
        })
        return
      }
    } else {
      const allFields = ["cuil", "first_name", "last_name", "birth_date", "email", "phone_mobile", "alt_phone"]
      const newTouched = allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {})
      setTouched(newTouched)

      allFields.forEach((field) => {
        validateField(field, formData[field as keyof typeof formData] as string)
      })

      if (!isFormValid() || !formData.gender) {
        toast.error("Formulario inválido", {
          description: "Por favor, corrige los errores antes de continuar.",
          duration: TOAST_DURATION,
        })
        return
      }
    }

    try {
      const loadingId = toast.loading(isAnonymous ? "Creando paciente anónimo..." : "Creando paciente...")

      // Para anónimo: enviamos lo disponible. El backend desactiva is_anonymous
      // automáticamente si llegan los datos requeridos (cuil, last_name, birth_date, gender).
      const buildAnonymousPayload = () => {
        const payload: Record<string, unknown> = {
          is_anonymous: true,
        }
        if (formData.first_name.trim()) payload.first_name = formData.first_name.trim()
        const cuilDigits = normalizeCuil(formData.cuil)
        if (cuilDigits) payload.cuil = cuilDigits
        if (formData.last_name.trim()) payload.last_name = formData.last_name.trim()
        if (formData.birth_date) payload.birth_date = formData.birth_date
        if (formData.gender) payload.gender = formData.gender
        if (formData.phone_mobile.trim()) payload.phone_mobile = formData.phone_mobile.trim()
        if (formData.alt_phone.trim()) payload.alt_phone = formData.alt_phone.trim()
        if (formData.email.trim()) payload.email = formData.email.trim()
        if (formData.country.trim()) payload.country = formData.country.trim()
        if (formData.province.trim()) payload.province = formData.province.trim()
        if (formData.city.trim()) payload.city = formData.city.trim()
        if (formData.address.trim()) payload.address = formData.address.trim()
        if (formData.observations.trim()) payload.observations = formData.observations.trim()
        return payload
      }

      const dataToSend = isAnonymous
        ? buildAnonymousPayload()
        : {
            ...formData,
            cuil: normalizeCuil(formData.cuil),
            birth_date: formData.birth_date,
          }

      const response = await apiRequest(PATIENT_ENDPOINTS.PATIENTS, {
        method: "POST",
        body: dataToSend,
      })

      toast.dismiss(loadingId)

      if (response.ok) {
        const newPatient = await response.json()
        addPatient(newPatient)
        toast.success("Paciente creado", {
          description: `El paciente ${newPatient.first_name} ${newPatient.last_name} ha sido creado exitosamente.`,
          duration: TOAST_DURATION,
        })
        resetForm()
        onClose()
      } else {
        const errorData = await response.json()
        toast.error("Error al crear paciente", {
          description: formatApiError(errorData, "Ha ocurrido un error al crear el paciente."),
          duration: TOAST_DURATION,
        })
      }
    } catch (error) {
      console.error("Error al crear paciente:", error)
      toast.error("Error", {
        description: getErrorMessage(error, "Ha ocurrido un error al crear el paciente."),
        duration: TOAST_DURATION,
      })
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Paciente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <UserCog className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <Label htmlFor="is_anonymous" className="cursor-pointer text-sm font-semibold text-amber-900">
                  Paciente anónimo
                </Label>
                <p className="text-xs text-amber-800">
                  Para pacientes sin datos completos. Requiere al menos nombre o apellido. Si falta alguno, agregá una observación.
                </p>
              </div>
            </div>
            <Switch
              id="is_anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked)}
            />
          </div>

          {isAnonymous ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-sm font-semibold">
                    Nombre <span className="text-gray-400 font-normal">(o apellido)</span>
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    placeholder="Juan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name_anon" className="text-sm font-semibold">
                    Apellido <span className="text-gray-400 font-normal">(o nombre)</span>
                  </Label>
                  <Input
                    id="last_name_anon"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    placeholder="Pérez"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Al menos uno (nombre o apellido). Si falta alguno, la observación abajo es obligatoria.
              </p>

              <div className="space-y-2">
                <Label htmlFor="cuil_anon">CUIL <span className="text-gray-400 font-normal">(opcional)</span></Label>
                <Input
                  id="cuil_anon"
                  name="cuil"
                  value={formatCuilForDisplay(formData.cuil)}
                  onChange={handleInputChange}
                  placeholder="20-12345678-4"
                  maxLength={13}
                  className="font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date_anon">Fecha de nacimiento <span className="text-gray-400 font-normal">(opcional)</span></Label>
                  <Input
                    id="birth_date_anon"
                    name="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender_anon">Género <span className="text-gray-400 font-normal">(opcional)</span></Label>
                  <Select value={formData.gender} onValueChange={(value) => handleSelectChange("gender", value)}>
                    <SelectTrigger id="gender_anon">
                      <SelectValue placeholder="Seleccionar" />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_mobile_anon">Teléfono móvil <span className="text-gray-400 font-normal">(opcional)</span></Label>
                  <Input
                    id="phone_mobile_anon"
                    name="phone_mobile"
                    value={formData.phone_mobile}
                    onChange={handleInputChange}
                    placeholder="Teléfono móvil"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alt_phone_anon">Teléfono alternativo <span className="text-gray-400 font-normal">(opcional)</span></Label>
                  <Input
                    id="alt_phone_anon"
                    name="alt_phone"
                    value={formData.alt_phone}
                    onChange={handleInputChange}
                    placeholder="Teléfono alternativo"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_anon">Email <span className="text-gray-400 font-normal">(opcional)</span></Label>
                <Input
                  id="email_anon"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country_anon">País</Label>
                  <Input
                    id="country_anon"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province_anon">Provincia</Label>
                  <Input
                    id="province_anon"
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city_anon">Ciudad</Label>
                  <Input
                    id="city_anon"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_anon">Dirección <span className="text-gray-400 font-normal">(opcional)</span></Label>
                <Input
                  id="address_anon"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Dirección completa"
                />
              </div>
            </>
          ) : (
            <>
              {/* CUIL - Campo principal */}
              <div className="space-y-2">
                <Label htmlFor="cuil" className="text-base font-semibold">
                  CUIL *
                </Label>
                <Input
                  id="cuil"
                  name="cuil"
                  value={formatCuilForDisplay(formData.cuil)}
                  onChange={handleInputChange}
                  placeholder="20123456784"
                  maxLength={13}
                  className={`font-mono text-lg ${getFieldStyle("cuil")}`}
                  required
                />
                {renderFieldMessage("cuil")}
              </div>

          {/* Información personal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
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
              <Label htmlFor="last_name">Apellido *</Label>
              <Input
                id="last_name"
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
              <Label htmlFor="birth_date">Fecha de nacimiento *</Label>
              <Input
                id="birth_date"
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
              <Label htmlFor="gender">Género *</Label>
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
              <Label htmlFor="phone_mobile">Teléfono móvil</Label>
              <Input
                id="phone_mobile"
                name="phone_mobile"
                value={formData.phone_mobile}
                onChange={handleInputChange}
                placeholder="Teléfono móvil"
                className={getFieldStyle("phone_mobile")}
              />
              {renderFieldMessage("phone_mobile")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="alt_phone">Teléfono alternativo</Label>
              <Input
                id="alt_phone"
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
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
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                placeholder="País"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Provincia</Label>
              <Input
                id="province"
                name="province"
                value={formData.province}
                onChange={handleInputChange}
                placeholder="Provincia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" name="city" value={formData.city} onChange={handleInputChange} placeholder="Ciudad" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Dirección completa"
            />
          </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="observations">
              Observaciones{" "}
              {isAnonymous && (!formData.first_name.trim() || !formData.last_name.trim()) ? (
                <span className="text-red-600 font-normal">*</span>
              ) : (
                <span className="text-gray-400 font-normal">(opcional)</span>
              )}
            </Label>
            <Textarea
              id="observations"
              name="observations"
              value={formData.observations}
              onChange={handleInputChange}
              placeholder="Cama 5, internado UTI, hijo de paciente X, etc."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button className="bg-[#204983]" onClick={handleCreatePatient} disabled={!isFormValid()}>
            Crear Paciente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
