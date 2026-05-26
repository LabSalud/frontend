"use client"

import type React from "react"
import { useState } from "react"
import type { Patient } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Edit,
  Check,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  User,
  History,
  GitMerge,
} from "lucide-react"
import { toast } from "sonner"
import { PATIENT_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import { PatientHistoryDialog } from "./patient-history-dialog"
import { AuditAvatars } from "@/components/common/audit-avatars"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import { isValidCuil } from "@/lib/cuil"

interface PatientCardProps {
  patient: Patient
  onSelectPatient: (patient: Patient, action: string) => void
  updatePatient: (updatedPatient: any) => void
  apiRequest: (url: string, options?: any) => Promise<Response>
}

export function PatientCard({ patient, onSelectPatient, updatePatient, apiRequest }: PatientCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [editData, setEditData] = useState({
    cuil: patient.cuil,
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
  })

  // Función para convertir fecha del backend (dd/mm/yyyy o yyyy/mm/dd) a formato input (yyyy-mm-dd)
  function formatDateForInput(dateString: string) {
    if (!dateString) return ""

    if (dateString.includes("/")) {
      const parts = dateString.split("/")
      // Si el primer elemento tiene 4 dígitos, es yyyy/mm/dd
      if (parts[0].length === 4) {
        const [year, month, day] = parts
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      } else {
        // Si no, es dd/mm/yyyy
        const [day, month, year] = parts
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      }
    }
    return dateString.split("T")[0] // Si viene en formato ISO
  }

  // Función para mostrar fecha en formato dd/mm/yyyy
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return ""

    if (dateString.includes("/")) {
      const parts = dateString.split("/")
      // Si el primer elemento tiene 4 dígitos, es yyyy/mm/dd
      if (parts[0].length === 4) {
        const [year, month, day] = parts
        return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`
      } else {
        // Si no, ya está en dd/mm/yyyy
        return dateString
      }
    }

    // Si viene en formato ISO o yyyy-mm-dd, usar UTC para evitar problemas de zona horaria
    if (dateString.includes("-")) {
      const [year, month, day] = dateString.split("-")
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`
    }

    return dateString
  }

  const formatCuil = (cuil: string) => {
    const digits = cuil.replace(/-/g, "")
    if (digits.length === 11) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
    }
    return cuil
  }

  // Función para mapear género correctamente
  const getGenderDisplay = (gender: string) => {
    if (gender === "M" || gender === "Masculino") return "Masculino"
    if (gender === "F" || gender === "Femenino") return "Femenino"
    if (gender === "O") return "Otro"
    if (gender === "N") return "No especificar"
    return gender
  }

  // Función para obtener el valor del género para el badge
  const getGenderBadgeVariant = (gender: string) => {
    return gender === "M" || gender === "Masculino" ? "default" : "secondary"
  }

  // Función para obtener la letra del género
  const getGenderLetter = (gender: string) => {
    if (gender === "M" || gender === "Masculino") return "M"
    if (gender === "F" || gender === "Femenino") return "F"
    if (gender === "O") return "O"
    if (gender === "N") return "N"
    return gender
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name === "cuil") {
      const cleaned = value.replace(/[^\d-]/g, "")
      setEditData((prev) => ({
        ...prev,
        [name]: cleaned,
      }))
    } else {
      setEditData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setEditData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const hasChanges = () => {
    return (
      editData.cuil !== patient.cuil ||
      editData.first_name !== patient.first_name ||
      editData.last_name !== patient.last_name ||
      editData.birth_date !== formatDateForInput(patient.birth_date) ||
      editData.gender !== patient.gender ||
      editData.phone_mobile !== patient.phone_mobile ||
      editData.alt_phone !== patient.alt_phone ||
      editData.email !== patient.email ||
      editData.country !== patient.country ||
      editData.province !== patient.province ||
      editData.city !== patient.city ||
      editData.address !== patient.address
    )
  }

  const handleSave = async () => {
    if (!hasChanges()) {
      toast.info("Sin cambios", {
        description: "No se detectaron cambios para guardar.",
        duration: TOAST_DURATION,
      })
      setIsEditing(false)
      return
    }

    // Validación básica antes de enviar
    const cuilDigits = editData.cuil.replace(/-/g, "")
    if (!cuilDigits.trim() || cuilDigits.length !== 11 || !isValidCuil(cuilDigits)) {
      toast.error("Error de validación", {
        description: cuilDigits.length !== 11 ? "El CUIL debe tener 11 dígitos." : "El CUIL no es válido.",
        duration: TOAST_DURATION,
      })
      return
    }

    if (!editData.first_name.trim() || !editData.last_name.trim()) {
      toast.error("Error de validación", {
        description: "El nombre y apellido son obligatorios.",
        duration: TOAST_DURATION,
      })
      return
    }

    try {
      const loadingId = toast.loading("Actualizando paciente...")

      // Convertir fecha de yyyy-mm-dd a yyyy-mm-dd para el backend (ya está en el formato correcto)
      const formatDateForAPI = (dateString: string) => {
        return dateString // El input date ya devuelve yyyy-mm-dd
      }

      const dataToSend = {
        ...editData,
        cuil: editData.cuil.replace(/-/g, ""),
        birth_date: formatDateForAPI(editData.birth_date),
      }

      const response = await apiRequest(PATIENT_ENDPOINTS.PATIENT_DETAIL(patient.id), {
        method: "PATCH",
        body: dataToSend,
      })

      toast.dismiss(loadingId)

      if (response.ok) {
        const updatedPatientData = await response.json()
        updatePatient(updatedPatientData)
        toast.success("Paciente actualizado", {
          description: `Los datos de ${updatedPatientData.first_name} ${updatedPatientData.last_name} han sido actualizados.`,
          duration: TOAST_DURATION,
        })
        setIsEditing(false)
      } else {
        const errorData = await response.json()
        console.error("Error - Datos enviados:", dataToSend)
        console.error("Error - Respuesta del servidor:", errorData)
        toast.error("Error al actualizar", {
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

  const handleCancel = () => {
    setEditData({
      cuil: patient.cuil,
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
    })
    setIsEditing(false)
  }

  return (
    <>
      <Card className="w-full hover:shadow-lg transition-shadow bg-white/95 backdrop-blur-sm">
        <CardContent className="p-4 md:p-6">
          <div onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-[#204983]" />
                    <span className="font-mono font-bold text-lg md:text-xl text-[#204983]">
                      {patient.is_anonymous ? "ANÓNIMO" : formatCuil(patient.cuil)}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg md:text-xl text-gray-800">
                      {`${patient.first_name} ${patient.last_name || ""}`.trim()}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-1">
                      {patient.is_anonymous ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">Anónimo</Badge>
                      ) : (
                        <>
                          <span>{patient.age} años</span>
                          <Badge variant={getGenderBadgeVariant(patient.gender)} className="text-xs">
                            {getGenderLetter(patient.gender)}
                          </Badge>
                          <span className="hidden sm:inline">{patient.city}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-4">
                <AuditAvatars creation={patient.creation} lastChange={patient.last_change} size="sm" />

                <div className="flex items-center">
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex flex-wrap gap-2">
                  {!isEditing && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                        className="flex-1 sm:flex-none"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsHistoryOpen(true)}
                        className="flex-1 sm:flex-none"
                      >
                        <History className="h-4 w-4 mr-2" />
                        Ver Historial
                      </Button>
                    </>
                  )}
                  {isEditing && (
                    <>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Listo
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                        className="flex-1 sm:flex-none bg-transparent"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectPatient(patient, "merge")}
                      className="border-[#204983]/30 hover:bg-[#204983]/10 flex-1 sm:flex-none"
                    >
                      <GitMerge className="h-4 w-4 mr-2 text-[#204983]" />
                      Unificar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectPatient(patient, "delete")}
                      className="border-red-200 hover:bg-red-50 flex-1 sm:flex-none"
                    >
                      <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                      Eliminar
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {isEditing ? (
                  <>
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg text-gray-800">Información Personal</h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">CUIL</Label>
                          <Input
                            name="cuil"
                            value={editData.cuil}
                            onChange={handleInputChange}
                            className="mt-1"
                            maxLength={13}
                            placeholder="XX-XXXXXXXX-X"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Género</Label>
                          <Select
                            value={editData.gender}
                            onValueChange={(value) => handleSelectChange("gender", value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Nombre</Label>
                          <Input
                            name="first_name"
                            value={editData.first_name}
                            onChange={handleInputChange}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Apellido</Label>
                          <Input
                            name="last_name"
                            value={editData.last_name}
                            onChange={handleInputChange}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Fecha de nacimiento</Label>
                        <Input
                          name="birth_date"
                          type="date"
                          value={editData.birth_date}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg text-gray-800">Información de Contacto</h4>

                      <div>
                        <Label className="text-sm font-medium">Teléfono móvil</Label>
                        <Input
                          name="phone_mobile"
                          value={editData.phone_mobile}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Teléfono alternativo</Label>
                        <Input
                          name="alt_phone"
                          value={editData.alt_phone}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Email</Label>
                        <Input name="email" value={editData.email} onChange={handleInputChange} className="mt-1" />
                      </div>

                      <h4 className="font-semibold text-lg text-gray-800 mt-4">Ubicación</h4>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium">País</Label>
                          <Input
                            name="country"
                            value={editData.country}
                            onChange={handleInputChange}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Provincia</Label>
                          <Input
                            name="province"
                            value={editData.province}
                            onChange={handleInputChange}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Ciudad</Label>
                          <Input name="city" value={editData.city} onChange={handleInputChange} className="mt-1" />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Dirección</Label>
                        <Input name="address" value={editData.address} onChange={handleInputChange} className="mt-1" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-lg text-gray-800">Información Personal</h4>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-gray-600">
                          Nacimiento: <span className="font-medium">{formatDateForDisplay(patient.birth_date)}</span>
                          <span className="ml-2 text-gray-500">({patient.age} años)</span>
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <User className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-gray-600">
                          Género: <span className="font-medium">{getGenderDisplay(patient.gender)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-lg text-gray-800">Información de Contacto</h4>
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-gray-600">
                          Móvil: <span className="font-medium">{patient.phone_mobile || "No disponible"}</span>
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-gray-600">
                          Alternativo: <span className="font-medium">{patient.alt_phone || "No disponible"}</span>
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-gray-600">
                          Email: <span className="font-medium">{patient.email || "No disponible"}</span>
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-gray-600">
                          Ubicación:{" "}
                          <span className="font-medium">
                            {patient.city}, {patient.province}, {patient.country}
                          </span>
                        </span>
                      </div>
                      {patient.address && (
                        <div className="flex items-start text-sm">
                          <MapPin className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                          <span className="text-gray-600">
                            Dirección: <span className="font-medium">{patient.address}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PatientHistoryDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        patientId={patient.id}
        patientName={`${patient.first_name} ${patient.last_name}`}
      />
    </>
  )
}
