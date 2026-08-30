"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Search, User, UserCog, X } from "lucide-react"
import { Input } from "../../ui/input"
import { Button } from "../../ui/button"
import { useApi } from "../../../hooks/use-api"
import { toast } from "sonner"
import { PATIENT_ENDPOINTS } from "../../../config/api"
import type { Patient } from "../../../types"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import { formatDniForDisplay, getDniValidationMessage, isValidDni, normalizeDni } from "@/lib/dni"

type Sex = "M" | "F"

interface PatientSearchProps {
  onPatientFound: (patient: Patient) => void
  onPatientNotFound: (dni: string, sex: Sex) => void
  onReset: () => void
  onCreateAnonymous?: () => void
}

export function PatientSearch({ onPatientFound, onPatientNotFound, onReset, onCreateAnonymous }: PatientSearchProps) {
  const { apiRequest } = useApi()
  const [searchDni, setSearchDni] = useState("")
  const [searchSex, setSearchSex] = useState<Sex | "">("")
  const [isSearching, setIsSearching] = useState(false)
  const [showLetterWarning, setShowLetterWarning] = useState(false)
  // Verde cuando el DNI actual corresponde a un paciente encontrado.
  const [found, setFound] = useState(false)

  const dniInputRef = useRef<HTMLInputElement>(null)
  const maleBtnRef = useRef<HTMLButtonElement>(null)

  // Flujo optimizado para teclado: al entrar, el foco arranca en el sexo.
  // Tecla M/F (o ←/→) elige el sexo y salta automáticamente al DNI; Enter busca.
  useEffect(() => {
    maleBtnRef.current?.focus()
  }, [])

  const selectSex = (sex: Sex, advance = true) => {
    setSearchSex(sex)
    if (advance) {
      // Saltar al DNI para que el usuario siga escribiendo sin tocar el mouse.
      requestAnimationFrame(() => dniInputRef.current?.focus())
    }
  }

  const handleSexKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key.toLowerCase()
    if (key === "m") {
      e.preventDefault()
      selectSex("M")
    } else if (key === "f") {
      e.preventDefault()
      selectSex("F")
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      selectSex(searchSex === "M" ? "F" : "M", false)
    } else if (e.key === "Enter" && searchSex) {
      e.preventDefault()
      dniInputRef.current?.focus()
    }
  }

  const handleSearch = async () => {
    if (!searchSex) {
      toast.error("Seleccione el sexo", { description: "Elegí M o F antes de buscar (la identidad es DNI + sexo)." })
      maleBtnRef.current?.focus()
      return
    }
    if (!searchDni.trim()) {
      toast.error("Ingrese un DNI para buscar")
      return
    }
    if (!isValidDni(searchDni)) {
      toast.error("DNI inválido", { description: getDniValidationMessage(searchDni) })
      return
    }

    try {
      setIsSearching(true)
      const dniDigits = normalizeDni(searchDni)

      const response = await apiRequest(`${PATIENT_ENDPOINTS.PATIENTS}?dni=${dniDigits}&sex=${searchSex}`)

      if (response.ok) {
        const data = await response.json()

        if (data.results && data.results.length > 0) {
          setFound(true)
          onPatientFound(data.results[0])
          toast.success("Paciente encontrado")
        } else {
          setFound(false)
          onPatientNotFound(dniDigits, searchSex)
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
    // El DNI es solo números: 'm'/'f' cambian el sexo sin mover el foco, por si
    // el usuario se equivocó al elegirlo mientras escribe el documento.
    const key = e.key.toLowerCase()
    if (key === "m") {
      e.preventDefault()
      selectSex("M", false)
      return
    }
    if (key === "f") {
      e.preventDefault()
      selectSex("F", false)
      return
    }
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
    setFound(false)
    setSearchDni(normalizeDni(raw))
  }

  const sexButtonClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#204983] ${
      active
        ? "border-[#204983] bg-[#204983] text-white"
        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
    }`

  return (
    <div className="space-y-3">
      {/* Sexo: selección rápida (teclas M / F) */}
      <div role="radiogroup" aria-label="Sexo" className="flex gap-2" onKeyDown={handleSexKeyDown}>
        <button
          ref={maleBtnRef}
          type="button"
          role="radio"
          aria-checked={searchSex === "M"}
          tabIndex={searchSex === "F" ? -1 : 0}
          onClick={() => selectSex("M")}
          className={sexButtonClass(searchSex === "M")}
        >
          Masculino
          <kbd className={`rounded px-1.5 text-xs ${searchSex === "M" ? "bg-white/20" : "bg-gray-100"}`}>M</kbd>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={searchSex === "F"}
          tabIndex={searchSex === "F" ? 0 : -1}
          onClick={() => selectSex("F")}
          className={sexButtonClass(searchSex === "F")}
        >
          Femenino
          <kbd className={`rounded px-1.5 text-xs ${searchSex === "F" ? "bg-white/20" : "bg-gray-100"}`}>F</kbd>
        </button>
      </div>

      {/* DNI + buscar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            ref={dniInputRef}
            placeholder="DNI del paciente..."
            value={formatDniForDisplay(searchDni)}
            onChange={handleDniChange}
            onKeyDown={handleKeyPress}
            className={`pl-10 font-mono text-lg ${
              found
                ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                : "border-gray-300 focus:border-[#204983] focus:ring-[#204983]"
            }`}
            maxLength={10}
            inputMode="numeric"
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
          disabled={isSearching || !searchDni.trim() || !searchSex}
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
            ¿El paciente no tiene DNI o no puede dar sus datos? Creá un protocolo anónimo (ej: internado).
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
