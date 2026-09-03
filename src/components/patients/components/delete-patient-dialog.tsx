"use client"

import type { Patient } from "@/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { showApiErrorToast } from "@/lib/error-toast"
import { PATIENT_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import type { ApiRequestOptions } from "@/hooks/use-api"
import { getErrorMessage } from "@/lib/api-error"

interface DeletePatientDialogProps {
  isOpen: boolean
  onClose: () => void
  patient: Patient | null
  /** Callback que se invoca después de eliminar correctamente (la página re-fetchea). */
  setPatients: (patient: Patient) => void
  apiRequest: (url: string, options?: ApiRequestOptions) => Promise<Response>
}

export default function DeletePatientDialog({
  isOpen,
  onClose,
  patient,
  setPatients,
  apiRequest,
}: DeletePatientDialogProps) {
  const handleDeletePatient = async () => {
    if (!patient) return

    // Ver el comentario del alta: el toast de carga se cierra en el `finally`
    // o queda girando para siempre cuando el pedido tira.
    const loadingId = toast.loading("Eliminando paciente...")

    try {

      const response = await apiRequest(PATIENT_ENDPOINTS.PATIENT_DETAIL(patient.id), {
        method: "DELETE",
      })


      if (response.ok) {
        setPatients(patient)
        toast.success("Paciente eliminado", {
          description: "El paciente ha sido eliminado exitosamente.",
          duration: TOAST_DURATION,
        })
        onClose()
      } else {
        // Ver el alta: el toast sale del código de estado. Acá importa el 409,
        // que es el caso real —el paciente tiene protocolos y no se puede
        // borrar— y no es lo mismo que un error del servidor.
        await showApiErrorToast(response, "No se pudo eliminar el paciente")
      }
    } catch (error) {
      console.error("Error al eliminar paciente:", error)
      toast.error("No se pudo eliminar el paciente", {
        description: getErrorMessage(error, "Ha ocurrido un error al eliminar el paciente."),
        duration: TOAST_DURATION,
      })
    } finally {
      toast.dismiss(loadingId)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar paciente?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. El paciente{" "}
            <strong>{patient ? `${patient.first_name} ${patient.last_name}` : ""}</strong> será eliminado
            permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeletePatient} className="bg-red-600 hover:bg-red-700">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { DeletePatientDialog }
