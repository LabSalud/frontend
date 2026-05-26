"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import type { FormErrors, ApiResponse } from "@/types"
import { formatApiError } from "@/lib/api-error"

interface ErrorState {
  hasError: boolean
  message: string
  details?: FormErrors
}

export function useErrorHandler() {
  const [error, setError] = useState<ErrorState>({
    hasError: false,
    message: "",
    details: undefined,
  })

  const handleApiError = useCallback((response: Response, errorData?: ApiResponse) => {
    const status = response.status
    let message = formatApiError(errorData, "Ha ocurrido un error inesperado")
    let details: FormErrors | undefined

    // Manejo específico por código de estado
    switch (status) {
      case 400:
        message = formatApiError(errorData, "Datos inválidos")
        details = errorData?.errors || {}
        break
      case 401:
        message = formatApiError(errorData, "No autorizado. Por favor, inicia sesión nuevamente")
        // Redirigir al login si es necesario
        break
      case 403:
        message = formatApiError(errorData, "No tienes permisos para realizar esta acción")
        break
      case 404:
        message = formatApiError(errorData, "Recurso no encontrado")
        break
      case 409:
        message = formatApiError(errorData, "Conflicto: El recurso ya existe")
        break
      case 422:
        message = formatApiError(errorData, "Datos de entrada inválidos")
        details = errorData?.errors || {}
        break
      case 500:
        message = formatApiError(errorData, "Error interno del servidor")
        break
      default:
        message = formatApiError(errorData, message)
    }

    setError({
      hasError: true,
      message,
      details,
    })

    // Mostrar toast de error
    toast.error("Error", {
      description: message,
      duration: 5000,
    })

    return { message, details }
  }, [])

  const handleNetworkError = useCallback((error: Error) => {
    const message = "Error de conexión. Verifica tu conexión a internet"

    setError({
      hasError: true,
      message,
      details: undefined,
    })

    toast.error("Error de Conexión", {
      description: message,
      duration: 5000,
    })

    console.error("Network Error:", error)
    return { message }
  }, [])

  const handleValidationError = useCallback((errors: FormErrors) => {
    const message = "Por favor, corrige los errores en el formulario"

    setError({
      hasError: true,
      message,
      details: errors,
    })

    toast.error("Formulario Inválido", {
      description: message,
      duration: 3000,
    })

    return { message, details: errors }
  }, [])

  const clearError = useCallback(() => {
    setError({
      hasError: false,
      message: "",
      details: undefined,
    })
  }, [])

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: {
      successMessage?: string
      errorMessage?: string
      showSuccessToast?: boolean
    }
  ): Promise<{ success: boolean;
  data?: T;
  error?: string
}
> =>
{
  try {
    clearError()
    const data = await operation()

    if (options?.showSuccessToast && options?.successMessage) {
      toast.success("Éxito", {
        description: options.successMessage,
        duration: 3000,
      })
    }

    return { success: true, data }
  } catch (error: any) {
    if (error instanceof Error) {
      handleNetworkError(error)
      return { success: false, error: error.message }
    }

    const message = options?.errorMessage || "Ha ocurrido un error inesperado"
    setError({
      hasError: true,
      message,
      details: undefined,
    })

    toast.error("Error", {
      description: message,
      duration: 5000,
    })

    return { success: false, error: message }
  }
}
, [clearError, handleNetworkError])

return {
    error,
    handleApiError,
    handleNetworkError,
    handleValidationError,
    handleAsyncOperation,
    clearError
  }
}
