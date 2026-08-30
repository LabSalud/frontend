"use client"

import { useCallback, useEffect, useState } from "react"
import type React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Activity, AlertTriangle, PauseCircle, RefreshCw, Timer } from "lucide-react"

import { useApiQuery } from "@/hooks/use-api-query"
import { SUPERADMIN_ENDPOINTS } from "@/config/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatUtcDateTime } from "@/lib/format-utils"
import type { SuperadminDashboard } from "@/types"
import { RequestLogPanel } from "./components/request-log-panel"
import { SecurityBlocksPanel } from "./components/security-blocks-panel"

// Mismas pestañas tipo pill que Configuración y Usuarios y permisos.
const TAB_LIST = "mb-6 flex h-auto w-full flex-wrap justify-start gap-2 rounded-none border-0 bg-transparent p-0"
const TAB_TRIGGER =
  "rounded-full border border-transparent bg-transparent px-4 py-1.5 text-sm font-medium text-gray-600 shadow-none transition-colors hover:bg-gray-100 data-[state=active]:border-[#204983] data-[state=active]:bg-[#204983] data-[state=active]:text-white data-[state=active]:shadow-sm"

// Presupuesto de refrescos automáticos. Una pestaña olvidada abierta deja de
// pegarle al servidor sola: después de AUTO_REFRESH_LIMIT ciclos se corta y hay
// que refrescar a mano. Cualquier refresco manual devuelve el presupuesto
// completo.
const AUTO_REFRESH_LIMIT = 5
const AUTO_REFRESH_INTERVAL_MS = 15_000

