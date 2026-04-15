"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { MedicosManagement } from "./medicos-management"
import { ObrasSocialesManagement } from "./obras-sociales-management"
import { AnalysisManagement } from "./analysis-management"
import { AuditManagement } from "./audit-management"

export default function ConfigurationPage() {
  const [isLoading, setIsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("config-active-tab")
    if (savedTab && ["medicos", "obras-sociales", "analisis", "auditoria"].includes(savedTab)) {
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
    <div className="max-w-6xl mx-auto py-6">
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Configuración del Sistema</h1>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="medicos">Médicos</TabsTrigger>
            <TabsTrigger value="obras-sociales">Obras Sociales</TabsTrigger>
            <TabsTrigger value="analisis">Análisis</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoría</TabsTrigger>
          </TabsList>

          <TabsContent value="medicos">
            <MedicosManagement />
          </TabsContent>

          <TabsContent value="obras-sociales">
            <ObrasSocialesManagement />
          </TabsContent>

          <TabsContent value="analisis">
            <AnalysisManagement />
          </TabsContent>

          <TabsContent value="auditoria">
            <AuditManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
