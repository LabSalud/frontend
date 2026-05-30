"use client"

import { useEffect } from "react"
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  FileWarning,
  FlaskConical,
  Receipt,
  ShieldCheck,
  TestTube2,
  TrendingUp,
  Users,
} from "lucide-react"
import useAuth from "@/contexts/auth-context"
import { useApiQuery } from "@/hooks/use-api-query"
import { useToast } from "@/hooks/use-toast"
import { ANALYTICS_ENDPOINTS, BILLING_ENDPOINTS } from "@/config/api"
import { PERMISSIONS } from "@/config/permissions"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardResponse {
  analysis_today?: number
  patients_today?: number
  protocols_completed_month?: number
  protocols_completed_growth_percent?: string
  avg_result_load_time_human?: string
  pending_results_load?: number
  pending_results_validation?: number
  printed_with_incomplete_payment?: number
  missing_info?: {
    protocols_blocked?: number
    orden_no_trajo?: number
    orden_incompleta?: number
    orden_completa?: number
    preauth_pending_details?: number
    anonymous_patients_month?: number
  }
  arca_month?: {
    billed?: number
    pending?: number
    failed?: number
  }
  insurance_mix_month?: Array<{
    insurance_id: number
    name: string
    protocols: number
  }>
  protocols_daily_last_7?: Array<{
    date: string
    count: number
  }>
  preauth_breakdown?: {
    no_trajo?: number
    incompleta?: number
    completa?: number
  }
  today_cash_revenue?: {
    protocols_count?: number
    total_paid?: string
    total_due?: string
    pending_to_collect?: string
    breakdown?: {
      analyses_amount_due?: string
      coseguro?: string
      material_descartable?: string
      derivacion?: string
      unplanned_charges?: string
      unplanned_payments_today?: string
    }
  }
}

interface ProtocolsToBillResponse {
  count?: number
}

type TrendTone = "emerald" | "rose" | "slate"

const numberOrZero = (value?: number) => value ?? 0

const parsePercent = (value?: string) => {
  const parsed = Number.parseFloat((value || "0").replace("%", ""))
  return Number.isFinite(parsed) ? parsed : 0
}

const getTrendTone = (value: number): TrendTone => {
  if (value > 0) return "emerald"
  if (value < 0) return "rose"
  return "slate"
}

const toneClasses: Record<TrendTone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  slate: "bg-slate-50 text-slate-700 border-slate-200",
}

