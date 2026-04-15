"use client"

import { CheckCircle, AlertCircle } from "lucide-react"
import useAuth from "@/contexts/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { ValidationProtocolList } from "./components/validation-protocol-list"
import { PERMISSIONS } from "@/config/permissions"

export default function ValidacionPage() {
  const { hasPermission } = useAuth()
  const canValidateResults = hasPermission(Number(PERMISSIONS.VALIDATE_RESULTS.id))

  if (!canValidateResults) {
    return (
      <div className="max-w-6xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Validación de Resultados</h1>
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <p className="text-sm sm:text-base">No tienes permisos para validar resultados.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-3 sm:py-4 px-3 sm:px-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-[#204983]" />
              Validación de Resultados
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Revisa y valida los resultados de los protocolos pendientes
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-3 sm:p-4 md:p-6">
        <Tabs defaultValue="por-protocolo" className="w-full">
          <TabsList className="mb-3 sm:mb-4 bg-gray-100">
            <TabsTrigger
              value="por-protocolo"
              className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-[#204983] data-[state=active]:shadow-sm"
            >
              Protocolos Pendientes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="por-protocolo" className="mt-3 sm:mt-4">
            <ValidationProtocolList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
