"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, ImageUp, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/common/data-table"
import { SignatureDetailDialog } from "./components/signature-detail-dialog"
import { toast } from "sonner"
import { useApi } from "@/hooks/use-api"
import { REPORTING_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import type { Signature } from "@/types"

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

export function SignaturesManagement() {
  const { apiRequest } = useApi()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [signatures, setSignatures] = useState<Signature[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)
  const [sheetSignature, setSheetSignature] = useState<Signature | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const [name, setName] = useState("")
  const [biochemistName, setBiochemistName] = useState("")
  const [biochemistMp, setBiochemistMp] = useState("")
  const [makeDefault, setMakeDefault] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fetchSignatures = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiRequest(REPORTING_ENDPOINTS.SIGNATURES)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(formatApiError(errorData, "No se pudieron cargar las firmas."))
      }
      const data = await response.json()
      setSignatures(data.results || data)
    } catch (err) {
      toast.error("Error", { description: getErrorMessage(err), duration: TOAST_DURATION })
    } finally {
      setLoading(false)
    }
  }, [apiRequest])

  useEffect(() => {
    void fetchSignatures()
  }, [fetchSignatures])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileChange = (selected: File | null) => {
    if (!selected) return
    if (selected.size > MAX_SIZE_BYTES) {
      toast.error("La imagen supera los 2 MB", { duration: TOAST_DURATION })
      return
    }
    if (!selected.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen (PNG/JPG)", { duration: TOAST_DURATION })
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  const resetForm = () => {
    setName("")
    setBiochemistName("")
    setBiochemistMp("")
    setMakeDefault(false)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Ingresá un nombre para la firma", { duration: TOAST_DURATION })
      return
    }
    if (!file) {
      toast.error("Seleccioná un archivo de imagen (PNG)", { duration: TOAST_DURATION })
      return
    }
    const formData = new FormData()
    formData.append("name", name.trim())
    formData.append("image", file)
    if (biochemistName.trim()) formData.append("biochemist_name", biochemistName.trim())
    if (biochemistMp.trim()) formData.append("biochemist_mp", biochemistMp.trim())
    if (makeDefault) formData.append("is_default", "true")

    try {
      setUploading(true)
      const response = await apiRequest(REPORTING_ENDPOINTS.SIGNATURES, {
        method: "POST",
        body: formData,
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(formatApiError(errorData, "No se pudo subir la firma."))
      }
      toast.success("Firma cargada correctamente", { duration: TOAST_DURATION })
      resetForm()
      await fetchSignatures()
    } catch (err) {
      toast.error("Error al subir", { description: getErrorMessage(err), duration: TOAST_DURATION })
    } finally {
      setUploading(false)
    }
  }

  const handleSetDefault = async (id: number) => {
    try {
      setActionId(id)
      const response = await apiRequest(REPORTING_ENDPOINTS.SIGNATURE_SET_DEFAULT(id), { method: "POST" })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(formatApiError(errorData, "No se pudo marcar como predeterminada."))
      }
      toast.success("Firma predeterminada actualizada", { duration: TOAST_DURATION })
      await fetchSignatures()
    } catch (err) {
      toast.error("Error", { description: getErrorMessage(err), duration: TOAST_DURATION })
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      setActionId(id)
      const response = await apiRequest(REPORTING_ENDPOINTS.SIGNATURE_DETAIL(id), { method: "DELETE" })
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(formatApiError(errorData, "No se pudo eliminar la firma."))
      }
      toast.success("Firma eliminada", { duration: TOAST_DURATION })
      await fetchSignatures()
    } catch (err) {
      toast.error("Error al eliminar", { description: getErrorMessage(err), duration: TOAST_DURATION })
    } finally {
      setActionId(null)
    }
  }

  const handleEdit = async (
    id: number,
    data: { name: string; biochemist_name: string; biochemist_mp: string },
  ) => {
    try {
      setActionId(id)
      const response = await apiRequest(REPORTING_ENDPOINTS.SIGNATURE_DETAIL(id), {
        method: "PATCH",
        body: data,
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(formatApiError(errorData, "No se pudo actualizar la firma."))
      }
      const updated = await response.json().catch(() => null)
      toast.success("Firma actualizada", { duration: TOAST_DURATION })
      await fetchSignatures()
      if (updated) setSheetSignature(updated)
    } catch (err) {
      toast.error("Error al actualizar", { description: getErrorMessage(err), duration: TOAST_DURATION })
      throw err
    } finally {
      setActionId(null)
    }
  }

  const setDefaultFromSheet = async (id: number) => {
    await handleSetDefault(id)
    setSheetOpen(false)
  }

  const deleteFromSheet = async (id: number) => {
    await handleDelete(id)
    setSheetOpen(false)
  }

  const columns: Column<Signature>[] = [
    {
      id: "signature",
      header: "Firma",
      cell: (sig) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-20 flex-shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50">
            {sig.image_url ? (
              <img src={sig.image_url} alt={sig.name} className="max-h-8 object-contain" />
            ) : (
              <span className="text-[10px] text-gray-400">Sin img</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium text-gray-900">{sig.name}</span>
              {sig.is_default && (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Predeterminada
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "biochemist",
      header: "Bioquímico",
      responsive: "hidden sm:table-cell",
      cell: (sig) =>
        sig.biochemist_name || sig.biochemist_mp ? (
          <span className="text-sm text-gray-600">
            {sig.biochemist_name}
            {sig.biochemist_name && sig.biochemist_mp ? " · " : ""}
            {sig.biochemist_mp ? `M.P. ${sig.biochemist_mp}` : ""}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Firmas digitales</h2>
        <p className="mt-1 text-sm text-gray-500">
          Subí un PNG de firma (idealmente con fondo transparente, ~300×100 px, máx 2 MB). La firma marcada como
          predeterminada es la que se usa al firmar reportes.
        </p>
      </div>

      <form onSubmit={handleUpload} className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sig-name">Nombre de la firma *</Label>
            <Input
              id="sig-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Firma Bioq. González"
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sig-bio-name">Nombre del bioquímico</Label>
            <Input
              id="sig-bio-name"
              value={biochemistName}
              onChange={(e) => setBiochemistName(e.target.value)}
              placeholder="Se imprime al pie (opcional)"
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sig-bio-mp">Matrícula (M.P.)</Label>
            <Input
              id="sig-bio-mp"
              value={biochemistMp}
              onChange={(e) => setBiochemistMp(e.target.value)}
              placeholder="Ej: 12345 (opcional)"
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sig-image">Imagen de firma (PNG) *</Label>
            <input
              ref={fileInputRef}
              id="sig-image"
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full justify-start bg-white"
            >
              <ImageUp className="mr-2 h-4 w-4" />
              {file ? file.name : "Seleccionar archivo PNG"}
            </Button>
          </div>
        </div>

        {previewUrl && (
          <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white p-3">
            <span className="text-xs text-gray-500">Vista previa:</span>
            <img src={previewUrl} alt="Vista previa de la firma" className="max-h-16 object-contain" />
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Switch id="sig-default" checked={makeDefault} onCheckedChange={setMakeDefault} />
            <Label htmlFor="sig-default" className="cursor-pointer text-sm">
              Marcar como predeterminada
            </Label>
          </div>
          <Button type="submit" disabled={uploading} className="bg-[#204983] hover:bg-[#1a3d6f]">
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Subir firma
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Firmas cargadas</h3>
        <DataTable
          columns={columns}
          rows={signatures}
          getRowId={(s) => s.id}
          onRowClick={(s) => {
            setSheetSignature(s)
            setSheetOpen(true)
          }}
          isLoading={loading}
          skeletonRows={2}
          emptyMessage="No hay firmas cargadas todavía."
        />
      </div>

      <SignatureDetailDialog
        signature={sheetSignature}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSetDefault={setDefaultFromSheet}
        onDelete={deleteFromSheet}
        onEdit={handleEdit}
        actionId={actionId}
      />
    </div>
  )
}
