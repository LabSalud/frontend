import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CONTINGENCY_ENDPOINTS } from "@/config/api"
import { useApi } from "@/hooks/use-api"
import { useApiQuery } from "@/hooks/use-api-query"
import { readApiError } from "@/lib/api-error"

/**
 * Lo que quedó de una caída y necesita que alguien decida.
 *
 * POR QUÉ SE VE DESDE LA PÁGINA
 * =============================
 * Antes esto salía de la base de la PC de contingencia. Y la aplicación de
 * escritorio solo da acceso al sistema MIENTRAS el servidor está caído: la
 * pantalla donde se resuelve lo que pasó durante una caída quedaba accesible
 * únicamente en el momento en que todavía no se puede resolver nada.
 *
 * Con el servidor de vuelta había que desenchufar el cable de red para entrar.
 * Eso sirve como prueba y no puede ser el procedimiento del laboratorio.
 *
 * Ahora la PC lo reporta al servidor y se resuelve desde acá — que es donde
 * está la persona, y donde hay internet para que un envío salga de verdad.
 */

type Pendiente = {
  id: number
  tipo: string
  tipo_texto: string
  resumen: string
  motivo: string
  usuario: string
  metodo: string
  ruta: string
  ocurrida_at: string
  estado: string
  resultado: string
  pc: string
}

const cuando = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

export default function PendientesDelServidor() {
  const { apiRequest } = useApi()
  const queryClient = useQueryClient()
  const [operando, setOperando] = useState<number | null>(null)

  const query = useApiQuery<{ pendientes: Pendiente[] }>({
    queryKey: ["contingencia", "pendientes"],
    url: CONTINGENCY_ENDPOINTS.PENDIENTES(),
    staleTime: 15 * 1000,
  })

  const refrescar = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["contingencia", "pendientes"] }),
    [queryClient],
  )

  const resolver = async (pendiente: Pendiente, accion: "confirmar" | "descartar") => {
    setOperando(pendiente.id)
    try {
      const respuesta = await apiRequest(
        CONTINGENCY_ENDPOINTS.RESOLVER(pendiente.id, accion),
        { method: "POST" },
      )
      const datos = await respuesta.json().catch(() => ({}))

      if (!respuesta.ok) {
        throw new Error(
          datos.detail || (await readApiError(respuesta, "No se pudo resolver")),
        )
      }

      toast.success(
        accion === "confirmar" ? "Enviado." : "Descartado.",
        { description: accion === "confirmar" ? datos.pendiente?.resultado : undefined },
      )
      void refrescar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo resolver")
    } finally {
      setOperando(null)
    }
  }

  const pendientes = query.data?.pendientes ?? []

  if (query.isLoading) {
    return <Skeleton className="h-28 w-full rounded-lg" />
  }

  // Sin nada esperando no se muestra la sección. Un cartel de "no hay nada" en
  // una pantalla que ya tiene otras cosas es ruido: lo que importa es que se
  // vea cuando SÍ hay algo.
  if (pendientes.length === 0) return null

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
      <header className="mb-3">
        <h2 className="text-base font-semibold text-amber-900">
          Quedó esperando una decisión ({pendientes.length})
        </h2>
        <p className="text-sm text-amber-800">
          De cuando el servidor estuvo caído. Se resuelve desde acá.
        </p>
      </header>

      <ul className="space-y-3">
        {pendientes.map((pendiente) => (
          <li
            key={pendiente.id}
            className="rounded-md border border-amber-200 bg-white p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {pendiente.resumen || `${pendiente.metodo} ${pendiente.ruta}`}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {pendiente.tipo_texto} · {cuando(pendiente.ocurrida_at)}
                  {pendiente.usuario ? ` · lo hizo ${pendiente.usuario}` : ""}
                  {pendiente.pc ? ` · ${pendiente.pc}` : ""}
                </p>
                {pendiente.motivo ? (
                  <p className="mt-1 text-xs text-slate-500">{pendiente.motivo}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={operando === pendiente.id}
                  onClick={() => resolver(pendiente, "descartar")}
                >
                  Descartar
                </Button>
                <Button
                  size="sm"
                  disabled={operando === pendiente.id}
                  onClick={() => resolver(pendiente, "confirmar")}
                >
                  {pendiente.tipo === "envio" ? "Enviar ahora" : "Reintentar"}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
