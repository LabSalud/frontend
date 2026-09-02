"use client"

import { useEffect, useState } from "react"

import CajaDelDia from "@/components/caja-del-dia"
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
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
import PendienteDelSistema from "@/components/pendiente-del-sistema"
import { CarruselDeslizable } from "@/components/common/carrusel-deslizable"
import { ENTRADA_ABAJO, ENTRADA_ARRIBA } from "@/lib/entrada"

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
  top_urgent_analyses?: Array<{ code: string; name: string; protocols: number }>
  urgent_pending?: number
  avg_resolution_time_human?: string
  ready_to_bill?: number
  /** Los meses que ofrece el selector, del primer protocolo hasta hoy. */
  meses_disponibles?: MesDisponible[]
}

interface MesDisponible {
  anio: number
  mes: number
}

/**
 * Las estadísticas de UN mes.
 *
 * El inicio mira el día de hoy y el mes en curso, y el 1° arranca de cero. Eso
 * está bien para operar, pero deja el mes que cerró sin ningún lado donde
 * mirarse. Esto contesta esa otra pregunta.
 */
interface EstadisticasDelMes {
  anio: number
  mes: number
  es_mes_actual: boolean
  desde: string
  hasta: string
  protocolos: number
  pacientes: number
  analisis: number
  completados: number
  completados_mes_anterior: number
  /** `null` cuando el mes anterior no tuvo nada: no se inventa un porcentaje. */
  crecimiento_porcentaje: string | null
  cobrado: string
  anonimos: number
  arca: { billed: number; pending: number; failed: number }
  obras_sociales: Array<{ insurance_id: number | null; name: string; protocols: number }>
  pacientes_por_dia: Array<{ date: string; patients_served: number }>
  caja_por_dia: Array<{ date: string; collected: string }>
  meses_disponibles: MesDisponible[]
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

/**
 * Un día de la grilla del mes.
 *
 * `delMes` false = relleno, un día de un mes vecino que sólo está para
 * completar la fila. `dato` null con `delMes` true = día del mes que todavía
 * no pasó.
 */
type CeldaDelMes<T> = { date: string; delMes: boolean; dato: T | null }

/**
 * El mes partido en semanas de calendario, de lunes a domingo.
 *
 * Arma la grilla del mes: la primera semana es la que contiene
 * al día 1 y la última la que contiene al último día. Cada columna cae siempre
 * bajo el mismo día de la semana, que es lo que permite comparar un lunes
 * contra otro lunes de un vistazo.
 *
 * Todas las semanas salen de siete celdas, incluidas la primera y la última.
 * Si el mes empieza sábado, esa semana trae cinco celdas de relleno antes del
 * 1: sin ellas el sábado y el domingo se estirarían a media pantalla y esas
 * dos barras parecerían un récord.
 *
 * Los días del mes sin dato quedan en `null`, no en cero: en el mes en curso
 * los días que todavía no pasaron no atendieron a nadie, pero eso no es lo
 * mismo que un día abierto sin pacientes, y pintarlos igual sería mentir.
 */
function semanasDelMes<T extends { date: string }>(
  anio: number,
  mes: number,
  serie: T[],
): Array<Array<CeldaDelMes<T>>> {
  const porFecha = new Map(serie.map((d) => [d.date, d]))
  // Día 0 del mes siguiente = último día de este mes.
  const ultimoDia = new Date(anio, mes, 0).getDate()
  // getDay() devuelve 0 para domingo; lo corro a 0 = lunes ... 6 = domingo.
  const offsetLunes = (dia: number) => (new Date(anio, mes - 1, dia).getDay() + 6) % 7

  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

  // Del lunes de la semana del día 1 al domingo de la semana del último día.
  const cursor = new Date(anio, mes - 1, 1 - offsetLunes(1))
  const fin = new Date(anio, mes - 1, ultimoDia + (6 - offsetLunes(ultimoDia)))

  const semanas: Array<Array<CeldaDelMes<T>>> = []
  let actual: Array<CeldaDelMes<T>> = []
  while (cursor <= fin) {
    const fecha = iso(cursor)
    const delMes = cursor.getFullYear() === anio && cursor.getMonth() === mes - 1
    actual.push({ date: fecha, delMes, dato: delMes ? porFecha.get(fecha) ?? null : null })
    if (actual.length === 7) {
      semanas.push(actual)
      actual = []
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  if (actual.length > 0) semanas.push(actual)
  return semanas
}

const NOMBRES_DE_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const nombreDelMes = (m: MesDisponible) => `${NOMBRES_DE_MES[m.mes - 1]} ${m.anio}`

const esMesActual = (anio: number, mes: number) => {
  const hoy = new Date()
  return anio === hoy.getFullYear() && mes === hoy.getMonth() + 1
}

/** El retraso de cada bloque, con tope: el último no puede entrar un segundo tarde. */
const retraso = (posicion: number) => ({
  animationDelay: `${Math.min(posicion, 8) * 70}ms`,
  animationFillMode: "both" as const,
})


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

  // MIRAR UN MES PARA ATRÁS
  //
  // El inicio arranca siempre en HOY: es la pantalla con la que se abre el
  // laboratorio y lo que importa a las ocho de la mañana es lo que hay
  // pendiente ahora. `mesElegido` en `null` es exactamente eso, la pantalla de
  // siempre; recién cuando alguien aprieta la flecha se pide otro mes.
  const [mesElegido, setMesElegido] = useState<MesDisponible | null>(null)
  const viendoOtroMes = mesElegido !== null

  const mesQuery = useApiQuery<EstadisticasDelMes>({
    queryKey: ["analytics", "mes", mesElegido?.anio, mesElegido?.mes],
    url: mesElegido
      ? ANALYTICS_ENDPOINTS.MES(mesElegido.anio, mesElegido.mes)
      : ANALYTICS_ENDPOINTS.DASHBOARD,
    enabled: viendoOtroMes,
    // Un mes cerrado no cambia: no hace falta volver a pedirlo al rato.
    staleTime: 5 * 60 * 1000,
  })
  const mesData = mesQuery.data

  const loading = viendoOtroMes ? mesQuery.isLoading : dashboardQuery.isLoading

  // Los meses que ofrece el selector. Vienen del dashboard —así el selector
  // está armado desde el primer render— y si todavía no llegaron, al menos
  // está el actual: un selector vacío no se puede ni abrir.
  const mesesOfrecidos: MesDisponible[] = (() => {
    const hoy = new Date()
    const actual = { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 }
    const lista = dashboard?.meses_disponibles?.length
      ? [...dashboard.meses_disponibles]
      : [actual]
    // Del más nuevo al más viejo: en un selector, "el mes pasado" tiene que
    // estar arriba y no al final de dos años de historia.
    return lista.reverse()
  })()

  const mesVisible: MesDisponible = mesElegido ?? (() => {
    const hoy = new Date()
    return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 }
  })()

  const posicionActual = mesesOfrecidos.findIndex(
    (m) => m.anio === mesVisible.anio && m.mes === mesVisible.mes,
  )
  // La lista va del más nuevo al más viejo: "atrás" es avanzar en el índice.
  const hayMesAnterior = posicionActual >= 0 && posicionActual < mesesOfrecidos.length - 1
  const hayMesSiguiente = posicionActual > 0

  const moverMes = (direccion: -1 | 1) => {
    const destino = mesesOfrecidos[posicionActual + (direccion === -1 ? 1 : -1)]
    if (!destino) return
    setMesElegido(esMesActual(destino.anio, destino.mes) ? null : destino)
  }

  // El porcentaje del encabezado sigue al mes que se está mirando.
  const growthValue = parsePercent(
    viendoOtroMes
      ? mesData?.crecimiento_porcentaje ?? undefined
      : dashboard?.protocols_completed_growth_percent,
  )
  const growthTone = getTrendTone(growthValue)
  const todayKey = (() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  })()
  // Gráfico: PACIENTES ATENDIDOS. El mes en semanas de calendario (lunes a
  // domingo) con carrusel. weekIndex va en orden: 0 = la semana del día 1,
  // el último = la semana que cierra el mes.
  const patientsSeries = viendoOtroMes
    ? mesData?.pacientes_por_dia || []
    : dashboard?.patients_daily_last_35 || []
  const weeks = semanasDelMes(mesVisible.anio, mesVisible.mes, patientsSeries)
  // Sólo cuenta si hoy cae en un día del mes que se está mirando: el relleno de
  // la primera semana puede traer días del mes anterior, y mirando septiembre
  // un 30 de agosto esa celda no es "la semana en curso" de septiembre.
  const semanaEnCurso = weeks.findIndex((w) => w.some((c) => c.delMes && c.date === todayKey))
  const [weekIndex, setWeekIndex] = useState(0)
  // AL ABRIR EL INICIO, LA SEMANA EN CURSO.
  //
  // El inicio se abre para ver cómo viene la semana, no cómo arrancó el mes.
  // El índice se reacomoda cuando cambia el mes que se mira, y en el mes en
  // curso cae en la semana de hoy; en un mes cerrado no hay "hoy", así que
  // muestra la última, que es donde terminó de pasar algo.
  useEffect(() => {
    if (weeks.length === 0) return
    setWeekIndex(semanaEnCurso >= 0 ? semanaEnCurso : weeks.length - 1)
    // Depende sólo del mes y de la forma de la grilla, no de `weekIndex`: si
    // dependiera del índice, cada flecha del usuario se desharía sola en el
    // render siguiente.
  }, [mesVisible.anio, mesVisible.mes, weeks.length, semanaEnCurso])
  const activeWeek = weeks[weekIndex] || []
  const goOlderWeek = () => setWeekIndex((prev) => Math.max(0, prev - 1))
  const goNewerWeek = () => setWeekIndex((prev) => Math.min(Math.max(weeks.length - 1, 0), prev + 1))
  // El gesto de deslizar ya no se detecta a mano: la pista scrollea de verdad
  // (`CarruselDeslizable`), así que el dedo, el trackpad y la rueda con Shift
  // hacen lo mismo sin que este componente se entere.
  const weekRangeLabel = (() => {
    // El rango es el del mes, no el de la fila: si la semana arranca con
    // relleno de otro mes, el rótulo igual empieza en el día 1.
    const delMes = activeWeek.filter((c) => c.delMes)
    if (delMes.length === 0) return ""
    const fmt = (iso: string) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
    return `${fmt(delMes[0].date)} – ${fmt(delMes[delMes.length - 1].date)}`
  })()
  // El día abierto en el detalle de caja. null = ninguno.
  const [cajaDelDia, setCajaDelDia] = useState<string | null>(null)

