"use client"

import type React from "react"

import { useState } from "react"
import { Search, User, UserCog, X } from "lucide-react"
import { Input } from "../../ui/input"
import { Button } from "../../ui/button"
import { useApi } from "../../../hooks/use-api"
import { toast } from "sonner"
import { PATIENT_ENDPOINTS } from "../../../config/api"
import type { Patient } from "../../../types"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import { formatCuilForDisplay, getCuilValidationMessage, isValidCuil, normalizeCuil } from "@/lib/cuil"

interface PatientSearchProps {
  onPatientFound: (patient: Patient) => void
  onPatientNotFound: (cuil: string) => void
  onReset: () => void
  onCreateAnonymous?: () => void
}

export function PatientSearch({ onPatientFound, onPatientNotFound, onReset, onCreateAnonymous }: PatientSearchProps) {
  const { apiRequest } = useApi()
  const [searchCuil, setSearchCuil] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [showLetterWarning, setShowLetterWarning] = useState(false)

  const handleSearch = async () => {
    if (!searchCuil.trim()) {
      toast.error("Ingrese un CUIL para buscar")
      return
    }
    if (!isValidCuil(searchCuil)) {
      toast.error("CUIL inválido", { description: getCuilValidationMessage(searchCuil) })
      return
    }

    try {
      setIsSearching(true)
      const cuilDigits = normalizeCuil(searchCuil)
      console.log("Searching patient with CUIL:", cuilDigits)

      const response = await apiRequest(`${PATIENT_ENDPOINTS.PATIENTS}?cuil=${cuilDigits}`)

      if (response.ok) {
        const data = await response.json()
        console.log("Patient search response:", data)

        if (data.results && data.results.length > 0) {
          onPatientFound(data.results[0])
          toast.success("Paciente encontrado")
        } else {
          onPatientNotFound(normalizeCuil(searchCuil))
          toast.info("Paciente no encontrado. Puede crear uno nuevo.")
        }
      } else {
        const errorData = await response.json()
        console.error("Patient search error:", errorData)
        toast.error("Error al buscar paciente", {
          description: formatApiError(errorData, "Ha ocurrido un error al buscar el paciente."),
        })
      }
    } catch (error) {
      console.error("Error searching patient:", error)
      toast.error("Error al buscar paciente", {
        description: getErrorMessage(error, "Error de conexión con el servidor"),
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleCuilChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const hasLetters = /[a-zA-Z]/.test(raw)
    if (hasLetters) {
      setShowLetterWarning(true)
      setTimeout(() => setShowLetterWarning(false), 2000)
    }
    setSearchCuil(normalizeCuil(raw))
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Ingrese CUIL del paciente..."
            value={formatCuilForDisplay(searchCuil)}
            onChange={handleCuilChange}
            onKeyPress={handleKeyPress}
            className="pl-10 font-mono text-lg border-gray-300 focus:border-[#204983] focus:ring-[#204983]"
            maxLength={13}
            autoComplete="off"
          />
          {showLetterWarning && (
            <p className="absolute left-0 -bottom-6 text-xs text-amber-600 font-medium flex items-center gap-1">
              Solo se permiten numeros
            </p>
          )}
        </div>
        <Button
          onClick={handleSearch}
          disabled={isSearching || !searchCuil.trim()}
          className="bg-[#204983] hover:bg-[#1a3d6f] px-6"
        >
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <>
              <User className="h-4 w-4 mr-2" />
              Buscar
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onReset} className="px-4 bg-transparent">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {onCreateAnonymous && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-800">
            ¿El paciente no tiene CUIL o no puede dar sus datos? Creá un protocolo anónimo (ej: internado).
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCreateAnonymous}
            className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
          >
            <UserCog className="h-4 w-4 mr-2" />
            Paciente anónimo
          </Button>
        </div>
      )}
    </div>
  )
}
