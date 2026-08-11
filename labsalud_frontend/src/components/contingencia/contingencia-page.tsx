"use client"

// ============================================================================
// CONTINGENCIA — la pantalla desde la que se cierra una caída del servidor
// ============================================================================
// Se abre cuando el servidor vuelve. Muestra qué hizo el laboratorio mientras
// estuvo aislado, sube lo que entra limpio y deja a la vista lo único que no
// puede decidir un programa.
//
// Por qué no es todo automático
// -----------------------------
// La bajada (el servidor -> la PC) sí lo es: copiar lo que el servidor ya
// decidió no tiene ambigüedad. La subida no se parece en nada. Una operación
// puede chocar con algo que pasó mientras la PC estaba aislada, puede referirse
// a algo que nunca subió, o puede ser un envío al paciente que a esta altura ya
// no corresponde mandar.
//
// Subiendo todo a la fuerza, los choques se resolverían pisando datos. Pidiendo
// confirmar todo, nadie confirma cuarenta operaciones una por una y el trabajo
// del día no sube nunca. Se hace lo del medio: sube solo lo que entra limpio, y
// lo que necesita criterio queda acá.

import { useCallback, useMemo, useState } from "react"
import type React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Link2Off,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react"

import { useApi } from "@/hooks/use-api"
import { useApiQuery } from "@/hooks/use-api-query"
import { CONTINGENCY_ENDPOINTS } from "@/config/api"
import { readApiError } from "@/lib/api-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { formatUtcDateTime } from "@/lib/format-utils"
import type {
  DiarioContingencia,
  EstadoOperacionContingencia,
  OperacionContingencia,
  RespuestaSubidaContingencia,
} from "@/types"

const DIARIO_KEY = ["contingencia", "diario"] as const

// Cómo se ve cada estado y, sobre todo, qué tiene que hacer quien mira.
const ESTADOS: Record<
  EstadoOperacionContingencia,
  { etiqueta: string; clase: string; ayuda: string }
> = {
  pendiente: {
    etiqueta: "Pendiente",
    clase: "border-blue-200 bg-blue-50 text-blue-700",
    ayuda: "Va a subir sola en la próxima subida.",
  },
  subida: {
    etiqueta: "Subida",
    clase: "border-green-200 bg-green-50 text-green-700",
    ayuda: "Ya está en el servidor. No hay nada que hacer.",
  },
  retenida: {
    etiqueta: "Esperando confirmación",
    clase: "border-amber-200 bg-amber-50 text-amber-800",
    ayuda:
      "Es un envío al paciente o a ARCA. No sale solo: confirmalo si todavía corresponde mandarlo.",
  },
  conflicto: {
    etiqueta: "Rechazada",
    clase: "border-red-200 bg-red-50 text-red-700",
    ayuda: "El servidor no la aceptó. Mirá el motivo antes de reintentar.",
  },
  bloqueada: {
    etiqueta: "Bloqueada",
    clase: "border-orange-200 bg-orange-50 text-orange-700",
    ayuda: "Depende de otra operación que no subió. Resolvé esa primero.",
  },
  descartada: {
    etiqueta: "Descartada",
    clase: "border-gray-200 bg-gray-50 text-gray-600",
    ayuda: "Quedó fuera a propósito. Se guarda para que el registro esté completo.",
  },
}

