"use client"

import { Loader2, TestTube, Edit, X, AlertTriangle, FileText, Landmark } from "lucide-react"
import { Button } from "../../ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../ui/alert-dialog"

interface ProtocolActionsProps {
  protocolId: number
  canBeCancelled: boolean
  isEditable?: boolean
  showReports?: boolean
  isCancelling: boolean
  isArcaBilling?: boolean
  onViewAnalysis: () => void
  onEdit: () => void
  onReports: () => void
  onCancel: () => void
  onArcaBilling: () => void
}

export function ProtocolActions({
  protocolId,
  canBeCancelled,
  isEditable = true,
  showReports = true,
  isCancelling,
  isArcaBilling = false,
  onViewAnalysis,
  onEdit,
  onReports,
  onCancel,
  onArcaBilling,
}: ProtocolActionsProps) {
  return (
    <div className="pt-4 border-t border-gray-100" data-no-expand>
      {/* // Improved responsive button layout */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-[#204983] border-[#204983] hover:bg-[#204983] hover:text-white bg-transparent"
          onClick={(e) => {
            e.stopPropagation()
            onViewAnalysis()
          }}
        >
          <TestTube className="h-4 w-4 mr-1" />
          <span className="hidden xs:inline">Ver </span>Análisis
        </Button>
        {isEditable && (
          <Button
            size="sm"
            variant="outline"
            className="bg-transparent"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
        )}
        {showReports && (
          <Button
            size="sm"
            variant="outline"
            className="text-purple-600 border-purple-600 hover:bg-purple-600 hover:text-white bg-transparent"
            onClick={(e) => {
              e.stopPropagation()
              onReports()
            }}
          >
            <FileText className="h-4 w-4 mr-1" />
            Reportes
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="text-amber-700 border-amber-500 hover:bg-amber-600 hover:text-white bg-transparent"
          onClick={(e) => {
            e.stopPropagation()
            onArcaBilling()
          }}
          disabled={isArcaBilling}
        >
          {isArcaBilling ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Landmark className="h-4 w-4 mr-1" />}
          Facturar ARCA
        </Button>
        {canBeCancelled && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white bg-transparent"
                onClick={(e) => e.stopPropagation()}
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-[95vw] max-w-md" onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Cancelar Protocolo
                </AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Estás seguro de que deseas cancelar el protocolo #{protocolId}? Esta acción no se puede deshacer y el
                  protocolo pasará al estado "Cancelado".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onCancel}
                  disabled={isCancelling}
                  className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    "Confirmar Cancelación"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
