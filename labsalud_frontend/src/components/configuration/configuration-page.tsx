"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Settings } from "lucide-react"
import { MedicosManagement } from "./medicos-management"
import { ObrasSocialesManagement } from "./obras-sociales-management"
import { AnalysisManagement } from "./analysis-management"
import { AuditManagement } from "./audit-management"
import { NbuManagement } from "./nbu-management"
import { SignaturesManagement } from "./signatures-management"

export default function ConfigurationPage() {
  const [isLoading, setIsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("config-active-tab")
    if (savedTab && ["medicos", "obras-sociales", "nomencladores", "analisis", "firmas", "auditoria"].includes(savedTab)) {
      return savedTab
    }
    return "medicos"
  })

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    localStorage.setItem("config-active-tab", value)
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-3 sm:px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6">
          {/* Header skeleton */}
          <Skeleton className="h-8 w-64 rounded mb-6" />

          {/* Tabs skeleton */}
          <Skeleton className="h-10 w-full max-w-md rounded mb-6" />

          {/* Content area skeleton */}
          <div className="space-y-6">
            {/* Section header */}
            <div>
              <Skeleton className="h-6 w-48 rounded mb-2" />
              <Skeleton className="h-4 w-64 rounded" />
            </div>

            {/* Search and button */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1 max-w-md rounded" />
              <Skeleton className="h-10 w-full sm:w-36 rounded" />
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <Skeleton className="h-5 w-32 rounded mb-2" />
                  <Skeleton className="h-4 w-48 rounded mb-3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16 rounded" />
                    <Skeleton className="h-8 w-16 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tabClass =
    "flex-shrink-0 rounded-lg px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:text-[#204983] data-[state=active]:shadow-sm"

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#204983]/10 text-[#204983]">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">Configuración del sistema</h1>
          <p className="text-sm text-gray-500">Catálogos, nomencladores, firmas y auditoría.</p>
        </div>
      </div>

      <div className="min-w-0 max-w-full">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full min-w-0">
          <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-gray-100 p-1">
            <TabsTrigger value="medicos" className={tabClass}>Médicos</TabsTrigger>
            <TabsTrigger value="obras-sociales" className={tabClass}>Obras Sociales</TabsTrigger>
            <TabsTrigger value="nomencladores" className={tabClass}>Nomencladores</TabsTrigger>
            <TabsTrigger value="analisis" className={tabClass}>Análisis</TabsTrigger>
            <TabsTrigger value="firmas" className={tabClass}>Firmas</TabsTrigger>
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

          <TabsContent value="auditoria" className="min-w-0">
            <AuditManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
