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
import { PATIENT_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

interface DeletePatientDialogProps {
  isOpen: boolean
  onClose: () => void
  patient: Patient | null
  /** Callback que se invoca después de eliminar correctamente (la página re-fetchea). */
  setPatients: (patient: Patient) => void
  apiRequest: (url: string, options?: any) => Promise<Response>
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

    try {
      const loadingId = toast.loading("Eliminando paciente...")

      const response = await apiRequest(PATIENT_ENDPOINTS.PATIENT_DETAIL(patient.id), {
        method: "DELETE",
      })

      toast.dismiss(loadingId)

      if (response.ok) {
        setPatients(patient)
        toast.success("Paciente eliminado", {
          description: "El paciente ha sido eliminado exitosamente.",
          duration: TOAST_DURATION,
        })
        onClose()
      } else {
        const errorData = await response.json()
        toast.error("Error al eliminar paciente", {
          description: formatApiError(errorData, "Ha ocurrido un error al eliminar el paciente."),
          duration: TOAST_DURATION,
        })
      }
    } catch (error) {
      console.error("Error al eliminar paciente:", error)
      toast.error("Error", {
        description: getErrorMessage(error, "Ha ocurrido un error al eliminar el paciente."),
        duration: TOAST_DURATION,
      })
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