export default function Home() {
  const { user, hasPermission } = useAuth()
  const { error: showErrorToast } = useToast()
  const canAccessBilling = hasPermission(PERMISSIONS.MANAGE_BILLING.codename)

  const dashboardQuery = useApiQuery<DashboardResponse>({
    queryKey: ["analytics", "dashboard"],
    url: ANALYTICS_ENDPOINTS.DASHBOARD,
    staleTime: 30 * 1000,
  })

  const protocolsToBillQuery = useApiQuery<ProtocolsToBillResponse>({
    queryKey: ["billing", "protocols-to-bill", "count"],
    url: BILLING_ENDPOINTS.PROTOCOLS_TO_BILL,
    enabled: canAccessBilling,
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    if (dashboardQuery.error) {
      showErrorToast("Error al cargar las estadísticas")
    }
  }, [dashboardQuery.error, showErrorToast])

  const dashboard = dashboardQuery.data
  const loading = dashboardQuery.isLoading || (canAccessBilling && protocolsToBillQuery.isLoading)
  const growthValue = parsePercent(dashboard?.protocols_completed_growth_percent)
  const growthTone = getTrendTone(growthValue)
  const dailySeries = dashboard?.protocols_daily_last_7 || []
  const dailyMax = Math.max(1, ...dailySeries.map((item) => item.count))
  const todayKey = (() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  })()
  const insuranceMix = dashboard?.insurance_mix_month || []
  const missingInfo = dashboard?.missing_info
  const preauth = dashboard?.preauth_breakdown
  const arca = dashboard?.arca_month
  const pendingBilling = Number(protocolsToBillQuery.data?.count || 0)
  const cash = dashboard?.today_cash_revenue
  const cashBreakdown = cash?.breakdown
  const formatMoney = (v?: string) => {
    const n = Number.parseFloat(v || "0")
    return Number.isFinite(n) ? `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"
  }

  const mainKpis = [
    {
      label: "Análisis hoy",
      value: numberOrZero(dashboard?.analysis_today).toLocaleString(),
      detail: "Análisis asociados a protocolos de hoy",
      icon: TestTube2,
      className: "border-blue-200 bg-blue-50 text-blue-800",
    },
    {
      label: "Pacientes hoy",
      value: numberOrZero(dashboard?.patients_today).toLocaleString(),
      detail: "Pacientes distintos atendidos",
      icon: Users,
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
    {
      label: "Completados del mes",
      value: numberOrZero(dashboard?.protocols_completed_month).toLocaleString(),
      detail: "Protocolos cerrados en el mes",
      icon: CheckCircle2,
      className: "border-violet-200 bg-violet-50 text-violet-800",
    },
    {
      label: "Carga promedio",
      value: dashboard?.avg_result_load_time_human === "N/A" ? "Sin datos" : dashboard?.avg_result_load_time_human || "Sin datos",
      detail: "Tiempo de carga de resultados",
      icon: Clock3,
      className: "border-cyan-200 bg-cyan-50 text-cyan-800",
    },
  ]

  const operationalItems = [
    {
      label: "Resultados por cargar",
      value: numberOrZero(dashboard?.pending_results_load),
      className: "border-amber-200 bg-amber-50 text-amber-800",
    },
    {
      label: "Resultados por validar",
      value: numberOrZero(dashboard?.pending_results_validation),
      className: "border-sky-200 bg-sky-50 text-sky-800",
    },
    {
      label: "Impresos con pago incompleto",
      value: numberOrZero(dashboard?.printed_with_incomplete_payment),
      className: "border-rose-200 bg-rose-50 text-rose-800",
    },
    ...(canAccessBilling
      ? [
          {
            label: "Protocolos para facturar",
            value: pendingBilling,
            className: "border-teal-200 bg-teal-50 text-teal-800",
          },
        ]
      : []),
  ]

  const missingItems = [
    { label: "En estado Información faltante", value: numberOrZero(missingInfo?.protocols_blocked) },
    { label: "Orden no presentada", value: numberOrZero(missingInfo?.orden_no_trajo) },
    { label: "Orden incompleta", value: numberOrZero(missingInfo?.orden_incompleta) },
    { label: "Preautorización pendiente", value: numberOrZero(missingInfo?.preauth_pending_details) },
    { label: "Pacientes anónimos mes", value: numberOrZero(missingInfo?.anonymous_patients_month) },
  ]

  const preauthTotal =
    numberOrZero(preauth?.completa) + numberOrZero(preauth?.incompleta) + numberOrZero(preauth?.no_trajo)

  const arcaItems = [
    { label: "Facturado", value: numberOrZero(arca?.billed), className: "bg-emerald-50 text-emerald-700" },
    { label: "Pendiente", value: numberOrZero(arca?.pending), className: "bg-amber-50 text-amber-700" },
    { label: "Fallido", value: numberOrZero(arca?.failed), className: "bg-rose-50 text-rose-700" },
  ]

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6">
      <section className="mb-5 rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-[#204983] text-white">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              {loading ? (
                <>
                  <Skeleton className="mb-2 h-6 w-56" />
                  <Skeleton className="h-4 w-40" />
                </>
              ) : (
                <>
                  <h1 className="truncate text-xl font-semibold text-slate-900">
                    Hola, {user?.first_name || user?.username || "equipo"}
                  </h1>
                  <p className="text-sm text-slate-500">Resumen operativo del laboratorio</p>
                </>
              )}
            </div>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm ${toneClasses[growthTone]}`}>
            <TrendingUp className="h-4 w-4" />
            <span className="font-semibold">
              {growthValue > 0 ? "+" : ""}
              {dashboard?.protocols_completed_growth_percent || "0.0%"}
            </span>
            <span>vs. mes anterior</span>
          </div>
        </div>
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => <MetricSkeleton key={index} />)
          : mainKpis.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.label} className={`rounded-lg border p-4 shadow-sm ${item.className}`}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium opacity-80">{item.label}</p>
                      <p className="mt-2 text-3xl font-bold leading-none">{item.value}</p>
                    </div>
                    <Icon className="h-5 w-5 flex-shrink-0 opacity-80" />
                  </div>
                  <p className="text-xs opacity-75">{item.detail}</p>
                </article>
              )
            })}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <section className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#204983]" />
              <h2 className="text-base font-semibold text-slate-900">Protocolos creados</h2>
            </div>
            <span className="text-xs text-slate-500">Últimos 7 días</span>
          </div>
          {loading ? (
            <Skeleton className="h-64 w-full rounded-md" />
          ) : (
            <div className="flex h-64 flex-col">
              <div className="flex flex-1 items-end gap-1.5 sm:gap-3">
                {dailySeries.map((item) => {
                  const isToday = item.date === todayKey
                  return (
                    <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                      <span
                        className={`mb-1 text-xs font-semibold ${
                          isToday ? "text-[#204983]" : "text-slate-700"
                        }`}
                      >
                        {item.count}
                      </span>
                      <div
                        className={`flex w-full items-end rounded-md px-1 sm:px-1.5 ${
                          isToday ? "bg-amber-100/70 ring-1 ring-amber-300" : "bg-slate-100/80"
                        }`}
                        style={{ height: "176px" }}
                      >
                        <div
                          className={`w-full rounded-t-md ${
                            isToday ? "bg-amber-500" : "bg-[#204983]"
                          }`}
                          style={{ height: `${Math.max(6, (item.count / dailyMax) * 168)}px` }}
                          title={`${item.count} protocolo${item.count !== 1 ? "s" : ""}${
                            isToday ? " (hoy)" : ""
                          }`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 flex gap-1.5 sm:gap-3">
                {dailySeries.map((item) => {
                  const dateObj = new Date(`${item.date}T00:00:00`)
                  const weekday = dateObj.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "")
                  const day = dateObj.toLocaleDateString("es-AR", { day: "2-digit" })
                  const isToday = item.date === todayKey
                  return (
                    <div
                      key={item.date}
                      className={`flex min-w-0 flex-1 flex-col items-center leading-tight ${
                        isToday ? "font-semibold text-[#204983]" : "text-slate-500"
                      }`}
                    >
                      <span className="text-[10px] capitalize sm:text-[11px]">
                        {isToday ? "Hoy" : weekday}
                      </span>
                      <span className="text-[10px] sm:text-[11px]">{day}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-semibold text-slate-900">Pendientes operativos</h2>
          </div>
          <div className="grid gap-3">
            {loading
              ? Array.from({ length: canAccessBilling ? 4 : 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-md" />
                ))
              : operationalItems.map((item) => (
                  <div key={item.label} className={`rounded-md border px-4 py-3 ${item.className}`}>
                    <p className="text-2xl font-bold leading-none">{item.value.toLocaleString()}</p>
                    <p className="mt-1 text-sm font-medium">{item.label}</p>
                  </div>
                ))}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">Caja del día (pacientes)</h2>
          </div>
          <span className="text-xs text-slate-500">
            {numberOrZero(cash?.protocols_count).toLocaleString()} protocolos hoy
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-32 w-full rounded-md" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-medium text-emerald-700">Cobrado hoy</p>
              <p className="mt-1 text-2xl font-bold text-emerald-800">{formatMoney(cash?.total_paid)}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-600">Total a cobrar</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{formatMoney(cash?.total_due)}</p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-medium text-amber-700">Pendiente</p>
              <p className="mt-1 text-2xl font-bold text-amber-800">{formatMoney(cash?.pending_to_collect)}</p>
            </div>
            {cashBreakdown && (
              <div className="sm:col-span-3 grid grid-cols-2 gap-1.5 rounded-md bg-slate-50 px-3 py-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
                <div className="flex justify-between gap-2"><span className="text-slate-500">Particulares</span><span className="font-semibold">{formatMoney(cashBreakdown.analyses_amount_due)}</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-500">Coseguro</span><span className="font-semibold">{formatMoney(cashBreakdown.coseguro)}</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-500">Material</span><span className="font-semibold">{formatMoney(cashBreakdown.material_descartable)}</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-500">Derivación</span><span className="font-semibold">{formatMoney(cashBreakdown.derivacion)}</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-500">Cobros extra</span><span className="font-semibold">{formatMoney(cashBreakdown.unplanned_charges)}</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-500">Pagos extra</span><span className="font-semibold">{formatMoney(cashBreakdown.unplanned_payments_today)}</span></div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-semibold text-slate-900">Información faltante</h2>
          </div>
          <MetricList items={missingItems} loading={loading} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Preautorizaciones</h2>
          </div>
          {loading ? (
            <Skeleton className="h-32 w-full rounded-md" />
          ) : (
            <div className="space-y-3">
              <PreauthBar label="Completas" value={numberOrZero(preauth?.completa)} total={preauthTotal} className="bg-emerald-500" />
              <PreauthBar label="Incompletas" value={numberOrZero(preauth?.incompleta)} total={preauthTotal} className="bg-amber-500" />
              <PreauthBar label="No presentadas" value={numberOrZero(preauth?.no_trajo)} total={preauthTotal} className="bg-rose-500" />
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-sky-600" />
            <h2 className="text-base font-semibold text-slate-900">ARCA del mes</h2>
          </div>
          <div className="grid gap-3">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14 w-full rounded-md" />)
              : arcaItems.map((item) => (
                  <div key={item.label} className={`flex items-center justify-between rounded-md px-3 py-2 ${item.className}`}>
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xl font-bold">{item.value.toLocaleString()}</span>
                  </div>
                ))}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-teal-600" />
          <h2 className="text-base font-semibold text-slate-900">Obras sociales del mes</h2>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : insuranceMix.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {insuranceMix.map((insurance) => (
              <div key={insurance.insurance_id} className="rounded-md border border-teal-100 bg-teal-50 px-3 py-3 text-teal-800">
                <p className="truncate text-sm font-semibold" title={insurance.name}>
                  {insurance.name}
                </p>
                <p className="mt-2 text-2xl font-bold leading-none">{insurance.protocols.toLocaleString()}</p>
                <p className="mt-1 text-xs text-teal-700">protocolos</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Sin protocolos de obras sociales este mes
          </p>
        )}
      </section>
    </div>
  )
}

function MetricSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <Skeleton className="h-3 w-40" />
    </div>
  )
}

function MetricList({ items, loading }: { items: Array<{ label: string; value: number }>; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full rounded-md" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
          <span className="text-sm text-slate-600">{item.label}</span>
          <span className="text-sm font-bold text-slate-900">{item.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

function PreauthBar({ label, value, total, className }: { label: string; value: number; total: number; className: string }) {
  const width = total > 0 ? Math.max(4, (value / total) * 100) : 0

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${className}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}
