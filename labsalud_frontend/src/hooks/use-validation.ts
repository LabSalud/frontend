"use client"

import { useState, useCallback } from "react"
import type { ValidationResultType, ValidationState } from "@/types"

// ============================================================================
// FUNCIONES DE VALIDACIÓN PURAS
// ============================================================================

export const validators = {
  // Validación de DNI
  dni: (value: string): ValidationResultType => {
    const digits = value.replace(/\D/g, "")
    if (!digits.trim()) {
      return { isValid: false, message: "El DNI es obligatorio" }
    }
    if (digits.length < 7 || digits.length > 8) {
      return { isValid: false, message: "El DNI debe tener 7 u 8 dígitos" }
    }
    return { isValid: true, message: "DNI válido" }
  },

  // Validación de nombres
  name: (value: string, fieldName = "El campo"): ValidationResultType => {
    if (!value.trim()) {
      return { isValid: false, message: `${fieldName} es obligatorio` }
    }
    if (value.trim().length < 2) {
      return { isValid: false, message: "Mínimo 2 caracteres" }
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value.trim())) {
      return { isValid: false, message: "Solo letras y espacios" }
    }
    return { isValid: true, message: `${fieldName} válido` }
  },

  // Validación de email
  email: (value: string, required = false): ValidationResultType => {
    if (!value.trim()) {
      return required ? { isValid: false, message: "El email es obligatorio" } : { isValid: true, message: "" }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return { isValid: false, message: "Formato de email inválido (ejemplo: usuario@dominio.com)" }
    }
    return { isValid: true, message: "Email válido" }
  },

  // Validación de teléfono
  phone: (value: string, fieldName = "El teléfono"): ValidationResultType => {
    if (!value.trim()) {
      return { isValid: true, message: "" } // Teléfonos opcionales
    }
    if (!/^[\d\s\-+()]+$/.test(value)) {
      return { isValid: false, message: `${fieldName} solo puede contener números, espacios, guiones y paréntesis` }
    }
    if (value.replace(/\D/g, "").length < 8) {
      return { isValid: false, message: `${fieldName} debe tener al menos 8 dígitos` }
    }
    return { isValid: true, message: `${fieldName} válido` }
  },

  // Validación de fecha de nacimiento
  birthDate: (value: string): ValidationResultType => {
    if (!value) {
      return { isValid: false, message: "La fecha de nacimiento es obligatoria" }
    }
    const birthDate = new Date(value)
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
  },

  // Validación de matrícula profesional
  license: (value: string): ValidationResultType => {
    if (!value.trim()) {
      return { isValid: false, message: "La matrícula es obligatoria" }
    }
    if (value.trim().length < 3) {
      return { isValid: false, message: "La matrícula debe tener al menos 3 caracteres" }
    }
    return { isValid: true, message: "Matrícula válida" }
  },

  // Validación de código
  code: (value: string): ValidationResultType => {
    if (!value.trim()) {
      return { isValid: false, message: "El código es obligatorio" }
    }
    if (value.trim().length < 2) {
      return { isValid: false, message: "El código debe tener al menos 2 caracteres" }
    }
    return { isValid: true, message: "Código válido" }
  },

  // Validación de contraseña
  password: (value: string, minLength = 8): ValidationResultType => {
    if (!value) {
      return { isValid: false, message: "La contraseña es obligatoria" }
    }
    if (value.length < minLength) {
      return { isValid: false, message: `La contraseña debe tener al menos ${minLength} caracteres` }
    }
    return { isValid: true, message: "Contraseña válida" }
  },
}

// ============================================================================
// HOOK DE VALIDACIÓN
// ============================================================================

export function useValidation<T extends Record<string, unknown>>(initialState: ValidationState<T>) {
  const [validation, setValidation] = useState<ValidationState<T>>(initialState)
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>)

  const validateField = useCallback(
    (fieldName: keyof T, value: unknown, validator: (value: unknown) => ValidationResultType) => {
      const result = validator(value)
      setValidation((prev) => ({
        ...prev,
        [fieldName]: result,
      }))
      return result
    },
    [],
  )

  const setFieldTouched = useCallback((fieldName: keyof T, isTouched = true) => {
    setTouched((prev) => ({
      ...prev,
      [fieldName]: isTouched,
    }))
  }, [])

  const isFormValid = useCallback(() => {
    return Object.values(validation).every((field) => field.isValid)
  }, [validation])

  const getFieldError = useCallback(
    (fieldName: keyof T) => {
      const field = validation[fieldName] as ValidationResultType
      const isTouched = touched[fieldName]
      return isTouched && !field.isValid ? field.message : null
    },
    [validation, touched],
  )

  const getFieldSuccess = useCallback(
    (fieldName: keyof T) => {
      const field = validation[fieldName] as ValidationResultType
      const isTouched = touched[fieldName]
      return isTouched && field.isValid && field.message ? field.message : null
    },
    [validation, touched],
  )

  const resetValidation = useCallback(() => {
    setValidation(initialState)
    setTouched({} as Record<keyof T, boolean>)
  }, [initialState])

  const validateAllFields = useCallback(
    (data: T, validatorMap: Record<keyof T, (value: unknown) => ValidationResultType>) => {
      const newValidation = { ...validation }
      const newTouched = {} as Record<keyof T, boolean>

      Object.keys(validatorMap).forEach((key) => {
        const fieldName = key as keyof T
        const validator = validatorMap[fieldName]
        const value = data[fieldName]

        newValidation[fieldName] = validator(value)
        newTouched[fieldName] = true
      })

      setValidation(newValidation)
      setTouched(newTouched)

      return Object.values(newValidation).every((field) => field.isValid)
    },
    [validation],
  )

  return {
    validation,
    touched,
    validateField,
    setFieldTouched,
    isFormValid,
    getFieldError,
    getFieldSuccess,
    resetValidation,
    validateAllFields,
  }
}

// ============================================================================
// HOOKS ESPECÍFICOS PARA FORMULARIOS
// ============================================================================

export function usePatientValidation() {
  type PatientValidationFields = {
    dni: string
    first_name: string
    last_name: string
    email: string
    phone_mobile: string
    phone_landline: string
    birth_date: string
  }

  const initialState: ValidationState<PatientValidationFields> = {
    dni: { isValid: false, message: "" },
    first_name: { isValid: false, message: "" },
    last_name: { isValid: false, message: "" },
    email: { isValid: true, message: "" },
    phone_mobile: { isValid: true, message: "" },
    phone_landline: { isValid: true, message: "" },
    birth_date: { isValid: false, message: "" },
  }

  return useValidation(initialState)
}

export function useMedicoValidation() {
  type MedicoValidationFields = {
    first_name: string
    last_name: string
    license: string
  }

  const initialState: ValidationState<MedicoValidationFields> = {
    first_name: { isValid: false, message: "" },
    last_name: { isValid: false, message: "" },
    license: { isValid: false, message: "" },
  }

  return useValidation(initialState)
}
