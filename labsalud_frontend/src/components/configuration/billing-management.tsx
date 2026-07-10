"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useApi } from "@/hooks/use-api"
import { BILLING_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import { ReminderSettingsPanel } from "@/components/facturacion/components/reminder-settings-panel"
import type { BillingEntity, ReminderPhone } from "@/components/facturacion/types"

interface PaginatedResponse<T> {
  results: T[]
}

/**
 * Configuración de facturación: entidades (Centro/Clínica/futuras) y
 * recordatorio de cierre por WhatsApp. La asignación de cada OOSS a una
 * entidad se hace desde Obras Sociales (campo "Entidad de facturación").
 */
export function BillingManagement() {
  const { apiRequest } = useApi()

  const [entities, setEntities] = useState<BillingEntity[]>([])
  const [loadingEntities, setLoadingEntities] = useState(true)
  const [savingEntityId, setSavingEntityId] = useState<number | null>(null)
  const [newName, setNewName] = useState("")
  const [newBreakdown, setNewBreakdown] = useState(false)
  const [creating, setCreating] = useState(false)

  const [phones, setPhones] = useState<ReminderPhone[]>([])
  const [daysBefore, setDaysBefore] = useState(7)
  const [loadingReminders, setLoadingReminders] = useState(true)

  const fetchEntities = useCallback(async () => {
    setLoadingEntities(true)
    try {
      const res = await apiRequest(BILLING_ENDPOINTS.ENTITIES)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(formatApiError(err, "No se pudieron cargar las entidades."))
      }
      const data = await res.json()
      const list: BillingEntity[] = Array.isArray(data) ? data : (data as PaginatedResponse<BillingEntity>).results || []
      setEntities(list)
    } catch (err) {
      toast.error("Error", { description: getErrorMessage(err), duration: TOAST_DURATION })
    } finally {
      setLoadingEntities(false)
    }
  }, [apiRequest])

  const fetchReminders = useCallback(async () => {
    setLoadingReminders(true)
    try {
      const [phonesRes, configRes] = await Promise.all([
        apiRequest(BILLING_ENDPOINTS.REMINDER_PHONES),
        apiRequest(BILLING_ENDPOINTS.REMINDER_CONFIG),
      ])
      if (phonesRes.ok) {
        const data = await phonesRes.json()
        const list: ReminderPhone[] = Array.isArray(data) ? data : (data as PaginatedResponse<ReminderPhone>).results || []
        setPhones(list)
      }
      if (configRes.ok) {
        const data = await configRes.json()
        setDaysBefore(data.days_before ?? 7)
      }
    } catch (err) {
      toast.error("Error", { description: getErrorMessage(err), duration: TOAST_DURATION })
    } finally {
      setLoadingReminders(false)
    }
  }, [apiRequest])

  useEffect(() => {
    void fetchEntities()
    void fetchReminders()
  }, [fetchEntities, fetchReminders])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      toast.error("Ingresá un nombre para la entidad", { duration: TOAST_DURATION })
      return
    }
    setCreating(true)
    try {
      const res = await apiRequest(BILLING_ENDPOINTS.ENTITIES, {
        method: "POST",
        body: { name: newName.trim(), reports_breakdown_by_ooss: newBreakdown },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(formatApiError(err, "No se pudo crear la entidad."))
      }
      toast.success("Entidad creada", { duration: TOAST_DURATION })
      setNewName("")
      setNewBreakdown(false)
      await fetchEntities()
    } catch (err) {
      toast.error("Error al crear", { description: getErrorMessage(err), duration: TOAST_DURATION })
    } finally {
      setCreating(false)
    }
  }

  const patchEntity = async (id: number, body: Partial<Pick<BillingEntity, "reports_breakdown_by_ooss" | "is_active">>) => {
    setSavingEntityId(id)
    try {
      const res = await apiRequest(BILLING_ENDPOINTS.ENTITY_DETAIL(id), { method: "PATCH", body })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(formatApiError(err, "No se pudo actualizar la entidad."))
      }
      setEntities((prev) => prev.map((e) => (e.id === id ? { ...e, ...body } : e)))
    } catch (err) {
      toast.error("Error", { description: getErrorMessage(err), duration: TOAST_DURATION })
    } finally {
      setSavingEntityId(null)
    }
  }

  const addReminderPhone = async (label: string, phone: string) => {
    const res = await apiRequest(BILLING_ENDPOINTS.REMINDER_PHONES, { method: "POST", body: { label, phone, is_active: true } })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(formatApiError(err, "No se pudo agregar el número"))
    }
    toast.success("Número agregado", { duration: TOAST_DURATION })
    await fetchReminders()
  }

  const togglePhone = async (id: number, active: boolean) => {
    const res = await apiRequest(BILLING_ENDPOINTS.REMINDER_PHONE_DETAIL(id), { method: "PATCH", body: { is_active: active } })
    if (!res.ok) return
    setPhones((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: active } : p)))
  }

  const removePhone = async (id: number) => {
    const res = await apiRequest(BILLING_ENDPOINTS.REMINDER_PHONE_DETAIL(id), { method: "DELETE" })
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}))
      toast.error(formatApiError(err, "No se pudo eliminar el número"), { duration: TOAST_DURATION })
      return
    }
    toast.success("Número eliminado", { duration: TOAST_DURATION })
    setPhones((prev) => prev.filter((p) => p.id !== id))
  }

  const changeDaysBefore = async (days: number) => {
    const res = await apiRequest(BILLING_ENDPOINTS.REMINDER_CONFIG, { method: "PATCH", body: { days_before: days } })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(formatApiError(err, "No se pudo guardar la configuración"))
    }
    toast.success(`Ahora se avisa ${days} días antes del cierre`, { duration: TOAST_DURATION })
    setDaysBefore(days)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Entidades de facturación</h2>
          <p className="mt-1 text-sm text-gray-500">
            Cada obra social se presenta a una de estas entidades (asignalo desde Obras Sociales). Sin eliminar: se
            desactivan cuando ya no se usan.
          </p>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="entity-name">Nombre</Label>
            <Input
              id="entity-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Centro de Bioquímicos"
              className="bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="entity-breakdown" checked={newBreakdown} onCheckedChange={setNewBreakdown} />
            <Label htmlFor="entity-breakdown" className="cursor-pointer text-sm">
              Desglosa cobro por OOSS
            </Label>
          </div>
          <Button type="submit" disabled={creating} className="shrink-0 bg-[#204983] hover:bg-[#1a3d6f]">
            {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
            Crear entidad
          </Button>
        </form>

        {loadingEntities ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : entities.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
            No hay entidades de facturación todavía.
          </p>
        ) : (
          <div className="space-y-2">
            {entities.map((e) => (
              <div
                key={e.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800">{e.name}</p>
                  <p className="text-xs text-gray-500">
                    {e.reports_breakdown_by_ooss ? "Informa el cobro discriminado por OOSS" : "Deposita un monto único"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={e.reports_breakdown_by_ooss}
                      disabled={savingEntityId === e.id}
                      onCheckedChange={(v) => patchEntity(e.id, { reports_breakdown_by_ooss: v })}
                    />
                    <span className="text-xs text-gray-600">Desglosa por OOSS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={e.is_active}
                      disabled={savingEntityId === e.id}
                      onCheckedChange={(v) => patchEntity(e.id, { is_active: v })}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                    <span className="text-xs text-gray-600">Activa</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-6">
        {loadingReminders ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : (
          <ReminderSettingsPanel
            phones={phones}
            daysBefore={daysBefore}
            onAddPhone={addReminderPhone}
            onTogglePhone={togglePhone}
            onRemovePhone={removePhone}
            onChangeDaysBefore={changeDaysBefore}
          />
        )}
      </div>
    </div>
  )
}
