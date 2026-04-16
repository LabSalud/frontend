"use client"

import type React from "react"

import { useState } from "react"
import { Search, User, X } from "lucide-react"
import { Input } from "../../ui/input"
import { Button } from "../../ui/button"
import { useApi } from "../../../hooks/use-api"
import { toast } from "sonner"
import { PATIENT_ENDPOINTS } from "../../../config/api"
import type { Patient } from "../../../types"

interface PatientSearchProps {
  onPatientFound: (patient: Patient) => void
  onPatientNotFound: (dni: string) => void
  onReset: () => void
}

export function PatientSearch({ onPatientFound, onPatientNotFound, onReset }: PatientSearchProps) {
  const { apiRequest } = useApi()
  const [searchDni, setSearchDni] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [showLetterWarning, setShowLetterWarning] = useState(false)

  const handleSearch = async () => {
    if (!searchDni.trim()) {
      toast.error("Ingrese un DNI para buscar")
      return
    }

    try {
      setIsSearching(true)
      console.log("Searching patient with DNI:", searchDni)

      const response = await apiRequest(`${PATIENT_ENDPOINTS.PATIENTS}?dni=${searchDni.trim()}`)

      if (response.ok) {
        const data = await response.json()
        console.log("Patient search response:", data)

        if (data.results && data.results.length > 0) {
          onPatientFound(data.results[0])
          toast.success("Paciente encontrado")
        } else {
          onPatientNotFound(searchDni.trim())
          toast.info("Paciente no encontrado. Puede crear uno nuevo.")
        }
      } else {
        const errorData = await response.json()
        console.error("Patient search error:", errorData)
        toast.error("Error al buscar paciente")
      }
    } catch (error) {
      console.error("Error searching patient:", error)
      toast.error("Error al buscar paciente")
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const hasLetters = /[a-zA-Z]/.test(raw)
    if (hasLetters) {
      setShowLetterWarning(true)
      setTimeout(() => setShowLetterWarning(false), 2000)
    }
    setSearchDni(raw.replace(/\D/g, ""))
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Ingrese DNI del paciente..."
            value={searchDni}
            onChange={handleDniChange}
            onKeyPress={handleKeyPress}
            className="pl-10 font-mono text-lg border-gray-300 focus:border-[#204983] focus:ring-[#204983]"
            maxLength={8}
            inputMode="numeric"
            pattern="[0-9]*"
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
          disabled={isSearching || !searchDni.trim()}
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
    </div>
  )
}
