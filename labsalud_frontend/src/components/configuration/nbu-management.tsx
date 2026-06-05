"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { BookOpen, FileUp, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { CATALOG_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { useNbuOptions } from "@/hooks/use-nbu-options"
import type { NBUImportResult, NBUUbValuesList } from "@/types"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import { NbuSelect } from "./components/nbu-select"
import { useEndpointProgress } from "@/hooks/use-endpoint-progress"

type CreateMode = "empty" | "import"

const emptyCreateForm = {
  name: "",
  year: "",
  parent_nbu: "",
}

export function NbuManagement() {
  const { apiRequest } = useApi()
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const { nbus, isLoading, refetch } = useNbuOptions()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [createMode, setCreateMode] = useState<CreateMode>("empty")
  const [createFile, setCreateFile] = useState<File | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [ubValues, setUbValues] = useState<NBUUbValuesList | null>(null)
  const [loadingValues, setLoadingValues] = useState(false)
  const [analysisCode, setAnalysisCode] = useState("")
  const [ubValue, setUbValue] = useState("")
  const [isSavingUb, setIsSavingUb] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<NBUImportResult | null>(null)
  const importProgress = useEndpointProgress()
  const createProgress = useEndpointProgress()

  const selectedNbu = useMemo(
    () => nbus.find((nbu) => nbu.id === selectedId) || nbus[0] || null,
    [nbus, selectedId],
  )
  const selectedNbuId = selectedNbu?.id

  useEffect(() => {
    if (!selectedId && nbus.length > 0) {
      setSelectedId(nbus[0].id)
    }
  }, [nbus, selectedId])

  const invalidateNbus = () => {
    queryClient.invalidateQueries({ queryKey: ["catalog", "nbu"] })
    refetch()
  }

  const fetchUbValues = useCallback(async (nbuId: number) => {
    try {
      setLoadingValues(true)
      const response = await apiRequest(CATALOG_ENDPOINTS.NBU_UB_VALUES(nbuId))
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(formatApiError(data, "No se pudieron cargar los UB del nomenclador."))
      }
      setUbValues(await response.json())
    } catch (err) {
      error("Error al cargar UB", { description: getErrorMessage(err) })
    } finally {
      setLoadingValues(false)
    }
  }, [apiRequest, error])

  useEffect(() => {
    if (selectedNbuId) {
      setImportResult(null)
      fetchUbValues(selectedNbuId)
    }
  }, [fetchUbValues, selectedNbuId])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!createForm.name.trim() || !createForm.parent_nbu) {
      error("Formulario incompleto", { description: "Nombre y nomenclador padre son obligatorios." })
      return
    }
    if (createMode === "import" && !createFile) {
      error("Falta archivo", { description: "Seleccioná un Excel o CSV para importar." })
      return
    }

    try {
      setIsCreating(true)
      if (createMode === "import") createProgress.start()
      let response: Response

      if (createMode === "import") {
        const body = new FormData()
        body.append("name", createForm.name.trim())
        body.append("parent_nbu", createForm.parent_nbu)
        if (createForm.year.trim()) body.append("year", createForm.year.trim())
        if (createFile) body.append("file", createFile)
        response = await apiRequest(CATALOG_ENDPOINTS.NBU_CREATE_WITH_IMPORT, { method: "POST", body })
      } else {
        const body: Record<string, unknown> = {
          name: createForm.name.trim(),
          parent_nbu: Number(createForm.parent_nbu),
        }
        if (createForm.year.trim()) body.year = Number(createForm.year)
        response = await apiRequest(CATALOG_ENDPOINTS.NBU, { method: "POST", body })
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(formatApiError(data, "No se pudo crear el nomenclador."))
      }

      const data = await response.json()
      success("Nomenclador creado", {
        description: createMode === "import" ? "La actualización se creó y se importaron los UB." : "La actualización quedó disponible.",
        duration: TOAST_DURATION,
      })
      setCreateForm(emptyCreateForm)
      setCreateFile(null)
      setCreateMode("empty")
      invalidateNbus()
      if (data.nbu_id || data.id) setSelectedId(data.nbu_id || data.id)
    } catch (err) {
      error("Error al crear nomenclador", { description: getErrorMessage(err) })
    } finally {
      if (createMode === "import") createProgress.finish()
      setIsCreating(false)
    }
  }

  const handleSaveUb = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedNbu || !analysisCode.trim() || !ubValue.trim()) return

    try {
      setIsSavingUb(true)
      const response = await apiRequest(CATALOG_ENDPOINTS.NBU_UPDATE_UB_VALUE(selectedNbu.id), {
        method: "POST",
        body: { analysis_code: Number(analysisCode), value: ubValue.trim() },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(formatApiError(data, "No se pudo guardar el UB."))
      }
      success("UB actualizado", { duration: TOAST_DURATION })
      setAnalysisCode("")
      setUbValue("")
      fetchUbValues(selectedNbu.id)
      invalidateNbus()
    } catch (err) {
      error("Error al guardar UB", { description: getErrorMessage(err) })
    } finally {
      setIsSavingUb(false)
    }
  }

  const handleRemoveUb = async (code: number) => {
    if (!selectedNbu) return
    try {
      const response = await apiRequest(CATALOG_ENDPOINTS.NBU_DELETE_UB_VALUE(selectedNbu.id, code), {
        method: "DELETE",
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(formatApiError(data, "No se pudo quitar el UB."))
      }
      success("UB quitado", { description: "El análisis volverá a usar el valor heredado.", duration: TOAST_DURATION })
      fetchUbValues(selectedNbu.id)
      invalidateNbus()
    } catch (err) {
      error("Error al quitar UB", { description: getErrorMessage(err) })
    }
  }

  const handleImport = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedNbu || !importFile) return

    try {
      setIsImporting(true)
      importProgress.start()
      const body = new FormData()
      body.append("file", importFile)
      const response = await apiRequest(CATALOG_ENDPOINTS.NBU_IMPORT_UB_VALUES(selectedNbu.id), {
        method: "POST",
        body,
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(formatApiError(data, "No se pudo importar el archivo."))
      }
      const result = await response.json()
      setImportResult(result)
      setImportFile(null)
      success("Importación completada", {
        description: `${result.creados} creados, ${result.actualizados} actualizados.`,
        duration: TOAST_DURATION,
      })
      fetchUbValues(selectedNbu.id)
      invalidateNbus()
    } catch (err) {
      error("Error al importar UB", { description: getErrorMessage(err) })
    } finally {
      importProgress.finish()
      setIsImporting(false)
    }
  }

  const handleDeleteNbu = async () => {
    if (!selectedNbu || selectedNbu.is_default) return
    try {
      const response = await apiRequest(CATALOG_ENDPOINTS.NBU_DETAIL(selectedNbu.id), { method: "DELETE" })
      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => ({}))
        throw new Error(formatApiError(data, "No se pudo eliminar el nomenclador."))
      }
      success("Nomenclador eliminado", { duration: TOAST_DURATION })
      setSelectedId(null)
      setUbValues(null)
      invalidateNbus()
    } catch (err) {
      error("Error al eliminar", { description: getErrorMessage(err) })
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 md:space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base md:text-lg font-medium text-gray-900">Nomencladores</h3>
          <p className="text-xs md:text-sm text-gray-500">Gestiona actualizaciones NBU y valores propios por análisis</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 space-y-4">
          <Card className="min-w-0 max-w-full overflow-hidden">
            <CardHeader className="pb-2">
              <h4 className="text-sm font-semibold text-gray-800">Listado</h4>
            </CardHeader>
            <CardContent className="min-w-0 space-y-2">
              {nbus.map((nbu) => (
                <button
                  key={nbu.id}
                  type="button"
                  onClick={() => setSelectedId(nbu.id)}
                  className={`w-full min-w-0 max-w-full overflow-hidden rounded-md border p-3 text-left transition-colors ${
                    selectedNbu?.id === nbu.id ? "border-[#204983] bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 break-words">{nbu.name}</p>
                      <p className="text-xs text-gray-500 break-words">
                        {nbu.parent_nbu_name ? `Padre: ${nbu.parent_nbu_name}` : "Sin padre"}
                        {nbu.year ? ` · ${nbu.year}` : ""}
                      </p>
                    </div>
                    {nbu.is_default && <Badge className="shrink-0 bg-emerald-100 text-emerald-800">Principal</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {nbu.own_ub_count ?? 0} UB propios
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {nbu.insurances_count ?? 0} OOSS
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {nbu.children_count ?? 0} hijos
                    </Badge>
                  </div>
                </button>
              ))}
              {nbus.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No hay nomencladores cargados.</p>}
            </CardContent>
          </Card>

          <Card className="min-w-0 max-w-full overflow-hidden">
            <CardHeader className="pb-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Plus className="h-4 w-4 text-[#204983]" />
                Nueva actualización
              </h4>
            </CardHeader>
            <CardContent className="min-w-0">
              <form onSubmit={handleCreate} className="min-w-0 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nbu_name">Nombre *</Label>
                  <Input
                    id="nbu_name"
                    value={createForm.name}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Actualización 2026"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-[minmax(0,1fr)_120px]">
                  <div className="space-y-1.5">
                    <Label htmlFor="parent_nbu">Cuelga de *</Label>
                    <NbuSelect
                      id="parent_nbu"
                      value={createForm.parent_nbu}
                      includeDefaultOption={false}
                      onValueChange={(value) => setCreateForm((prev) => ({ ...prev, parent_nbu: value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nbu-create-year">Año</Label>
                    <Input
                      id="nbu-create-year"
                      type="number"
                      value={createForm.year}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, year: event.target.value }))}
                      placeholder="2026"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={createMode === "empty" ? "default" : "outline"}
                    size="sm"
                    className={createMode === "empty" ? "bg-[#204983]" : ""}
                    onClick={() => setCreateMode("empty")}
                  >
                    Crear vacío
                  </Button>
                  <Button
                    type="button"
                    variant={createMode === "import" ? "default" : "outline"}
                    size="sm"
                    className={createMode === "import" ? "bg-[#204983]" : ""}
                    onClick={() => setCreateMode("import")}
                  >
                    Crear e importar
                  </Button>
                </div>
                {createMode === "import" && (
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(event) => setCreateFile(event.target.files?.[0] || null)}
                    className="min-w-0 max-w-full"
                  />
                )}
                <Button type="submit" className="relative w-full overflow-hidden bg-[#204983] hover:bg-[#1a3d6f]" disabled={isCreating}>
                  {createMode === "import" && (
                    <span
                      className="absolute inset-y-0 left-0 bg-[#1a3d6f] transition-[width] duration-150"
                      style={{ width: `${createProgress.progress}%` }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center">
                    {isCreating && createMode !== "import" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isCreating ? "Creando..." : "Crear actualización"}
                  </span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="min-w-0 max-w-full overflow-hidden">
          <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h4 className="flex items-start gap-2 text-sm font-semibold text-gray-800 min-w-0">
                <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#204983]" />
                <span className="min-w-0 break-words">{selectedNbu?.name || "Detalle"}</span>
              </h4>
              {selectedNbu && (
                <p className="text-xs text-gray-500 break-words">
                  {ubValues?.count ?? selectedNbu.own_ub_count ?? 0} UB propios
                  {selectedNbu.parent_nbu_name ? ` · Hereda de ${selectedNbu.parent_nbu_name}` : ""}
                </p>
              )}
            </div>
            {selectedNbu && !selectedNbu.is_default && (
              <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50" onClick={handleDeleteNbu}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            )}
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
            {selectedNbu ? (
              <>
                <form onSubmit={handleSaveUb} className="min-w-0 rounded-md border border-gray-200 bg-gray-50 p-3">
                  <div className="grid grid-cols-1 gap-2 min-w-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <Input
                      type="number"
                      value={analysisCode}
                      onChange={(event) => setAnalysisCode(event.target.value)}
                      placeholder="Código de análisis"
                    />
                    <Input value={ubValue} onChange={(event) => setUbValue(event.target.value)} placeholder="UB" />
                    <Button type="submit" className="bg-[#204983]" disabled={isSavingUb || selectedNbu.is_default}>
                      {isSavingUb ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                    </Button>
                  </div>
                  {selectedNbu.is_default && (
                    <p className="mt-2 text-xs text-amber-700 break-words">
                      El NBU principal no permite quitar UB; usá una actualización para overrides.
                    </p>
                  )}
                </form>

                <form onSubmit={handleImport} className="min-w-0 rounded-md border border-blue-100 bg-blue-50 p-3">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                      className="min-w-0 max-w-full bg-white"
                    />
                    <Button type="submit" disabled={!importFile || isImporting} className="relative overflow-hidden bg-[#204983] shrink-0">
                      <span
                        className="absolute inset-y-0 left-0 bg-[#1a3d6f] transition-[width] duration-150"
                        style={{ width: `${importProgress.progress}%` }}
                      />
                      <span className="relative z-10 flex items-center justify-center">
                        {!isImporting && <FileUp className="mr-2 h-4 w-4" />}
                        {isImporting ? "Importando..." : "Importar UB"}
                      </span>
                    </Button>
                  </div>
                  {importResult && (
                    <p className="mt-2 text-xs text-blue-900">
                      {importResult.creados} creados, {importResult.actualizados} actualizados, {importResult.errores.length} errores.
                    </p>
                  )}
                </form>

                {loadingValues ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, index) => (
                      <Skeleton key={index} className="h-10 rounded" />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Mobile: cards stacked */}
                    <div className="space-y-2 sm:hidden max-h-[420px] w-full max-w-full overflow-x-hidden overflow-y-auto rounded-md border border-gray-200 p-2">
                      {(ubValues?.values || []).length === 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-gray-500">
                          Este nomenclador no tiene UB propios cargados.
                        </p>
                      ) : (
                        (ubValues?.values || []).map((item) => (
                          <div
                            key={`${item.analysis_id}-${item.analysis_code}`}
                            className="w-full min-w-0 max-w-full overflow-hidden rounded-md border border-gray-200 bg-white p-2"
                          >
                            <div className="flex min-w-0 items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-mono text-[11px] text-gray-500">{item.analysis_code}</p>
                                <p className="text-sm text-gray-900 break-words">{item.analysis_name}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-gray-900">UB {item.value}</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-1 h-7 px-2 text-xs text-red-700 hover:bg-red-50"
                                  disabled={selectedNbu.is_default}
                                  onClick={() => handleRemoveUb(item.analysis_code)}
                                >
                                  Quitar
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Desktop: table */}
                    <div className="hidden sm:block max-h-[420px] w-full max-w-full overflow-auto rounded-md border border-gray-200">
                      <table className="w-full text-sm table-fixed">
                        <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
                          <tr>
                            <th className="w-24 px-3 py-2 text-left">Código</th>
                            <th className="px-3 py-2 text-left">Análisis</th>
                            <th className="w-20 px-3 py-2 text-right">UB</th>
                            <th className="w-20 px-3 py-2 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(ubValues?.values || []).map((item) => (
                            <tr key={`${item.analysis_id}-${item.analysis_code}`} className="border-t">
                              <td className="px-3 py-2 font-mono text-xs">{item.analysis_code}</td>
                              <td className="px-3 py-2 break-words">{item.analysis_name}</td>
                              <td className="px-3 py-2 text-right font-semibold">{item.value}</td>
                              <td className="px-3 py-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-red-700 hover:bg-red-50"
                                  disabled={selectedNbu.is_default}
                                  onClick={() => handleRemoveUb(item.analysis_code)}
                                >
                                  Quitar
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {(ubValues?.values || []).length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-500">
                                Este nomenclador no tiene UB propios cargados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="py-10 text-center text-sm text-gray-500">Seleccioná un nomenclador para ver el detalle.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
