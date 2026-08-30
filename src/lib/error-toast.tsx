import { toast } from "sonner"
import { TOAST_DURATION } from "@/config/api"
import { classifyApiError } from "@/lib/api-error"

/**
 * Muestra un toast con título y descripción según el tipo de error HTTP.
 * Para 403 (permisos), usa duración mayor y estilo destacado.
 */
export const showApiErrorToast = async (response: Response, contextTitle?: string): Promise<void> => {
  const info = await classifyApiError(response)
  const fallbackTitle = contextTitle || "Error al procesar la solicitud"

  switch (info.kind) {
    case "permission":
      toast.error(info.status === 403 ? "Permiso insuficiente" : "Sesión expirada", {
        description: info.detail || info.message,
        duration: 8000,
      })
      break
    case "not_found":
      toast.error("No encontrado", {
        description: info.detail || info.message,
        duration: TOAST_DURATION,
      })
      break
    case "conflict":
      toast.error("Conflicto", {
        description: info.message || info.detail,
        duration: TOAST_DURATION + 2000,
      })
      break
    case "server":
      toast.error("Error del servidor", {
        description: info.detail || info.message,
        duration: 8000,
      })
      break
    default:
      toast.error(fallbackTitle, {
        description: info.message,
        duration: TOAST_DURATION,
      })
  }
}