function EstadoBadge({ estado }: { estado: EstadoOperacionContingencia }) {
  const config = ESTADOS[estado] ?? ESTADOS.pendiente
  return (
    <Badge variant="outline" className={`shrink-0 ${config.clase}`}>
      {config.etiqueta}
    </Badge>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  tone?: "default" | "ok" | "warn"
}) {
  const toneClass = {
    default: "text-gray-900",
    ok: "text-green-700",
    warn: "text-amber-700",
  }[tone]

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

export default function ContingenciaPage() {
  const { apiRequest } = useApi()
  const queryClient = useQueryClient()

  const [usuario, setUsuario] = useState("")
  const [contrasena, setContrasena] = useState("")
  const [codigo, setCodigo] = useState("")
  // Cuando el servidor pide segundo factor no hay subida todavía: guarda el
  // pase para volver a llamar con el código.
  const [pase, setPase] = useState("")
  const [subiendo, setSubiendo] = useState(false)
  const [operando, setOperando] = useState<number | null>(null)

  const query = useApiQuery<DiarioContingencia>({
    queryKey: DIARIO_KEY,
    url: CONTINGENCY_ENDPOINTS.DIARIO(),
  })

  const diario = query.data
  const resumen = diario?.resumen
  const operaciones = useMemo(() => diario?.operaciones ?? [], [diario])

  const refrescar = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["contingencia"] }),
    [queryClient],
  )

  const limpiarSesion = () => {
    setContrasena("")
    setCodigo("")
    setPase("")
  }

  const subir = async () => {
    setSubiendo(true)
    try {
      const cuerpo = pase
        ? { pase, codigo }
        : { usuario, contrasena }

      const response = await apiRequest(CONTINGENCY_ENDPOINTS.SUBIR(), {
        method: "POST",
        body: JSON.stringify(cuerpo),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response, "No se pudo subir"))
      }

      const datos = (await response.json()) as RespuestaSubidaContingencia

      if (datos.two_factor_required) {
        setPase(datos.pase ?? "")
        toast.info("El servidor pide el segundo factor", {
          description: "Escribí el código de tu app y volvé a apretar Subir.",
        })
        return
      }

      limpiarSesion()
      const subidas = datos.subidas ?? 0
      const conProblema = datos.con_problema ?? 0

      if (conProblema > 0) {
        toast.warning(`Subieron ${subidas}, quedaron ${conProblema} para revisar`, {
          description: "Mirá la lista de abajo: cada una dice qué le pasó.",
        })
      } else {
        toast.success(
          subidas > 0
            ? `Se subieron ${subidas} operaciones`
            : "No había nada pendiente de subir",
        )
      }
      await refrescar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir")
    } finally {
      setSubiendo(false)
    }
  }

  const accionar = async (
    operacion: OperacionContingencia,
    accion: "reintentar" | "descartar" | "confirmar",
  ) => {
    setOperando(operacion.id)
    try {
      const response = await apiRequest(
        CONTINGENCY_ENDPOINTS.OPERACION(operacion.id, accion),
        { method: "POST" },
      )
      if (!response.ok) {
        throw new Error(await readApiError(response, "No se pudo actualizar"))
      }
      const mensajes = {
        reintentar: "Va a volver a intentarse en la próxima subida.",
        descartar: "Queda registrada como descartada.",
        confirmar: "El envío se va a hacer desde el servidor en la próxima subida.",
      }
      toast.success(`Operación #${operacion.id}`, { description: mensajes[accion] })
      await refrescar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar")
    } finally {
      setOperando(null)
    }
  }

  const necesitanAtencion = resumen?.necesitan_atencion ?? 0
  const pendientes = resumen?.pendientes ?? 0
  const puedeSubir = pase ? codigo.trim().length > 0 : usuario.trim() !== "" && contrasena !== ""

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 py-4">
      <div className="min-w-0 max-w-full rounded-2xl bg-white/95 p-4 shadow-md backdrop-blur-sm md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 md:text-2xl">Contingencia</h1>
            <p className="text-sm text-gray-500">
              El trabajo que quedó en esta PC mientras el servidor estuvo caído.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refrescar()}
            disabled={query.isFetching}
            className="shrink-0"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {query.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {query.isError && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              No se pudo leer el diario de contingencia. Si esta no es la PC de
              contingencia, es lo esperable.
            </span>
          </div>
        )}

        {diario && resumen && (
          <>
            {/* El único número que dice si la caída se puede dar por cerrada. */}
            {resumen.total === 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">No hay nada anotado.</p>
                  <p className="mt-0.5 text-green-700">
                    Esta PC no atendió ninguna caída, así que no hay nada que devolverle
                    al servidor.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Stat icon={CloudUpload} label="Anotadas" value={resumen.total} />
                <Stat
                  icon={Send}
                  label="Esperando subir"
                  value={pendientes}
                  tone={pendientes > 0 ? "warn" : "ok"}
                />
                <Stat
                  icon={AlertTriangle}
                  label="Necesitan tu decisión"
                  value={necesitanAtencion}
                  tone={necesitanAtencion > 0 ? "warn" : "ok"}
                />
              </div>
            )}

            {pendientes > 0 && (
              <div className="mt-5 rounded-xl border border-gray-200 p-4">
                <h2 className="mb-1 text-sm font-semibold text-gray-700">
                  Subir al servidor
                </h2>
                <p className="mb-3 text-sm text-gray-500">
                  Entrá con tu usuario del servidor. Las operaciones se van a registrar
                  a nombre de quien las hizo en esta PC, no del tuyo — tu sesión es solo
                  la autorización para subirlas.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  {pase ? (
                    <div className="w-full sm:max-w-[200px]">
                      <Label htmlFor="codigo-2fa">Código del segundo factor</Label>
                      <Input
                        id="codigo-2fa"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="w-full sm:max-w-[220px]">
                        <Label htmlFor="usuario-subida">Usuario</Label>
                        <Input
                          id="usuario-subida"
                          value={usuario}
                          onChange={(e) => setUsuario(e.target.value)}
                          autoComplete="username"
                        />
                      </div>
                      <div className="w-full sm:max-w-[220px]">
                        <Label htmlFor="contrasena-subida">Contraseña</Label>
                        <Input
                          id="contrasena-subida"
                          type="password"
                          value={contrasena}
                          onChange={(e) => setContrasena(e.target.value)}
                          autoComplete="current-password"
                        />
                      </div>
                    </>
                  )}
                  <Button onClick={subir} disabled={subiendo || !puedeSubir}>
                    <CloudUpload className={`mr-2 h-4 w-4 ${subiendo ? "animate-pulse" : ""}`} />
                    {subiendo ? "Subiendo…" : `Subir ${pendientes}`}
                  </Button>
                </div>
              </div>
            )}

            {operaciones.length > 0 && (
              <div className="mt-5">
                <h2 className="mb-3 text-sm font-semibold text-gray-700">
                  Todo lo que se hizo durante la caída
                </h2>
                <div className="space-y-2">
                  {operaciones.map((operacion) => {
                    const config = ESTADOS[operacion.estado] ?? ESTADOS.pendiente
                    return (
                      <div
                        key={operacion.id}
                        className={`rounded-xl border p-3 ${
                          operacion.necesita_atencion
                            ? "border-amber-200 bg-amber-50/40"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs text-gray-400">
                                #{operacion.id}
                              </span>
                              <EstadoBadge estado={operacion.estado} />
                              <span className="truncate text-sm font-medium text-gray-800">
                                {operacion.resumen || `${operacion.metodo} ${operacion.ruta}`}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              {operacion.usuario || "sin usuario"}
                              {operacion.ocurrida_at &&
                                ` · ${formatUtcDateTime(operacion.ocurrida_at)}`}
                              {operacion.intentos > 0 && ` · ${operacion.intentos} intentos`}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">{config.ayuda}</p>
                            {operacion.ultimo_error && (
                              <p className="mt-1 break-words text-xs text-red-600">
                                {operacion.ultimo_error}
                              </p>
                            )}
                          </div>

                          {operacion.estado !== "subida" && (
                            <div className="flex shrink-0 flex-wrap gap-2">
                              {operacion.estado === "retenida" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={operando === operacion.id}
                                  onClick={() => accionar(operacion, "confirmar")}
                                >
                                  <Send className="mr-1.5 h-3.5 w-3.5" />
                                  Confirmar envío
                                </Button>
                              )}
                              {(operacion.estado === "conflicto" ||
                                operacion.estado === "bloqueada" ||
                                operacion.estado === "descartada") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={operando === operacion.id}
                                  onClick={() => accionar(operacion, "reintentar")}
                                >
                                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                  Reintentar
                                </Button>
                              )}
                              {operacion.estado !== "descartada" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-gray-600 hover:text-red-700"
                                  disabled={operando === operacion.id}
                                  onClick={() => accionar(operacion, "descartar")}
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Descartar
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {necesitanAtencion > 0 && (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <Link2Off className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Mientras queden operaciones sin resolver, la caída no está cerrada:
                  hay trabajo que existe en esta PC y no en el servidor.
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
