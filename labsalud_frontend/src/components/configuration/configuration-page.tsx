"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { MedicosManagement } from "./medicos-management"
import { ObrasSocialesManagement } from "./obras-sociales-management"
import { AnalysisManagement } from "./analysis-management"
import { AuditManagement } from "./audit-management"
import { NbuManagement } from "./nbu-management"

export default function ConfigurationPage() {
  const [isLoading, setIsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("config-active-tab")
    if (savedTab && ["medicos", "obras-sociales", "nomencladores", "analisis", "auditoria"].includes(savedTab)) {
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

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6">
      <div className="min-w-0 max-w-full overflow-hidden rounded-lg bg-white/95 p-4 shadow-md backdrop-blur-sm sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Configuración del Sistema</h1>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full min-w-0">
          <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="medicos" className="flex-shrink-0">Médicos</TabsTrigger>
            <TabsTrigger value="obras-sociales" className="flex-shrink-0">Obras Sociales</TabsTrigger>
            <TabsTrigger value="nomencladores" className="flex-shrink-0">Nomencladores</TabsTrigger>
            <TabsTrigger value="analisis" className="flex-shrink-0">Análisis</TabsTrigger>
            <TabsTrigger value="auditoria" className="flex-shrink-0">Auditoría</TabsTrigger>
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

          <TabsContent value="auditoria" className="min-w-0">
            <AuditManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
