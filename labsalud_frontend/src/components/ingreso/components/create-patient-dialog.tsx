"use client"

import type React from "react"

import { useState } from "react"
import { AlertCircle, CheckCircle, User } from "lucide-react"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card"
import { useApi } from "../../../hooks/use-api"
import { toast } from "sonner"
import type { Patient } from "../../../types"
import { PATIENT_ENDPOINTS } from "@/config/api"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import { formatCuilForDisplay, getCuilValidationMessage, inferGenderFromCuil, isValidCuil, normalizeCuil } from "@/lib/cuil"

interface CreatePatientDialogProps {
  initialCuil?: string
  onPatientCreated: (patient: Patient) => void
  onCancel: () => void
}

type ValidationResult = { isValid: boolean; message: string }
type ValidatedField = "cuil" | "first_name" | "last_name" | "birth_date" | "email"

export function CreatePatientDialog({ initialCuil = "", onPatientCreated, onCancel }: CreatePatientDialogProps) {
  const { apiRequest } = useApi()
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    cuil: normalizeCuil(initialCuil),
    first_name: "",
    last_name: "",
    birth_date: "",
    gender: inferGenderFromCuil(initialCuil) || "",
    phone_mobile: "",
    phone_landline: "",
    email: "",
    country: "Argentina",
    province: "",
    city: "",
    address: "",
    observations: "",
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({
    cuil: Boolean(normalizeCuil(initialCuil)),
  })

  const validateField = (name: ValidatedField, value: string): ValidationResult => {
    if (name === "cuil") {
      return { isValid: isValidCuil(value), message: getCuilValidationMessage(value) }
    }
    if (name === "first_name") {
      if (!value.trim()) return { isValid: false, message: "El nombre es obligatorio" }
      if (value.trim().length < 2) return { isValid: false, message: "Mínimo 2 caracteres" }
      return { isValid: true, message: "Nombre válido" }
    }
    if (name === "last_name") {
      if (!value.trim()) return { isValid: false, message: "El apellido es obligatorio" }
      if (value.trim().length < 2) return { isValid: false, message: "Mínimo 2 caracteres" }
      return { isValid: true, message: "Apellido válido" }
    }
    if (name === "birth_date") {
      return value ? { isValid: true, message: "Fecha válida" } : { isValid: false, message: "La fecha de nacimiento es obligatoria" }
    }
    if (name === "email") {
      if (!value.trim()) return { isValid: true, message: "" }
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? { isValid: true, message: "Email válido" }
        : { isValid: false, message: "Formato de email inválido" }
    }
    return { isValid: true, message: "" }
  }

  const getFieldValidation = (name: ValidatedField) => validateField(name, String(formData[name] || ""))

  const getFieldStyle = (name: ValidatedField) => {
    if (!touched[name]) return ""
    return getFieldValidation(name).isValid ? "border-green-500 focus:ring-green-500" : "border-red-500 focus:ring-red-500"
  }

  const renderFieldMessage = (name: ValidatedField) => {
    if (!touched[name]) return null
    const field = getFieldValidation(name)
    if (!field.message) return null

    return (
      <div className={`flex items-center gap-1 text-xs mt-1 ${field.isValid ? "text-green-600" : "text-red-600"}`}>
        {field.isValid ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
        <span>{field.message}</span>
      </div>
    )
  }

  const handleInputChange = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    if (field === "cuil") {
      const cleaned = normalizeCuil(value)
      const inferredGender = inferGenderFromCuil(cleaned)
      setFormData((prev) => ({
        ...prev,
        cuil: cleaned,
        ...(inferredGender ? { gender: inferredGender } : {}),
      }))
      return
    }

    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.cuil || !formData.first_name || !formData.last_name || !formData.birth_date || !formData.gender) {
      const fieldsToValidate: ValidatedField[] = ["cuil", "first_name", "last_name", "birth_date", "email"]
      setTouched((prev) => ({ ...prev, ...Object.fromEntries(fieldsToValidate.map((field) => [field, true])) }))
      toast.error("Formulario inválido", {
        description: !formData.gender ? "Seleccione el género del paciente." : "Complete los campos obligatorios.",
      })
      return
    }

    const fieldsToValidate: ValidatedField[] = ["cuil", "first_name", "last_name", "birth_date", "email"]
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(fieldsToValidate.map((field) => [field, true])) }))
    if (!fieldsToValidate.every((field) => getFieldValidation(field).isValid)) {
      toast.error("Formulario inválido", {
        description: "Por favor, corrige los errores antes de continuar.",
      })
      return
    }

    try {
      setIsCreating(true)
      const response = await apiRequest(PATIENT_ENDPOINTS.PATIENTS, {
        method: "POST",
        body: {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          cuil: normalizeCuil(formData.cuil),
          birth_date: formData.birth_date,
          gender: formData.gender,
          phone_mobile: formData.phone_mobile.trim(),
          alt_phone: formData.phone_landline.trim(),
          email: formData.email.trim(),
          country: formData.country.trim(),
          province: formData.province.trim(),
          city: formData.city.trim(),
          address: formData.address.trim(),
          observations: formData.observations.trim(),
        },
      })

      if (response.ok) {
        const newPatient = await response.json()
        onPatientCreated(newPatient)
        toast.success("Paciente creado exitosamente")
      } else {
        const errorData = await response.json()
        toast.error("Error al crear paciente", {
          description: formatApiError(errorData, "Ha ocurrido un error al crear el paciente."),
        })
      }
    } catch (error) {
      console.error("Error creating patient:", error)
      toast.error("Error al crear paciente", {
        description: getErrorMessage(error, "Error de conexión con el servidor"),
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader className="pb-4 bg-[#204983] text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Crear Nuevo Paciente
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cuil">CUIL *</Label>
              <Input
                id="cuil"
                value={formatCuilForDisplay(formData.cuil)}
                onChange={(e) => handleInputChange("cuil", e.target.value)}
                placeholder="20123456784"
                maxLength={13}
                className={getFieldStyle("cuil")}
                required
              />
              {renderFieldMessage("cuil")}
            </div>
            <div>
              <Label htmlFor="gender">Género *</Label>
              <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar género" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange("first_name", e.target.value)}
                placeholder="Juan"
                className={getFieldStyle("first_name")}
                required
              />
              {renderFieldMessage("first_name")}
            </div>
            <div>
              <Label htmlFor="last_name">Apellido *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                placeholder="Pérez"
                className={getFieldStyle("last_name")}
                required
              />
              {renderFieldMessage("last_name")}
            </div>
          </div>

          <div>
            <Label htmlFor="birth_date">Fecha de Nacimiento *</Label>
            <Input
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={(e) => handleInputChange("birth_date", e.target.value)}
              className={getFieldStyle("birth_date")}
              required
            />
            {renderFieldMessage("birth_date")}
          </div>

          {/* Información de contacto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone_mobile">Teléfono Móvil</Label>
              <Input
                id="phone_mobile"
                value={formData.phone_mobile}
                onChange={(e) => handleInputChange("phone_mobile", e.target.value)}
                placeholder="+54 9 11 1234-5678"
              />
            </div>
            <div>
              <Label htmlFor="phone_landline">Teléfono Fijo</Label>
              <Input
                id="phone_landline"
                value={formData.phone_landline}
                onChange={(e) => handleInputChange("phone_landline", e.target.value)}
                placeholder="011 1234-5678"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="juan.perez@email.com"
              className={getFieldStyle("email")}
            />
            {renderFieldMessage("email")}
          </div>

          {/* Dirección */}
          <div>
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Av. Corrientes 1234"
            />
          </div>

          <div>
            <Label htmlFor="observations">Observaciones</Label>
            <Input
              id="observations"
              value={formData.observations}
              onChange={(e) => handleInputChange("observations", e.target.value)}
              placeholder="Notas internas"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                placeholder="Buenos Aires"
              />
            </div>
            <div>
              <Label htmlFor="province">Provincia</Label>
              <Input
                id="province"
                value={formData.province}
                onChange={(e) => handleInputChange("province", e.target.value)}
                placeholder="Buenos Aires"
              />
            </div>
            <div>
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange("country", e.target.value)}
                placeholder="Argentina"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isCreating} className="flex-1 bg-[#204983] hover:bg-[#1a3d6f] text-white">
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creando...
                </>
              ) : (
                "Crear Paciente"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isCreating}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
