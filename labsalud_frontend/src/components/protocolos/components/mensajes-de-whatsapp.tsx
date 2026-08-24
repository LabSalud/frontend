"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Check, CheckCheck, Clock, Loader2, MessageCircle, RefreshCw, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { REPORTING_ENDPOINTS } from "@/config/api"
import { useApi } from "@/hooks/use-api"
import { cn } from "@/lib/utils"

/**
 * Qué se le mandó al paciente por WhatsApp, y qué pasó con cada mensaje.
 *
 * POR QUÉ NO ALCANZA CON "SE ENVIÓ"
 * =================================
 * Mandar un informe termina cuando Meta contesta «lo recibí», y eso no es que
 * haya llegado: un mensaje aceptado puede fallar después —número que no tiene
 * WhatsApp, usuario que bloqueó, template rechazado— y hasta ahora el sistema
 * lo seguía mostrando como enviado. El webhook viene guardando el desenlace
 * desde hace rato, pero quedaba en la base y en el log del servidor: quien
 * atiende el mostrador no lo veía.
 *
 * Y POR QUÉ CADA MENSAJE DICE QUÉ LLEVABA
 * =======================================
 * Un protocolo se manda por partes: sale lo que está listo y el resto va
 * cuando se carga. "Entregado" a secas no dice qué recibió el paciente. Lo que
 * hay que poder contestar en el mostrador es «¿le llegó la glucemia?».
 */

type AnalisisDelMensaje = { analysis_id: number | null; code: string; name: string }

type Mensaje = {
  id: number
  to_phone: string
  kind: string
  status: string
  status_display: string
  error_code: string
  error_message: string
  sent_at: string
  del_unificado: boolean
  analyses: AnalisisDelMensaje[]
}

type Respuesta = { messages: Mensaje[]; pendientes: AnalisisDelMensaje[] }

const ESTILO: Record<string, { chip: string; icono: typeof Check }> = {
  aceptado: { chip: "border-gray-200 bg-gray-50 text-gray-700", icono: Clock },
  enviado: { chip: "border-sky-200 bg-sky-50 text-sky-800", icono: Check },
  entregado: { chip: "border-emerald-200 bg-emerald-50 text-emerald-800", icono: CheckCheck },
  leido: { chip: "border-violet-200 bg-violet-50 text-violet-800", icono: CheckCheck },
  fallado: { chip: "border-red-200 bg-red-50 text-red-800", icono: X },
}

function cuando(iso: string) {
  const fecha = new Date(iso)
  return fecha.toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export function MensajesDeWhatsApp({ protocolId }: { protocolId: number }) {
  const { apiRequest } = useApi()
  const [datos, setDatos] = useState<Respuesta | null>(null)
  const [cargando, setCargando] = useState(true)

  const traer = useCallback(async () => {
    setCargando(true)
    try {
      const respuesta = await apiRequest(REPORTING_ENDPOINTS.WHATSAPP_DEL_PROTOCOLO(protocolId))
      if (respuesta.ok) setDatos(await respuesta.json())
    } finally {
      setCargando(false)
    }
  }, [apiRequest, protocolId])

  useEffect(() => {
    traer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocolId])

  const mensajes = datos?.messages ?? []
  const pendientes = datos?.pendientes ?? []

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-800">
          <MessageCircle className="h-5 w-5 text-[#204983]" />
          Envíos por WhatsApp
        </h2>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-[#204983]"
          onClick={traer}
          disabled={cargando}
        >
          <RefreshCw className={cn("mr-1 h-3.5 w-3.5", cargando && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {cargando && !datos ? (
        <p className="flex items-center gap-2 py-3 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando...
        </p>
      ) : (
        <div className="space-y-2">
          {mensajes.length === 0 && (
            <p className="py-3 text-sm text-gray-500">
              Todavía no se envió nada por WhatsApp de este protocolo.
            </p>
          )}

          {mensajes.map((mensaje) => {
            const estilo = ESTILO[mensaje.status] ?? ESTILO.aceptado
            const Icono = estilo.icono
            return (
              <div key={mensaje.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("gap-1 font-normal", estilo.chip)}>
                      <Icono className="h-3.5 w-3.5" />
                      {mensaje.status_display}
                    </Badge>
                    <span className="text-sm text-gray-700">{cuando(mensaje.sent_at)}</span>
                    <span className="text-xs text-gray-500">a {mensaje.to_phone}</span>
                    {mensaje.del_unificado && (
                      <Badge variant="outline" className="text-[10px] font-normal text-gray-600">
                        informe unificado
                      </Badge>
                    )}
                  </div>
                </div>

                {/* EL MOTIVO, NO SOLO "FALLÓ".
                    Sin esto hay que entrar al servidor para saber si el número
                    no tiene WhatsApp o si el paciente bloqueó al laboratorio,
                    que se resuelven de maneras distintas. */}
                {mensaje.status === "fallado" && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-md bg-red-50 p-2 text-xs text-red-800">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {mensaje.error_message || "Meta no informó el motivo."}
                      {mensaje.error_code ? ` (código ${mensaje.error_code})` : ""}
                      {" — el paciente NO lo recibió."}
                    </span>
                  </p>
                )}

                {mensaje.analyses.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {mensaje.analyses.map((analisis) => (
                      <span
                        key={`${mensaje.id}-${analisis.analysis_id}-${analisis.code}`}
                        className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700"
                      >
                        <span className="font-mono text-[10px] text-gray-500">{analisis.code}</span>{" "}
                        {analisis.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  // Los mensajes anteriores a que esto existiera no tienen la
                  // anotación. Decirlo es mejor que mostrar un hueco.
                  <p className="mt-2 text-xs text-gray-400">
                    Sin detalle de qué análisis llevaba.
                  </p>
                )}
              </div>
            )
          })}

          {/* LO QUE TODAVÍA NO SALIÓ.
              Sale del protocolo y no de restarle los mensajes: un análisis
              también se entrega en mano o por mail, y ahí el paciente lo tiene
              aunque no haya ningún WhatsApp que lo diga. */}
          {pendientes.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">
                Sin marcar como entregado ({pendientes.length})
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {pendientes.map((analisis) => (
                  <span
                    key={`pendiente-${analisis.analysis_id}`}
                    className="rounded-md border border-amber-200 bg-white px-2 py-0.5 text-xs text-amber-900"
                  >
                    <span className="font-mono text-[10px] text-amber-700">{analisis.code}</span>{" "}
                    {analisis.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
