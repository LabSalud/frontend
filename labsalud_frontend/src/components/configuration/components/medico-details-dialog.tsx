"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MEDICAL_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import { useApi } from "@/hooks/use-api"
import { toast } from "sonner"
import { History } from "lucide-react"
import { MedicoHistoryDialog } from "./medico-history-dialog"
import type { Medico } from "@/types"

interface MedicoDetailsDialogProps {
  isOpen: boolean
  medico: Medico
  onClose: () => void
}

export function MedicoDetailsDialog({ isOpen, medico, onClose }: MedicoDetailsDialogProps) {
  const [fullMedico, setFullMedico] = useState<Medico | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const { apiRequest } = useApi()

  useEffect(() => {
    if (isOpen && medico.id) {
      fetchMedicoDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, medico.id])

  const fetchMedicoDetails = async () => {
    setIsLoading(true)
    try {
      const response = await apiRequest(MEDICAL_ENDPOINTS.DOCTOR_DETAIL(medico.id))

      if (!response.ok) {
        throw new Error("Error al cargar detalles del médico")
      }

      const data: Medico = await response.json()
      setFullMedico(data)
    } catch (error) {
      toast.error("Error al cargar los detalles del médico", { duration: TOAST_DURATION })
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const medicoData = fullMedico || medico
  const totalChanges = fullMedico?.total_changes

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-x-hidden overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Médico</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#204983]"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <p className="text-sm text-gray-900 bg-white p-2 rounded border">{medicoData.first_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                    <p className="text-sm text-gray-900 bg-white p-2 rounded border">{medicoData.last_name}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula</label>
                    <p className="text-sm text-gray-900 bg-white p-2 rounded border">{medicoData.license}</p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setHistoryOpen(true)}
              >
                <History className="h-4 w-4 mr-2 text-[#204983]" />
                Ver Historial de Cambios
                {totalChanges ? (
                  <span className="ml-2 text-xs text-muted-foreground">({totalChanges})</span>
                ) : null}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MedicoHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        medicoId={medico.id}
        medicoName={`${medicoData.first_name} ${medicoData.last_name}`}
      />
    </>
  )
}
