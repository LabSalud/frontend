"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MedicosManagement } from "./medicos-management"
import { ObrasSocialesManagement } from "./obras-sociales-management"
import { AnalysisManagement } from "./analysis-management"
import { AuditManagement } from "./audit-management"
import { NbuManagement } from "./nbu-management"
import { SignaturesManagement } from "./signatures-management"
import { BillingManagement } from "./billing-management"

export default function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("config-active-tab")
    if (
      savedTab &&
      ["medicos", "obras-sociales", "nomencladores", "analisis", "firmas", "facturacion", "auditoria"].includes(savedTab)
    ) {
      return savedTab
    }
    return "medicos"
  })

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    localStorage.setItem("config-active-tab", value)
  }

  const tabClass =
    "flex-shrink-0 rounded-full border border-transparent bg-transparent px-4 py-1.5 text-sm font-medium text-gray-600 shadow-none transition-colors hover:bg-gray-100 data-[state=active]:border-[#204983] data-[state=active]:bg-[#204983] data-[state=active]:text-white data-[state=active]:shadow-sm"

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 py-4">
      <div className="min-w-0 max-w-full rounded-2xl bg-white/95 p-4 shadow-md backdrop-blur-sm md:p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-800 md:text-2xl">Configuración del sistema</h1>
          <p className="text-sm text-gray-500">Catálogos, nomencladores, firmas y auditoría.</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full min-w-0">
          <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-2 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger value="medicos" className={tabClass}>Médicos</TabsTrigger>
            <TabsTrigger value="obras-sociales" className={tabClass}>Obras Sociales</TabsTrigger>
            <TabsTrigger value="nomencladores" className={tabClass}>Nomencladores</TabsTrigger>
            <TabsTrigger value="analisis" className={tabClass}>Análisis</TabsTrigger>
            <TabsTrigger value="firmas" className={tabClass}>Firmas</TabsTrigger>
            <TabsTrigger value="facturacion" className={tabClass}>Facturación</TabsTrigger>
            <TabsTrigger value="auditoria" className={tabClass}>Auditoría</TabsTrigger>
          </TabsList>

          <TabsContent value="medicos" className="min-w-0">
            <MedicosManagement />
          </TabsContent>

          <TabsContent value="obras-sociales" className="min-w-0">
            <ObrasSocialesManagement />
          </TabsContent>

          <TabsContent value="nomencladores" className="min-w-0">
            <NbuManagement />
          </TabsContent>

          <TabsContent value="analisis" className="min-w-0">
            <AnalysisManagement />
          </TabsContent>

          <TabsContent value="firmas" className="min-w-0">
            <SignaturesManagement />
          </TabsContent>

          <TabsContent value="facturacion" className="min-w-0">
            <BillingManagement />
          </TabsContent>

          <TabsContent value="auditoria" className="min-w-0">
            <AuditManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
