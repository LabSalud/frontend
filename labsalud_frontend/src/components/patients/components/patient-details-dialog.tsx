"use client"

import { useState } from "react"
import type { Patient } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Mail, Phone, MapPin, User, CreditCard, StickyNote, History } from "lucide-react"
import { PatientHistoryDialog } from "./patient-history-dialog"

interface PatientDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  patient: Patient | null
}

export function PatientDetailsDialog({ isOpen, onClose, patient }: PatientDetailsDialogProps) {
  const [historyOpen, setHistoryOpen] = useState(false)
  if (!patient) return null

  // Reemplazar la función formatDateForDisplay con esta versión corregida:
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

    // Si viene en formato ISO o yyyy-mm-dd, usar parsing directo para evitar problemas de zona horaria
    if (dateString.includes("-")) {
      const [year, month, day] = dateString.split("-")
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`
    }

    return dateString
  }

  // Calcula edad a partir de la fecha de nacimiento.
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0

    let year, month, day

    if (birthDate.includes("/")) {
      const parts = birthDate.split("/")
      if (parts[0].length === 4) {
        // yyyy/mm/dd
        ;[year, month, day] = parts.map(Number)
      } else {
        // dd/mm/yyyy
        ;[day, month, year] = parts.map(Number)
      }
    } else if (birthDate.includes("-")) {
      // yyyy-mm-dd
      ;[year, month, day] = birthDate.split("-").map(Number)
    } else {
      return 0
    }

    // Crear fecha sin problemas de zona horaria
    const birthDateObj = new Date(year, month - 1, day) // month - 1 porque los meses en JS van de 0-11
    const today = new Date()

    let age = today.getFullYear() - birthDateObj.getFullYear()
    const monthDiff = today.getMonth() - birthDateObj.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--
    }

    return age
  }

  const formatDni = (dni: string) => {
    const digits = dni.replace(/\D/g, "")
    if (digits.length >= 7 && digits.length <= 8) {
      return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }
    return dni
  }

  // Función para mapear sexo correctamente
  const getSexDisplay = (sex: string) => {
    if (sex === "M" || sex === "Masculino") return "Masculino"
    if (sex === "F" || sex === "Femenino") return "Femenino"
    return sex
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Detalles del Paciente</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información principal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">DNI</p>
                <p className="text-lg font-mono font-semibold text-[#204983]">
                  {patient.is_anonymous ? "ANÓNIMO" : formatDni(patient.dni || "")}
                </p>
              </div>
            </div>
          </div>

          {/* Información personal */}
          <div>
            <p className="text-sm font-medium text-gray-500">Nombre completo</p>
            <p className="text-xl font-semibold">{`${patient.first_name} ${patient.last_name}`}</p>
          </div>

          {/* Información demográfica */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Fecha de nacimiento</p>
                <p>
                  {formatDateForDisplay(patient.birth_date)} ({calculateAge(patient.birth_date)} años)
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Sexo</p>
              <Badge variant={patient.sex === "M" ? "default" : "secondary"}>
                {getSexDisplay(patient.sex)}
              </Badge>
            </div>
          </div>

          {/* Información de contacto */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Información de Contacto</h3>

            <div className="grid grid-cols-2 gap-4">
              {patient.phone_mobile && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Teléfono móvil</p>
                    <p>{patient.phone_mobile}</p>
                  </div>
                </div>
              )}

              {patient.alt_phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Teléfono alternativo</p>
                    <p>{patient.alt_phone}</p>
                  </div>
                </div>
              )}
            </div>

            {patient.email && (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p>{patient.email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Información de ubicación */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Ubicación</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">País</p>
                <p>{patient.country}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Provincia</p>
                <p>{patient.province}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Ciudad</p>
                <p>{patient.city}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Dirección</p>
                <p>{patient.address}</p>
              </div>
            </div>
          </div>

          {patient.observations && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <StickyNote className="h-5 w-5" />
                <span>Observaciones</span>
              </h3>
              <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">{patient.observations}</p>
            </div>
          )}

          <div className="border-t pt-4">
            <Button variant="outline" className="w-full" onClick={() => setHistoryOpen(true)}>
              <History className="h-4 w-4 mr-2 text-[#204983]" />
              Ver Historial de Cambios
            </Button>
          </div>
        </div>
      </DialogContent>

      <PatientHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        patientId={patient.id}
        patientName={`${patient.first_name} ${patient.last_name}`}
      />
    </Dialog>
  )
}
