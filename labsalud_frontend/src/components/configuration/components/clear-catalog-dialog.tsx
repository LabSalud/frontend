"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CATALOG_ENDPOINTS } from "@/config/api"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

interface ClearCatalogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface ClearCatalogResponse {
  analyses_deleted: number
  determinations_deleted: number
  bio_unit_values_deleted: number
  reference_values_deleted: number
}

export function ClearCatalogDialog({ open, onOpenChange, onSuccess }: ClearCatalogDialogProps) {
  const { apiRequest } = useApi()
  const toastActions = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleClearCatalog = async () => {
    setIsLoading(true)

    try {
      const response = await apiRequest(CATALOG_ENDPOINTS.CLEAR_CATALOG, {
        method: "DELETE",
      })

      if (response.ok) {
        const data: ClearCatalogResponse = await response.json()
        toastActions.success("Catálogo eliminado", {
          description: `${data.analyses_deleted} análisis, ${data.determinations_deleted} determinaciones, ${data.bio_unit_values_deleted} UB históricas y ${data.reference_values_deleted} referencias eliminadas.`,
        })
        onSuccess()
        onOpenChange(false)
        return
      }

      const errorData = await response.json().catch(() => ({}))
      const protectedObjects =
        typeof errorData.protected_objects === "number" ? ` (${errorData.protected_objects} objetos protegidos)` : ""
      const errorMessage = formatApiError(errorData, "No se pudo eliminar el catálogo.")
      toastActions.error(response.status === 409 ? "Catálogo protegido" : "Error", {
        description: `${errorMessage}${protectedObjects}`,
      })
    } catch (error) {
      const errorMessage = getErrorMessage(error, "Error de conexión al eliminar el catálogo.")
      toastActions.error("Error", { description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !isLoading && onOpenChange(nextOpen)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle>Eliminar catálogo completo</AlertDialogTitle>
              <p className="text-xs font-medium uppercase tracking-wide text-red-600">Herramienta de desarrollo</p>
            </div>
          </div>
          <AlertDialogDescription className="pt-2">
            Esta acción elimina análisis, determinaciones, UB históricas y valores de referencia. El backend rechazará
            la operación si existen protocolos o resultados vinculados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={handleClearCatalog} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Eliminar catálogo
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
