"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { CalendarRange, ExternalLink, Eye, EyeOff, FileCheck2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useApi } from "@/hooks/use-api"
import { useApiQuery } from "@/hooks/use-api-query"
import { BILLING_ENDPOINTS, TOAST_DURATION } from "@/config/api"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import { PaperStatusChips } from "./paper-status-chips"

type BoardState = "no_facturado" | "facturado" | "no_facturable"

interface BoardRow {
  protocol_id: number
  created_at: string | null
  status: string | null
  billing_state: BoardState
  is_billing_eligible: boolean
  patient: { id: number; first_name: string; last_name: string } | null
  insurance: { id: number; name: string } | null
  total_ub_authorized: string
  missing_paperwork: string[]
}

const STATE_TABS: { value: BoardState; label: string }[] = [
  { value: "no_facturado", label: "No facturados" },
  { value: "facturado", label: "Facturados" },
  { value: "no_facturable", label: "No facturables" },
]

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/**
 * Tablero de facturación: TODOS los protocolos de la entidad que todavía no
 * entraron a una presentación, para decidir cuáles facturar. Filtros por estado
 * (facturado / no facturado / no facturable) y por fecha de creación desde.
 */
export function BillingBoard({ entityId, entityName }: { entityId: number; entityName: string }) {
  const { apiRequest } = useApi()
  const [state, setState] = useState<BoardState>("no_facturado")
  const [dateFrom, setDateFrom] = useState("")
  const [busyId, setBusyId] = useState<number | null>(null)

  const url = useMemo(() => {
    const params = new URLSearchParams({ entity_id: String(entityId), state })
    if (dateFrom) params.set("date_from", dateFrom)
    return `${BILLING_ENDPOINTS.BILLING_BOARD}?${params.toString()}`
  }, [entityId, state, dateFrom])

  const boardQuery = useApiQuery<{ count: number; results: BoardRow[] }>({
    queryKey: ["billing", "board", entityId, state, dateFrom],
    url,
    staleTime: 10 * 1000,
  })

  const rows = boardQuery.data?.results ?? []
  const refresh = () => boardQuery.refetch()

  const bill = async (id: number) => {
    setBusyId(id)
    try {
      const res = await apiRequest(BILLING_ENDPOINTS.CREATE_FOR_PROTOCOL(id), { method: "POST" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(formatApiError(err, "No se pudo facturar"))
      }
      toast.success("Protocolo facturado", { duration: TOAST_DURATION })
      await refresh()
    } catch (e) {
      toast.error(getErrorMessage(e, "Error al facturar"), { duration: TOAST_DURATION })
    } finally {
      setBusyId(null)
    }
  }

  const setEligible = async (id: number, eligible: boolean) => {
    setBusyId(id)
    try {
      const res = await apiRequest(BILLING_ENDPOINTS.SET_ELIGIBLE(id), { method: "POST", body: { eligible } })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(formatApiError(err, "No se pudo actualizar"))
      }
      toast.success(eligible ? "Marcado como facturable" : "Marcado como no facturable", { duration: TOAST_DURATION })
      await refresh()
    } catch (e) {
      toast.error(getErrorMessage(e, "Error al actualizar"), { duration: TOAST_DURATION })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap gap-1.5">
          {STATE_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setState(t.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                state === t.value ? "bg-[#204983] text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Creados desde</span>
          <div className="flex items-center gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[160px]" />
            {dateFrom && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setDateFrom("")}>
                Limpiar
              </Button>
            )}
          </div>
        </div>
        <div className="ml-auto text-sm text-gray-500">{rows.length} protocolo(s)</div>
      </div>

      {boardQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          No hay protocolos {STATE_TABS.find((t) => t.value === state)?.label.toLowerCase()} para {entityName}
          {dateFrom ? " en ese rango de fechas" : ""}.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const name = r.patient ? `${r.patient.last_name}, ${r.patient.first_name}` : "—"
            const canBill = r.billing_state === "no_facturado" && r.missing_paperwork.length === 0
            const busy = busyId === r.protocol_id
            return (
              <div
                key={r.protocol_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/protocolos/${r.protocol_id}`} className="text-sm font-semibold text-[#204983] hover:underline">
                      #{r.protocol_id}
                    </Link>
                    <span className="font-medium text-gray-800">{name}</span>
                    <span className="text-xs text-gray-500">{r.insurance?.name ?? "Sin obra social"}</span>
                    {r.billing_state === "facturado" && <Badge className="bg-emerald-100 text-emerald-700">Facturado</Badge>}
                    {r.billing_state === "no_facturable" && <Badge className="bg-slate-200 text-slate-600">No facturable</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarRange className="h-3 w-3" /> Creado {fmtDate(r.created_at)}
                    </span>
                    <span>UB: {r.total_ub_authorized}</span>
                  </div>
                  {r.billing_state === "no_facturado" && (
                    <div className="mt-1.5">
                      <PaperStatusChips missingPaperwork={r.missing_paperwork} />
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" variant="outline" asChild title="Ver protocolo">
                    <Link to={`/protocolos/${r.protocol_id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  {r.billing_state === "no_facturado" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-[#204983] hover:bg-[#1a3d6f]"
                        disabled={busy || !canBill}
                        title={canBill ? undefined : "Completá el checklist de papeles para facturar"}
                        onClick={() => bill(r.protocol_id)}
                      >
                        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-1.5 h-4 w-4" />}
                        Facturar
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setEligible(r.protocol_id, false)}>
                        <EyeOff className="mr-1.5 h-4 w-4" /> No facturable
                      </Button>
                    </>
                  )}
                  {r.billing_state === "no_facturable" && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => setEligible(r.protocol_id, true)}>
                      <Eye className="mr-1.5 h-4 w-4" /> Reactivar
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
