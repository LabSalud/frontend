"use client"
import type { Patient } from "@/types"
import type { ApiRequestOptions } from "@/hooks/use-api"
import { PatientCard } from "./patient-card"
import { AlertCircle } from "lucide-react"

interface PatientGridProps {
  patients: Patient[]
  onSelectPatient: (patient: Patient, action: string) => void
  updatePatient: (updatedPatient: Patient) => void
  apiRequest: (url: string, options?: ApiRequestOptions) => Promise<Response>
}

export function PatientGrid({ patients, onSelectPatient, updatePatient, apiRequest }: PatientGridProps) {
  if (patients.length === 0) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-12">
        <div className="flex flex-col items-center justify-center text-gray-500">
          <AlertCircle className="h-16 w-16 mb-4" />
          <h3 className="text-xl font-medium mb-2">No hay pacientes disponibles</h3>
          <p className="text-sm">No se encontraron pacientes que coincidan con tu búsqueda.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {patients.map((patient) => (
        <PatientCard
          key={patient.id}
          patient={patient}
          onSelectPatient={onSelectPatient}
          updatePatient={updatePatient}
          apiRequest={apiRequest}
        />
      ))}
    </div>
  )
}
