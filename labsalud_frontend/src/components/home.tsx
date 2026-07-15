"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileWarning,
  FlaskConical,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react"
import useAuth from "@/contexts/auth-context"
import { useApiQuery } from "@/hooks/use-api-query"
import { useToast } from "@/hooks/use-toast"
import { ANALYTICS_ENDPOINTS } from "@/config/api"
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
    protocols?: number
    patients_served?: number
    analyses_loaded?: number
    results_loaded?: number
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
  // Dashboard rework
  patients_daily_last_35?: Array<{ date: string; patients_served: number }>
  cash_daily_last_35?: Array<{ date: string; collected: string }>
  cash_pending_total?: string
  top_urgent_analyses?: Array<{ code: number; name: string; protocols: number }>
  urgent_pending?: number
  avg_resolution_time_human?: string
  ready_to_bill?: number
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

  useEffect(() => {
    if (dashboardQuery.error) {
      showErrorToast("Error al cargar las estadísticas")
    }
  }, [dashboardQuery.error, showErrorToast])

  const dashboard = dashboardQuery.data
  const loading = dashboardQuery.isLoading
  const growthValue = parsePercent(dashboard?.protocols_completed_growth_percent)
  const growthTone = getTrendTone(growthValue)
  // Gráfico: PACIENTES ATENDIDOS. 35 días (5 semanas de 7) con carrusel por
  // semana. weekIndex 0 = semana actual (más reciente); subir el índice = atrás.
  const patientsSeries = dashboard?.patients_daily_last_35 || []
  const weeks: Array<typeof patientsSeries> = []
  for (let start = patientsSeries.length - 7; start >= 0; start -= 7) {
    weeks.push(patientsSeries.slice(start, start + 7))
  }
  const [weekIndex, setWeekIndex] = useState(0)
  const activeWeek = weeks[weekIndex] || []
  const goOlderWeek = () => setWeekIndex((prev) => Math.min(Math.max(weeks.length - 1, 0), prev + 1))
  const goNewerWeek = () => setWeekIndex((prev) => Math.max(0, prev - 1))
  // Swipe horizontal (mobile) para mover el carrusel entre semanas: arrastrar
  // hacia la derecha muestra semanas anteriores; hacia la izquierda, más nuevas.
  const swipeStartX = useRef<number | null>(null)
  const onCarouselTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0]?.clientX ?? null
  }
  const onCarouselTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? swipeStartX.current) - swipeStartX.current
    swipeStartX.current = null
    if (Math.abs(dx) < 40) return
    if (dx > 0) goOlderWeek()
    else goNewerWeek()
  }
  const weekRangeLabel = (() => {
    if (activeWeek.length === 0) return ""
    const fmt = (iso: string) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
    return `${fmt(activeWeek[0].date)} – ${fmt(activeWeek[activeWeek.length - 1].date)}`
  })()
  const todayKey = (() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  })()
  const insuranceMix = dashboard?.insurance_mix_month || []
  const topUrgent = dashboard?.top_urgent_analyses || []
  const missingInfo = dashboard?.missing_info
  const preauth = dashboard?.preauth_breakdown
  const arca = dashboard?.arca_month
  const cash = dashboard?.today_cash_revenue
  const cashBreakdown = cash?.breakdown
  // Caja: cobrado por día (35 días = 5 semanas) con el mismo carrusel de 7.
  const cashSeries = dashboard?.cash_daily_last_35 || []
  const cashWeeks: Array<typeof cashSeries> = []
  for (let start = cashSeries.length - 7; start >= 0; start -= 7) {
    cashWeeks.push(cashSeries.slice(start, start + 7))
  }
  const [cashWeekIndex, setCashWeekIndex] = useState(0)
  const goOlderCashWeek = () => setCashWeekIndex((p) => Math.min(Math.max(cashWeeks.length - 1, 0), p + 1))
  const goNewerCashWeek = () => setCashWeekIndex((p) => Math.max(0, p - 1))
  const formatMoney = (v?: string) => {
    const n = Number.parseFloat(v || "0")
    return Number.isFinite(n) ? `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"
  }

  const mainKpis = [
    {
      label: "Carga promedio",
      value: dashboard?.avg_result_load_time_human === "N/A" ? "Sin datos" : dashboard?.avg_result_load_time_human || "Sin datos",
      detail: "Tiempo de carga de resultados",
      icon: Clock3,
      className: "border-cyan-200 bg-cyan-50 text-cyan-800",
    },
    {
      label: "Tiempo de resolución",
      value: dashboard?.avg_resolution_time_human || "—",
      detail: "Promedio ingreso → completado",
      icon: Clock3,
      className: "border-violet-200 bg-violet-50 text-violet-800",
    },
    {
      label: "Urgentes pendientes",
      value: numberOrZero(dashboard?.urgent_pending).toLocaleString(),
      detail: "Protocolos urgentes sin cerrar",
      icon: AlertTriangle,
      className: "border-rose-200 bg-rose-50 text-rose-800",
    },
    ...(canAccessBilling
      ? [
          {
            label: "Listos para facturar",
            value: numberOrZero(dashboard?.ready_to_bill).toLocaleString(),
            detail: "Protocolos con papeles listos",
            icon: CheckCircle2,
            className: "border-teal-200 bg-teal-50 text-teal-800",
          },
        ]
      : []),
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <section className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Users className="h-5 w-5 flex-shrink-0 text-[#204983]" />
              <h2 className="truncate text-base font-semibold text-slate-900">Pacientes atendidos</h2>
            </div>
            <span className="hidden text-xs text-slate-500 sm:inline">
              {weekIndex === 0 ? "Semana actual" : `Hace ${weekIndex} sem.`}
              {weekRangeLabel ? ` · ${weekRangeLabel}` : ""}
            </span>
          </div>
          <div className="mb-3 flex items-center justify-center gap-1.5">
            {weeks.map((_, pos) => {
              // pos 0 = izquierda = semana más vieja; última = derecha = actual.
              const wIdx = weeks.length - 1 - pos
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setWeekIndex(wIdx)}
                  aria-label={wIdx === 0 ? "Semana actual" : `Hace ${wIdx} semanas`}
                  className={`h-1.5 rounded-full transition-all ${
                    wIdx === weekIndex ? "w-5 bg-[#204983]" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                  }`}
                />
              )
            })}
          </div>
          {loading ? (
            <Skeleton className="h-64 w-full rounded-md" />
          ) : (
            <div className="flex items-stretch gap-1 sm:gap-2">
              <button
                type="button"
                onClick={goOlderWeek}
                disabled={weekIndex >= weeks.length - 1}
                aria-label="Semana anterior"
                className="flex w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-[#204983] disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div
                className="flex-1 overflow-hidden"
                onTouchStart={onCarouselTouchStart}
                onTouchEnd={onCarouselTouchEnd}
              >
                <div
                  className="flex transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${(weeks.length - 1 - weekIndex) * 100}%)` }}
                >
                  {[...weeks].reverse().map((week, revIdx) => {
                    const maxForWeek = Math.max(1, ...week.map((it) => it.patients_served))
                    return (
                      <div key={revIdx} className="flex h-64 w-full shrink-0 flex-col">
                        <div className="flex flex-1 items-end gap-1.5 sm:gap-3">
                          {week.map((item) => {
                            const isToday = item.date === todayKey
                            const value = item.patients_served
                            return (
                              <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                                <span className={`mb-1 text-xs font-semibold ${isToday ? "text-[#204983]" : "text-slate-700"}`}>
                                  {value}
                                </span>
                                <div
                                  className={`flex w-full items-end rounded-md px-1 sm:px-1.5 ${
                                    isToday ? "bg-amber-100/70 ring-1 ring-amber-300" : "bg-slate-100/80"
                                  }`}
                                  style={{ height: "176px" }}
                                >
                                  <div
                                    className={`w-full rounded-t-md transition-all duration-300 ${isToday ? "bg-amber-500" : "bg-[#204983]"}`}
                                    style={{ height: `${Math.max(6, (value / maxForWeek) * 168)}px` }}
                                    title={`${value} paciente${value === 1 ? "" : "s"}${isToday ? " (hoy)" : ""}`}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="mt-2 flex gap-1.5 sm:gap-3">
                          {week.map((item) => {
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
                                <span className="text-[10px] capitalize sm:text-[11px]">{isToday ? "Hoy" : weekday}</span>
                                <span className="text-[10px] sm:text-[11px]">{day}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={goNewerWeek}
                disabled={weekIndex === 0}
                aria-label="Semana siguiente"
                className="flex w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-[#204983] disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
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
            <h2 className="text-base font-semibold text-slate-900">Caja (pacientes)</h2>
          </div>
          <span className="hidden text-xs text-slate-500 sm:inline">
            {cashWeekIndex === 0 ? "Semana actual" : `Hace ${cashWeekIndex} sem.`}
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-48 w-full rounded-md" />
        ) : (
          <>
            {/* Cobrado por día (7 días, carrusel por semana) */}
            <div className="mb-4 flex items-stretch gap-1 sm:gap-2">
              <button
                type="button"
                onClick={goOlderCashWeek}
                disabled={cashWeekIndex >= cashWeeks.length - 1}
                aria-label="Semana anterior"
                className="flex w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-emerald-600 disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex-1 overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${(cashWeeks.length - 1 - cashWeekIndex) * 100}%)` }}
                >
                  {[...cashWeeks].reverse().map((week, revIdx) => {
                    const maxCash = Math.max(1, ...week.map((it) => Number.parseFloat(it.collected || "0")))
                    return (
                      <div key={revIdx} className="flex h-40 w-full shrink-0 flex-col">
                        <div className="flex flex-1 items-end gap-1.5 sm:gap-3">
                          {week.map((item) => {
                            const value = Number.parseFloat(item.collected || "0")
                            const isToday = item.date === todayKey
                            return (
                              <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                                <div
                                  className={`flex w-full items-end rounded-md ${isToday ? "bg-amber-100/70 ring-1 ring-amber-300" : "bg-slate-100/80"}`}
                                  style={{ height: "104px" }}
                                  title={`${formatMoney(item.collected)}${isToday ? " (hoy)" : ""}`}
                                >
                                  <div
                                    className={`w-full rounded-t-md transition-all duration-300 ${isToday ? "bg-amber-500" : "bg-emerald-500"}`}
                                    style={{ height: `${Math.max(4, (value / maxCash) * 100)}px` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="mt-2 flex gap-1.5 sm:gap-3">
                          {week.map((item) => {
                            const dateObj = new Date(`${item.date}T00:00:00`)
                            const weekday = dateObj.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "")
                            const isToday = item.date === todayKey
                            return (
                              <div
                                key={item.date}
                                className={`flex min-w-0 flex-1 flex-col items-center leading-tight ${isToday ? "font-semibold text-emerald-700" : "text-slate-500"}`}
                              >
                                <span className="text-[10px] capitalize sm:text-[11px]">{isToday ? "Hoy" : weekday}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={goNewerCashWeek}
                disabled={cashWeekIndex === 0}
                aria-label="Semana siguiente"
                className="flex w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-emerald-600 disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-medium text-emerald-700">Cobrado hoy</p>
                <p className="mt-1 text-2xl font-bold text-emerald-800 sm:text-lg md:text-xl lg:text-2xl">{formatMoney(cash?.total_paid)}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-600">A cobrar hoy</p>
                <p className="mt-1 text-2xl font-bold text-slate-800 sm:text-lg md:text-xl lg:text-2xl">{formatMoney(cash?.total_due)}</p>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-medium text-amber-700">Pendiente (total sistema)</p>
                <p className="mt-1 text-2xl font-bold text-amber-800 sm:text-lg md:text-xl lg:text-2xl">{formatMoney(dashboard?.cash_pending_total)}</p>
              </div>
              {cashBreakdown && (
                <div className="sm:col-span-3 grid grid-cols-1 gap-1.5 rounded-md bg-slate-50 px-3 py-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
                  <CashBreakdownItem label="Particulares" amount={formatMoney(cashBreakdown.analyses_amount_due)} />
                  <CashBreakdownItem label="Coseguro" amount={formatMoney(cashBreakdown.coseguro)} />
                  <CashBreakdownItem label="Material" amount={formatMoney(cashBreakdown.material_descartable)} />
                  <CashBreakdownItem label="Derivación" amount={formatMoney(cashBreakdown.derivacion)} />
                  <CashBreakdownItem label="Cobros extra" amount={formatMoney(cashBreakdown.unplanned_charges)} />
                  <CashBreakdownItem label="Pagos extra" amount={formatMoney(cashBreakdown.unplanned_payments_today)} />
                </div>
              )}
            </div>
          </>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : insuranceMix.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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

      <section className="mt-5 rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <h2 className="text-base font-semibold text-slate-900">Top 3 análisis urgentes</h2>
          <span className="text-xs text-slate-500">en más protocolos</span>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : topUrgent.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {topUrgent.map((a, idx) => (
              <div key={a.code} className="flex items-center gap-3 rounded-md border border-rose-100 bg-rose-50 px-3 py-3 text-rose-900">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-200 text-sm font-bold text-rose-800">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" title={a.name}>{a.name}</p>
                  <p className="text-xs text-rose-700">{a.protocols.toLocaleString()} protocolos · cód. {a.code}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No hay análisis urgentes con protocolos.
          </p>
        )}
      </section>
    </div>
  )
}

// El importe no tiene espacios, así que nunca puede cortarse en dos líneas:
// se lleva shrink-0 y el que cede espacio es el label.
function CashBreakdownItem({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-2">
      <span className="truncate text-slate-500" title={label}>{label}</span>
      <span className="shrink-0 font-semibold">{amount}</span>
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