const WINDOW_OPTIONS = [
  { label: "1 h", hours: 1 },
  { label: "6 h", hours: 6 },
  { label: "24 h", hours: 24 },
  { label: "7 días", hours: 168 },
]

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days} d ${hours} h`
  if (hours > 0) return `${hours} h ${minutes} min`
  return `${minutes} min`
}

/** Los percentiles son la cota superior del bucket: "menos de X ms". */
function formatMs(value: number | null | undefined, prefix = ""): string {
  if (value == null) return "—"
  return `${prefix}${value} ms`
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  hint?: string
  tone?: "default" | "warn" | "danger" | "ok"
}) {
  const toneClass = {
    default: "text-gray-900",
    ok: "text-green-700",
    warn: "text-amber-700",
    danger: "text-red-700",
  }[tone]

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

/** Una sección puede venir con error sin tumbar el resto del panel. */
function SectionError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold text-gray-700">{children}</h2>
}

export default function SuperadminPage() {
  const [hours, setHours] = useState(24)
  const queryClient = useQueryClient()
  const [autoRefreshesLeft, setAutoRefreshesLeft] = useState(AUTO_REFRESH_LIMIT)
  // Cambia en cada refresco manual. Sirve para reagendar el timer aunque el
  // presupuesto ya estuviera lleno: si no, un manual sobre 5/5 no reiniciaba
  // la cuenta regresiva y el ciclo automático caía un segundo después.
  const [cycleToken, setCycleToken] = useState(0)

  const query = useApiQuery<SuperadminDashboard>({
    queryKey: ["superadmin", "dashboard", hours],
    url: SUPERADMIN_ENDPOINTS.DASHBOARD(hours),
  })

  /**
   * Refresca TODO lo que está montado en la página de una sola vez.
   *
   * El presupuesto es uno solo para toda la página, no uno por panel: si cada
   * tabla contara sus propios 5 refrescos, tres paneles abiertos harían 15
   * peticiones y el límite dejaría de significar lo que dice.
   *
   * `type: "active"` deja afuera las queries de pestañas que no están a la
   * vista (Radix desmonta el contenido inactivo), así no se piden datos que
   * nadie está mirando.
   */
  const refreshAll = useCallback(
    () => queryClient.refetchQueries({ queryKey: ["superadmin"], type: "active" }),
    [queryClient],
  )

  const refreshManually = useCallback(async () => {
    setAutoRefreshesLeft(AUTO_REFRESH_LIMIT)
    setCycleToken((token) => token + 1)
    await refreshAll()
  }, [refreshAll])

  // Cadena de timeouts en vez de un interval: cada ciclo se agenda cuando
  // termina el anterior, así una petición lenta no encima la siguiente.
  useEffect(() => {
    if (autoRefreshesLeft <= 0) return

    let cancelled = false
    const timer = window.setTimeout(async () => {
      await refreshAll()
      if (!cancelled) setAutoRefreshesLeft((left) => left - 1)
    }, AUTO_REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [autoRefreshesLeft, cycleToken, refreshAll])

  const autoRefreshPaused = autoRefreshesLeft <= 0
  const data = query.data

  return (
    <div className="w-full overflow-x-hidden py-4">
      <div className="min-w-0 max-w-full rounded-2xl bg-white/95 p-4 shadow-md backdrop-blur-sm md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 md:text-2xl">Superconfiguración</h1>
            <p className="text-sm text-gray-500">
              Estado del sistema y control de bloqueos. Exclusivo para superusuarios.
              {data && ` · Actualizado ${formatUtcDateTime(data.generated_at)}`}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <Button
              variant={autoRefreshPaused ? "default" : "outline"}
              size="sm"
              onClick={refreshManually}
              disabled={query.isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <span className="text-xs text-gray-400">
              {autoRefreshPaused
                ? "actualización automática pausada"
                : `${autoRefreshesLeft} actualización${autoRefreshesLeft === 1 ? "" : "es"} automática${autoRefreshesLeft === 1 ? "" : "s"} restante${autoRefreshesLeft === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>

        {autoRefreshPaused && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            <PauseCircle className="h-4 w-4 shrink-0 text-gray-400" />
            <span>
              Se pausó la actualización automática para no cargar el servidor con la
              página abierta. Tocá <strong>Actualizar</strong> para ver los datos al día
              y reanudar otros {AUTO_REFRESH_LIMIT} ciclos.
            </span>
          </div>
        )}

        {query.isError && (
          <SectionError message={`No se pudo cargar el panel: ${query.error.message}`} />
        )}

        {query.isLoading && (
          <>
            <Skeleton className="mb-6 h-10 w-64 rounded" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          </>
        )}

        {data && (
          <Tabs defaultValue="rendimiento" className="w-full min-w-0">
            <TabsList className={TAB_LIST}>
              <TabsTrigger value="rendimiento" className={TAB_TRIGGER}>
                Rendimiento
              </TabsTrigger>
              <TabsTrigger value="bloqueos" className={TAB_TRIGGER}>
                Bloqueos
                {data.security.active_blocks > 0 && (
                  <span className="ml-1 text-xs opacity-70">{data.security.active_blocks}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="sistema" className={TAB_TRIGGER}>
                Sistema
              </TabsTrigger>
            </TabsList>

            {/* ---------------- Rendimiento ---------------- */}
            <TabsContent value="rendimiento" className="min-w-0 space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Medido en cada petición. Los percentiles son cota superior: "el 95%
                  tardó menos de X ms".
                </p>
                <div className="flex shrink-0 gap-1">
                  {WINDOW_OPTIONS.map((option) => (
                    <Button
                      key={option.hours}
                      size="sm"
                      variant={hours === option.hours ? "default" : "outline"}
                      onClick={() => setHours(option.hours)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {data.requests.error ? (
                <SectionError message={data.requests.error} />
              ) : data.requests.count === 0 ? (
                <p className="rounded-xl border border-gray-200 py-10 text-center text-sm text-gray-500">
                  Todavía no hay mediciones en esta ventana. Se vuelcan una vez por
                  minuto por cada worker.
                </p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat
                      icon={Activity}
                      label="Peticiones"
                      value={data.requests.count.toLocaleString("es-AR")}
                      hint={`${data.requests.workers_reporting} worker(s) reportando`}
                    />
                    <Stat
                      icon={Timer}
                      label="Promedio"
                      value={formatMs(data.requests.avg_ms)}
                      hint={`máximo ${formatMs(data.requests.max_ms)}`}
                    />
                    <Stat
                      icon={Timer}
                      label="p95"
                      value={formatMs(data.requests.p95_ms, "< ")}
                      hint={`p50 ${formatMs(data.requests.p50_ms, "< ")} · p99 ${formatMs(data.requests.p99_ms, "< ")}`}
                    />
                    <Stat
                      icon={AlertTriangle}
                      label="Errores 5xx"
                      value={data.requests.server_errors.toLocaleString("es-AR")}
                      hint={`${data.requests.error_rate}% del total · ${data.requests.client_errors} de 4xx`}
                      tone={data.requests.server_errors > 0 ? "danger" : "ok"}
                    />
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="min-w-0">
                      <SubTitle>Endpoints más lentos</SubTitle>
                      <EndpointTable rows={data.requests.slowest_endpoints} highlight="avg_ms" />
                    </div>
                    <div className="min-w-0">
                      <SubTitle>Endpoints más usados</SubTitle>
                      <EndpointTable rows={data.requests.busiest_endpoints} highlight="count" />
                    </div>
                  </div>
                </>
              )}

              <div className="min-w-0 border-t pt-5">
                <SubTitle>Peticiones en vivo</SubTitle>
                <RequestLogPanel onManualRefresh={refreshManually} />
              </div>
            </TabsContent>

            {/* ---------------- Bloqueos ---------------- */}
            <TabsContent value="bloqueos" className="min-w-0 space-y-5">
              <SecurityBlocksPanel onManualRefresh={refreshManually} />

              {data.security.error ? (
                <SectionError message={data.security.error} />
              ) : (
                <div>
                  <SubTitle>Límites configurados</SubTitle>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat
                      icon={Activity}
                      label="Bloqueos 24 h"
                      value={data.security.blocks_last_24h}
                      hint={`${data.security.released_last_24h} liberados a mano`}
                    />
                    <Stat
                      icon={AlertTriangle}
                      label="Activos ahora"
                      value={data.security.active_blocks}
                      hint={`${data.security.active_ip_blocks} IP · ${data.security.active_account_blocks} cuenta`}
                      tone={data.security.active_blocks > 0 ? "warn" : "ok"}
                    />
                    <Stat
                      icon={Timer}
                      label="Límite por cuenta"
                      value={data.security.config.failed_login_limit ?? "—"}
                      hint={`fallos antes de bloquear ${Math.round((data.security.config.lockout_seconds ?? 0) / 60)} min`}
                    />
                    <Stat
                      icon={Timer}
                      label="Límite por IP"
                      value={data.security.config.failed_login_ip_limit ?? "—"}
                      hint="más alto: una IP puede ser toda una red"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">
                      Throttle login/IP: {data.security.config.throttle_login_ip ?? "—"}
                    </Badge>
                    <Badge variant="secondary">
                      Throttle login/cuenta: {data.security.config.throttle_login_account ?? "—"}
                    </Badge>
                    <Badge variant={data.security.config.num_proxies ? "secondary" : "destructive"}>
                      Proxies confiables: {data.security.config.num_proxies ?? "sin configurar"}
                    </Badge>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ---------------- Sistema ---------------- */}
            <TabsContent value="sistema" className="min-w-0">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="min-w-0">
                  <SubTitle>Servidor</SubTitle>
                  {data.system.error ? (
                    <SectionError message={data.system.error} />
                  ) : (
                    <dl className="space-y-2 rounded-xl border border-gray-200 p-4 text-sm">
                      <Row label="Host" value={data.system.hostname} />
                      <Row label="Sistema" value={data.system.platform} />
                      <Row
                        label="Versiones"
                        value={`Python ${data.system.python_version} · Django ${data.system.django_version}`}
                      />
                      <Row
                        label="Uptime del worker"
                        value={formatUptime(data.system.process_uptime_seconds)}
                      />
                      <Row
                        label="CPU"
                        value={
                          data.system.load_average
                            ? `${data.system.cpu_count} núcleos · carga ${data.system.load_average.join(" / ")}`
                            : `${data.system.cpu_count} núcleos`
                        }
                      />
                      {data.system.memory && (
                        <Row
                          label="Memoria"
                          value={`${data.system.memory.used_percent}% usada de ${formatBytes(data.system.memory.total_bytes)}`}
                          tone={data.system.memory.used_percent > 85 ? "danger" : "default"}
                        />
                      )}
                      {data.system.disk && (
                        <Row
                          label="Disco"
                          value={`${data.system.disk.used_percent}% usado · ${formatBytes(data.system.disk.free_bytes)} libres`}
                          tone={data.system.disk.used_percent > 85 ? "danger" : "default"}
                        />
                      )}
                      <Row
                        label="DEBUG"
                        value={data.system.debug ? "ACTIVADO" : "desactivado"}
                        tone={data.system.debug ? "danger" : "default"}
                      />
                    </dl>
                  )}
                </div>

                <div className="min-w-0 space-y-6">
                  <div>
                    <SubTitle>Base de datos</SubTitle>
                    {data.database.error ? (
                      <SectionError message={data.database.error} />
                    ) : (
                      <dl className="space-y-2 rounded-xl border border-gray-200 p-4 text-sm">
                        <Row label="Motor" value={`${data.database.engine} · ${data.database.name}`} />
                        <Row label="Latencia" value={formatMs(data.database.ping_ms)} />
                        <Row label="Tamaño" value={formatBytes(data.database.size_bytes)} />
                        <Row
                          label="Migraciones pendientes"
                          value={data.database.pending_migrations ?? "—"}
                          tone={(data.database.pending_migrations ?? 0) > 0 ? "danger" : "default"}
                        />
                      </dl>
                    )}
                  </div>

                  <div>
                    <SubTitle>Aplicación</SubTitle>
                    {data.application.error ? (
                      <SectionError message={data.application.error} />
                    ) : (
                      <dl className="space-y-2 rounded-xl border border-gray-200 p-4 text-sm">
                        <Row
                          label="Protocolos"
                          value={`${data.application.protocols_total.toLocaleString("es-AR")} (${data.application.protocols_today} hoy)`}
                        />
                        <Row
                          label="Pacientes"
                          value={data.application.patients_total.toLocaleString("es-AR")}
                        />
                        <Row
                          label="Resultados"
                          value={data.application.results_total.toLocaleString("es-AR")}
                        />
                        <Row
                          label="Usuarios"
                          value={`${data.application.users_active} activos de ${data.application.users_total}`}
                        />
                        <Row
                          label="Eventos de auditoría"
                          value={`${data.application.audit_events_24h.toLocaleString("es-AR")} en 24 h · ${data.application.audit_events_total.toLocaleString("es-AR")} total`}
                        />
                      </dl>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: React.ReactNode
  tone?: "default" | "danger"
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`text-right font-medium ${tone === "danger" ? "text-red-700" : "text-gray-900"}`}>
        {value}
      </dd>
    </div>
  )
}

function EndpointTable({
  rows,
  highlight,
}: {
  rows: { endpoint: string; count: number; avg_ms: number; max_ms: number }[]
  highlight: "avg_ms" | "count"
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">Sin datos.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full min-w-[380px] text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="px-3 py-2 font-medium">Endpoint</th>
            <th className="px-3 py-2 text-right font-medium">N</th>
            <th className="px-3 py-2 text-right font-medium">Prom.</th>
            <th className="px-3 py-2 text-right font-medium">Máx.</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.endpoint}>
              <td className="max-w-0 truncate px-3 py-2 font-mono text-xs" title={row.endpoint}>
                {row.endpoint}
              </td>
              <td className={`px-3 py-2 text-right ${highlight === "count" ? "font-semibold" : ""}`}>
                {row.count.toLocaleString("es-AR")}
              </td>
              <td className={`px-3 py-2 text-right ${highlight === "avg_ms" ? "font-semibold" : ""}`}>
                {row.avg_ms} ms
              </td>
              <td className="px-3 py-2 text-right text-gray-500">{row.max_ms} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