  // LAS BARRAS CRECEN DESDE ABAJO.
  //
  // Se pintan en cero y en el frame siguiente pasan a su altura real; la
  // transición que ya tenían hace el resto. Además de quedar lindo, el
  // movimiento dice de un vistazo cuál es la barra más alta de la semana, que
  // es lo único que se mira en un gráfico de siete días.
  const [dibujado, setDibujado] = useState(false)
  useEffect(() => {
    if (loading) return
    const id = requestAnimationFrame(() => setDibujado(true))
    return () => cancelAnimationFrame(id)
  }, [loading])

  /** La altura de una barra: cero hasta el primer frame después de cargar. */
  const alto = (px: number) => (dibujado ? `${px}px` : "0px")

  // Estos dos SÍ son del mes, así que siguen al mes que se está mirando.
  const insuranceMix = viendoOtroMes
    ? mesData?.obras_sociales || []
    : dashboard?.insurance_mix_month || []
  const topUrgent = dashboard?.top_urgent_analyses || []
  const missingInfo = dashboard?.missing_info
  const preauth = dashboard?.preauth_breakdown
  const arca = viendoOtroMes ? mesData?.arca : dashboard?.arca_month
  const cash = dashboard?.today_cash_revenue
  const cashBreakdown = cash?.breakdown
  // Caja: cobrado por día, con las mismas semanas de calendario que pacientes.
  const cashSeries = viendoOtroMes
    ? mesData?.caja_por_dia || []
    : dashboard?.cash_daily_last_35 || []
  // Mismo criterio que pacientes: las semanas del calendario del mes, no
  // ventanas de siete días. Los dos gráficos están uno al lado del otro y una
  // misma columna tiene que ser el mismo día en los dos.
  const cashWeeks = semanasDelMes(mesVisible.anio, mesVisible.mes, cashSeries)
  const semanaEnCursoCaja = cashWeeks.findIndex((w) => w.some((c) => c.delMes && c.date === todayKey))
  const [cashWeekIndex, setCashWeekIndex] = useState(0)
  useEffect(() => {
    if (cashWeeks.length === 0) return
    setCashWeekIndex(semanaEnCursoCaja >= 0 ? semanaEnCursoCaja : cashWeeks.length - 1)
  }, [mesVisible.anio, mesVisible.mes, cashWeeks.length, semanaEnCursoCaja])
  const goOlderCashWeek = () => setCashWeekIndex((p) => Math.max(0, p - 1))
  const goNewerCashWeek = () => setCashWeekIndex((p) => Math.min(Math.max(cashWeeks.length - 1, 0), p + 1))
  const cashWeekRangeLabel = (() => {
    const delMes = (cashWeeks[cashWeekIndex] || []).filter((c) => c.delMes)
    if (delMes.length === 0) return ""
    const fmt = (iso: string) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
    return `${fmt(delMes[0].date)} – ${fmt(delMes[delMes.length - 1].date)}`
  })()
  const formatMoney = (v?: string) => {
    const n = Number.parseFloat(v || "0")
    return Number.isFinite(n) ? `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"
  }

  // LAS TARJETAS DE ARRIBA CAMBIAN DE PREGUNTA.
  //
  // En el mes en curso son operativas —cuánto tarda una carga, cuántos
  // urgentes hay sin cerrar—: cosas de AHORA. Mirando un mes cerrado esas
  // preguntas no tienen respuesta (no existe "urgentes pendientes de junio"),
  // así que las cuatro pasan a ser el resumen de ese mes.
  const kpisDelMes = [
    {
      label: "Protocolos",
      value: numberOrZero(mesData?.protocolos).toLocaleString(),
      detail: mesData ? `${mesData.desde} al ${mesData.hasta}` : "",
      icon: FileText,
      className: "border-[#204983]/25 bg-[#204983]/10 text-[#204983]",
    },
    {
      label: "Pacientes atendidos",
      value: numberOrZero(mesData?.pacientes).toLocaleString(),
      detail: "Sin repetir: una persona cuenta una vez",
      icon: Users,
      className: "border-cyan-200 bg-cyan-50 text-cyan-800",
    },
    {
      label: "Análisis",
      value: numberOrZero(mesData?.analisis).toLocaleString(),
      detail: "Sin contar el acto bioquímico",
      icon: FlaskConical,
      className: "border-violet-200 bg-violet-50 text-violet-800",
    },
    {
      label: "Cobrado",
      value: formatMoney(mesData?.cobrado),
      detail: `${numberOrZero(mesData?.completados).toLocaleString()} protocolos completados`,
      icon: Receipt,
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
  ]

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
    <div className="w-full py-5">
      <section
        style={retraso(0)}
        className={`mb-5 rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5 ${ENTRADA_ARRIBA}`}
      >
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
          <div className="flex flex-wrap items-center gap-2">
            {/* EL MES QUE SE ESTÁ MIRANDO.
                El 1° las estadísticas arrancan de cero, que es lo que se
                quiere para operar; la flecha es para que el mes que cerró no
                quede sin ningún lado donde mirarse. */}
            <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1 py-1">
              <button
                type="button"
                onClick={() => moverMes(-1)}
                disabled={!hayMesAnterior}
                aria-label="Mes anterior"
                className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-[#204983] disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <select
                value={mesElegido ? `${mesElegido.anio}-${mesElegido.mes}` : "actual"}
                onChange={(e) => {
                  const valor = e.target.value
                  if (valor === "actual") return setMesElegido(null)
                  const [anio, mes] = valor.split("-").map(Number)
                  setMesElegido(esMesActual(anio, mes) ? null : { anio, mes })
                }}
                aria-label="Mes de las estadísticas"
                className="h-7 min-w-[9.5rem] cursor-pointer rounded bg-transparent px-1 text-sm font-medium text-slate-700 outline-none"
              >
                {mesesOfrecidos.map((m) => (
                  <option key={`${m.anio}-${m.mes}`} value={`${m.anio}-${m.mes}`}>
                    {nombreDelMes(m)}
                    {esMesActual(m.anio, m.mes) ? " (en curso)" : ""}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => moverMes(1)}
                disabled={!hayMesSiguiente}
                aria-label="Mes siguiente"
                className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-[#204983] disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className={`inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm ${toneClasses[growthTone]}`}>
              <TrendingUp className="h-4 w-4" />
              <span className="font-semibold">
                {growthValue > 0 ? "+" : ""}
                {(viendoOtroMes
                  ? mesData?.crecimiento_porcentaje
                  : dashboard?.protocols_completed_growth_percent) || "0.0%"}
              </span>
              <span>vs. mes anterior</span>
            </div>
          </div>
        </div>
      </section>

      {viendoOtroMes && (
        <p
          style={retraso(1)}
          className={`mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 ${ENTRADA_ARRIBA}`}
        >
          Estás viendo <strong>{nombreDelMes(mesVisible)}</strong>, un mes que ya
          cerró. Lo que es de ahora —pendientes de carga, caja del día, urgentes
          sin cerrar— no se muestra: no sería de este mes.
        </p>
      )}

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => <MetricSkeleton key={index} />)
          : (viendoOtroMes ? kpisDelMes : mainKpis).map((item, indice) => {
              const Icon = item.icon
              return (
                <article
                  key={item.label}
                  style={retraso(indice + 1)}
                  className={`rounded-lg border p-4 shadow-sm ${item.className} ${ENTRADA_ABAJO}`}
                >
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
        <section
          style={retraso(5)}
          className={`rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5 ${ENTRADA_ABAJO}`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Users className="h-5 w-5 flex-shrink-0 text-[#204983]" />
              <h2 className="truncate text-base font-semibold text-slate-900">Pacientes atendidos</h2>
            </div>
            <span className="hidden text-xs text-slate-500 sm:inline">
              {weekIndex === semanaEnCurso ? "Semana en curso" : `Semana ${weekIndex + 1} de ${weeks.length}`}
              {weekRangeLabel ? ` · ${weekRangeLabel}` : ""}
            </span>
          </div>
          <div className="mb-3 flex items-center justify-center gap-1.5">
            {/* Los puntitos van en el orden del mes: el primero es la semana
                del día 1 y el último la que lo cierra. */}
            {weeks.map((_, pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setWeekIndex(pos)}
                aria-label={pos === semanaEnCurso ? "Semana en curso" : `Semana ${pos + 1} del mes`}
                className={`h-1.5 rounded-full transition-all ${
                  pos === weekIndex ? "w-5 bg-[#204983]" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
          {loading ? (
            <Skeleton className="h-64 w-full rounded-md" />
          ) : (
            <div className="flex items-stretch gap-1 sm:gap-2">
              <button
                type="button"
                onClick={goOlderWeek}
                disabled={weekIndex === 0}
                aria-label="Semana anterior"
                className="flex w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-[#204983] disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {/* La pista va en el orden del mes, igual que `weekIndex`: la
                  primera semana a la izquierda, la que lo cierra a la derecha. */}
              <CarruselDeslizable
                ariaLabel="Semanas de pacientes atendidos"
                activo={weekIndex}
                onActivo={(pos) => setWeekIndex(pos)}
              >
                <>
                  {weeks.map((week, wIdx) => {
                    // El máximo sale sólo de los días que ya pasaron: si contara
                    // los futuros como cero no cambiaría nada, pero deja claro
                    // que la escala es de lo medido.
                    const maxForWeek = Math.max(1, ...week.map((c) => c.dato?.patients_served ?? 0))
                    return (
                      // MEDIO HUECO DE PADDING A CADA LADO.
                      //
                      // Los paneles van pegados: sin esto la última barra de una
                      // semana toca la primera de la siguiente, y como el ancho de
                      // la pista sale de restar las flechas —casi nunca da entero—
                      // el redondeo subpíxel deja asomar una tajada de la barra
                      // vecina en el borde. Con medio hueco de cada lado, la
                      // separación entre semanas es la misma que entre dos barras.
                      <div key={wIdx} className="flex h-64 w-full shrink-0 snap-center flex-col px-[3px] sm:px-1.5">
                        <div className="flex flex-1 items-end gap-1.5 sm:gap-3">
                          {week.map((celda) => {
                            const isToday = celda.date === todayKey
                            const value = celda.dato?.patients_served ?? null
                            // Relleno de otro mes: ocupa la columna para que el
                            // ancho de las barras no cambie entre semanas, pero
                            // no se pinta.
                            if (!celda.delMes) {
                              return <div key={celda.date} className="min-w-0 flex-1" aria-hidden="true" />
                            }
                            // Día del mes que todavía no pasó: la columna queda
                            // marcada pero vacía, para que la semana se lea
                            // completa de lunes a domingo sin inventar un cero.
                            if (value === null) {
                              return (
                                <div key={celda.date} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                                  <span className="mb-1 text-xs font-semibold text-slate-300">–</span>
                                  <div
                                    className="flex w-full items-end rounded-md border border-dashed border-slate-200 px-1 sm:px-1.5"
                                    style={{ height: "176px" }}
                                    title="Todavía no pasó"
                                  />
                                </div>
                              )
                            }
                            return (
                              <div key={celda.date} className="flex min-w-0 flex-1 flex-col items-center justify-end">
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
                                    className={`w-full rounded-t-md motion-safe:transition-all motion-safe:duration-500 ${isToday ? "bg-amber-500" : "bg-[#204983]"}`}
                                    style={{ height: alto(Math.max(6, (value / maxForWeek) * 168)) }}
                                    title={`${value} paciente${value === 1 ? "" : "s"}${isToday ? " (hoy)" : ""}`}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="mt-2 flex gap-1.5 sm:gap-3">
                          {week.map((celda) => {
                            const dateObj = new Date(`${celda.date}T00:00:00`)
                            const weekday = dateObj.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "")
                            const day = dateObj.toLocaleDateString("es-AR", { day: "2-digit" })
                            const isToday = celda.date === todayKey
                            if (!celda.delMes) {
                              return <div key={celda.date} className="min-w-0 flex-1" aria-hidden="true" />
                            }
                            const futuro = celda.dato === null
                            return (
                              <div
                                key={celda.date}
                                className={`flex min-w-0 flex-1 flex-col items-center leading-tight ${
                                  isToday ? "font-semibold text-[#204983]" : futuro ? "text-slate-300" : "text-slate-500"
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
                </>
              </CarruselDeslizable>
              <button
                type="button"
                onClick={goNewerWeek}
                disabled={weekIndex >= weeks.length - 1}
                aria-label="Semana siguiente"
                className="flex w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-[#204983] disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </section>

        {/* LO QUE ES DE AHORA NO SE MUESTRA DE UN MES CERRADO.
            "Pendientes de carga" es una foto del momento, no algo que haya
            pasado en junio: mostrarlo con un mes viejo elegido haría creer que
            son los pendientes de ese mes. */}
        {!viendoOtroMes && (
        <section
          style={retraso(6)}
          className={`rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5 ${ENTRADA_ABAJO}`}
        >
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
        )}
      </div>

      {/* Lo que quedó sin cerrar de TODAS las fechas: nos deben y tenemos que
          devolver. Va arriba de la caja del día, que cuenta solo lo de hoy. */}
      {canAccessBilling && !viendoOtroMes ? (
        <div className="mt-5">
          <PendienteDelSistema />
        </div>
      ) : null}

      <section
        style={retraso(7)}
        className={`mt-5 rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5 ${ENTRADA_ABAJO}`}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">Caja (pacientes)</h2>
          </div>
          <span className="hidden text-xs text-slate-500 sm:inline">
            {cashWeekIndex === semanaEnCursoCaja
              ? "Semana en curso"
              : `Semana ${cashWeekIndex + 1} de ${cashWeeks.length}`}
            {cashWeekRangeLabel ? ` · ${cashWeekRangeLabel}` : ""}
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-48 w-full rounded-md" />
        ) : (
          <>
            {/* Cobrado por día, una semana de calendario por pantalla */}
            <div className="mb-4 flex items-stretch gap-1 sm:gap-2">
              <button
                type="button"
                onClick={goOlderCashWeek}
                disabled={cashWeekIndex === 0}
                aria-label="Semana anterior"
                className="flex w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-emerald-600 disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <CarruselDeslizable
                ariaLabel="Semanas de caja"
                activo={cashWeekIndex}
                onActivo={(pos) => setCashWeekIndex(pos)}
              >
                <>
                  {cashWeeks.map((week, wIdx) => {
                    const maxCash = Math.max(
                      1,
                      ...week.map((c) => Number.parseFloat(c.dato?.collected || "0")),
                    )
                    return (
                      // Medio hueco a cada lado, igual que en pacientes: los
                      // paneles van pegados y sin esto la barra del borde se
                      // mezcla con la de la semana vecina.
                      <div key={wIdx} className="flex h-40 w-full shrink-0 snap-center flex-col px-[3px] sm:px-1.5">
                        <div className="flex flex-1 items-end gap-1.5 sm:gap-3">
                          {week.map((celda) => {
                            // Relleno de otro mes: ocupa la columna y no se pinta,
                            // así el ancho de barra no cambia entre semanas.
                            if (!celda.delMes) {
                              return <div key={celda.date} className="min-w-0 flex-1" aria-hidden="true" />
                            }
                            const isToday = celda.date === todayKey
                            // Día que todavía no pasó: no hay caja que abrir, así
                            // que no es un botón. Queda la columna marcada.
                            if (celda.dato === null) {
                              return (
                                <div key={celda.date} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                                  <div
                                    className="w-full rounded-md border border-dashed border-slate-200"
                                    style={{ height: "104px" }}
                                    title="Todavía no pasó"
                                  />
                                </div>
                              )
                            }
                            const value = Number.parseFloat(celda.dato.collected || "0")
                            return (
                              <button
                                key={celda.date}
                                type="button"
                                onClick={() => setCajaDelDia(celda.date)}
                                aria-label={`Ver el detalle de la caja del ${celda.date}`}
                                className="group flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-end rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                              >
                                <div
                                  className={`flex w-full items-end rounded-md transition-colors ${isToday ? "bg-amber-100/70 ring-1 ring-amber-300" : "bg-slate-100/80"} group-hover:bg-slate-200/90`}
                                  style={{ height: "104px" }}
                                  title={`${formatMoney(celda.dato.collected)}${isToday ? " (hoy)" : ""} — tocá para ver el detalle`}
                                >
                                  <div
                                    className={`w-full rounded-t-md motion-safe:transition-all motion-safe:duration-500 ${isToday ? "bg-amber-500" : "bg-emerald-500"} group-hover:brightness-110`}
                                    style={{ height: alto(Math.max(4, (value / maxCash) * 100)) }}
                                  />
                                </div>
                              </button>
                            )
                          })}
                        </div>
                        <div className="mt-2 flex gap-1.5 sm:gap-3">
                          {week.map((celda) => {
                            if (!celda.delMes) {
                              return <div key={celda.date} className="min-w-0 flex-1" aria-hidden="true" />
                            }
                            const dateObj = new Date(`${celda.date}T00:00:00`)
                            const weekday = dateObj.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "")
                            const day = dateObj.toLocaleDateString("es-AR", { day: "2-digit" })
                            const isToday = celda.date === todayKey
                            const futuro = celda.dato === null
                            return (
                              <div
                                key={celda.date}
                                className={`flex min-w-0 flex-1 flex-col items-center leading-tight ${
                                  isToday ? "font-semibold text-emerald-700" : futuro ? "text-slate-300" : "text-slate-500"
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
                </>
              </CarruselDeslizable>
              <button
                type="button"
                onClick={goNewerCashWeek}
                disabled={cashWeekIndex >= cashWeeks.length - 1}
                aria-label="Semana siguiente"
                className="flex w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-emerald-600 disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            {/* Dos tarjetas y no tres: acá se cuenta lo de HOY.
                El total pendiente de todas las fechas estaba metido en el medio
                de la caja del día, mezclando dos cosas distintas en la misma
                fila. Ese número vive arriba, en su propia sección. */}
            {!viendoOtroMes && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-medium text-emerald-700">Cobrado hoy</p>
                <p className="mt-1 text-2xl font-bold text-emerald-800 sm:text-lg md:text-xl lg:text-2xl">{formatMoney(cash?.total_paid)}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-600">A cobrar hoy</p>
                <p className="mt-1 text-2xl font-bold text-slate-800 sm:text-lg md:text-xl lg:text-2xl">{formatMoney(cash?.total_due)}</p>
              </div>
              {cashBreakdown && (
                <div className="sm:col-span-2 grid grid-cols-1 gap-1.5 rounded-md bg-slate-50 px-3 py-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
                  <CashBreakdownItem label="Particulares" amount={formatMoney(cashBreakdown.analyses_amount_due)} />
                  <CashBreakdownItem label="Coseguro" amount={formatMoney(cashBreakdown.coseguro)} />
                  <CashBreakdownItem label="Material" amount={formatMoney(cashBreakdown.material_descartable)} />
                  <CashBreakdownItem label="Derivación" amount={formatMoney(cashBreakdown.derivacion)} />
                  <CashBreakdownItem label="Cobros extra" amount={formatMoney(cashBreakdown.unplanned_charges)} />
                  <CashBreakdownItem label="Pagos extra" amount={formatMoney(cashBreakdown.unplanned_payments_today)} />
                </div>
              )}
            </div>
            )}
          </>
        )}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {!viendoOtroMes && (
        <section
          style={retraso(8)}
          className={`rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5 ${ENTRADA_ABAJO}`}
        >
          <div className="mb-4 flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-semibold text-slate-900">Información faltante</h2>
          </div>
          <MetricList items={missingItems} loading={loading} />
        </section>
        )}

        {!viendoOtroMes && (
        <section
          style={retraso(9)}
          className={`rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5 ${ENTRADA_ABAJO}`}
        >
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
        )}

        <section
          style={retraso(10)}
          className={`rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5 ${ENTRADA_ABAJO}`}
        >
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

      <section
        style={retraso(11)}
        className={`mt-5 rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5 ${ENTRADA_ABAJO}`}
      >
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

      {!viendoOtroMes && (
      <section
        style={retraso(12)}
        className={`mt-5 rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5 ${ENTRADA_ABAJO}`}
      >
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
      )}

      {/* El detalle de un día, al tocar su barra en el gráfico de caja. */}
      <CajaDelDia fecha={cajaDelDia} onClose={() => setCajaDelDia(null)} />
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
