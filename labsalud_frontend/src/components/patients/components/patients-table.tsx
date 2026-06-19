"use client"

import type { Patient } from "@/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash, AlertCircle, Eye } from "lucide-react"
import { useState } from "react"
import { PatientDetailsDialog } from "./patient-details-dialog"

interface PatientTableProps {
  patients: Patient[]
  onSelectPatient: (patient: Patient, action: string) => void
  canEdit: boolean
  canDelete: boolean
}

export function PatientTable({ patients, onSelectPatient, canEdit, canDelete }: PatientTableProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isViewingDetails, setIsViewingDetails] = useState(false)

  // Función para calcular edad corregida:
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

  const formatDni = (dni?: string | null) => {
    const digits = (dni || "").replace(/\D/g, "")
    if (digits.length >= 7 && digits.length <= 8) {
      return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }
    return dni
  }

  // Función para mapear género correctamente
  const getGenderDisplay = (gender: string) => {
    if (gender === "M" || gender === "Masculino") return "Masculino"
    if (gender === "F" || gender === "Femenino") return "Femenino"
    return gender
  }

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient)
    setIsViewingDetails(true)
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm">
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="font-semibold text-gray-900">DNI</TableHead>
                <TableHead className="font-semibold text-gray-900">Nombre</TableHead>
                <TableHead className="font-semibold text-gray-900">Edad</TableHead>
                <TableHead className="font-semibold text-gray-900">Género</TableHead>
                <TableHead className="font-semibold text-gray-900">Teléfono</TableHead>
                <TableHead className="font-semibold text-gray-900">Email</TableHead>
                <TableHead className="font-semibold text-gray-900">Ciudad</TableHead>
                <TableHead className="text-right font-semibold text-gray-900">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {patients.length > 0 ? (
                patients.map((patient) => (
                  <TableRow key={patient.id} className="bg-white hover:bg-gray-50/50 border-gray-200">
                    <TableCell className="font-mono font-medium text-[#204983] bg-white">
                      {patient.is_anonymous ? "ANÓNIMO" : formatDni(patient.dni)}
                    </TableCell>
                    <TableCell className="font-medium bg-white">{`${patient.first_name} ${patient.last_name}`}</TableCell>
                    <TableCell className="bg-white">{calculateAge(patient.birth_date)} años</TableCell>
                    <TableCell className="bg-white">
                      <Badge
                        variant={patient.gender === "M" ? "default" : "secondary"}
                      >
                        {getGenderDisplay(patient.gender)}
                      </Badge>
                    </TableCell>
                    <TableCell className="bg-white">{patient.phone_mobile || patient.alt_phone}</TableCell>
                    <TableCell className="max-w-[200px] truncate bg-white">{patient.email}</TableCell>
                    <TableCell className="bg-white">{patient.city}</TableCell>
                    <TableCell className="text-right bg-white">
                      <div className="flex justify-end space-x-2">
                        {/* Ver detalles */}
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(patient)}>
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* Editar paciente */}
                        {canEdit && (
                          <Button variant="outline" size="sm" onClick={() => onSelectPatient(patient, "edit")}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Eliminar paciente */}
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-200 hover:bg-red-50 bg-transparent"
                            onClick={() => onSelectPatient(patient, "delete")}
                          >
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="bg-white">
                  <TableCell colSpan={8} className="text-center py-4 bg-white">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p>No hay pacientes disponibles</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Diálogo de detalles */}
      <PatientDetailsDialog
        isOpen={isViewingDetails}
        onClose={() => setIsViewingDetails(false)}
        patient={selectedPatient}
      />
    </>
  )
}
