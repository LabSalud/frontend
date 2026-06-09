"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, ImageUp, Loader2, PenTool, Star, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <PenTool className="h-5 w-5 text-[#204983]" />
          <h2 className="text-lg font-semibold text-gray-800">Firmas digitales</h2>
        </div>
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
        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : signatures.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
            No hay firmas cargadas todavía.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {signatures.map((sig) => (
              <div key={sig.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-gray-800">{sig.name}</p>
                      {sig.is_default && (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Predeterminada
                        </Badge>
                      )}
                    </div>
                    {(sig.biochemist_name || sig.biochemist_mp) && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {sig.biochemist_name}
                        {sig.biochemist_name && sig.biochemist_mp ? " · " : ""}
                        {sig.biochemist_mp ? `M.P. ${sig.biochemist_mp}` : ""}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex h-16 items-center justify-center rounded border border-gray-100 bg-gray-50">
                  {sig.image_url ? (
                    <img src={sig.image_url} alt={sig.name} className="max-h-14 object-contain" />
                  ) : (
                    <span className="text-xs text-gray-400">Sin imagen</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  {!sig.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(sig.id)}
                      disabled={actionId === sig.id}
                    >
                      {actionId === sig.id ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Star className="mr-1 h-3.5 w-3.5" />
                      )}
                      Predeterminar
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDelete(sig.id)}
                    disabled={actionId === sig.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
