import { Link } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { ANALYTICS_ENDPOINTS } from "@/config/api"
import { useApiQuery } from "@/hooks/use-api-query"

/**
 * Cuánta plata hay dando vueltas, en las dos direcciones.
 *
 * Las dos direcciones importan por igual y no se compensan solas: que el neto
 * sea chico no significa que no haya nada que hacer. Cien mil que deben y cien
 * mil que hay que devolver dan cero, y son doscientas mil de trabajo pendiente
 * en dos mostradores distintos.
 *
 * Sale de dos campos que cada protocolo ya mantiene al día, así que es una sola
 * consulta agregada — por eso puede vivir en el inicio sin hacerlo lento.
 */

type Pendiente = {
  pacientes_deben: string
  protocolos_con_deuda: number
  lab_debe_devolver: string
  protocolos_con_devolucion: number
  neto_a_favor: string
}

const plata = (valor?: string) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number.parseFloat(valor || "0"))

export default function PendienteDelSistema() {
  const consulta = useApiQuery<Pendiente>({
    queryKey: ["analytics", "pendiente"],
    url: ANALYTICS_ENDPOINTS.PENDIENTE,
    staleTime: 60 * 1000,
  })

  const datos = consulta.data

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-900">Pendiente del sistema</h2>
          <p className="text-xs text-slate-500">Todo lo que quedó sin saldar, de todas las fechas</p>
        </div>
        <Link
          to="/libro-diario"
          className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-sky-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          Ver el libro diario
        </Link>
      </div>

      {consulta.isLoading ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : consulta.error ? (
        <p className="mt-4 text-sm text-rose-700">No se pudo traer el pendiente.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Cifra
            titulo="Nos deben"
            valor={plata(datos?.pacientes_deben)}
            nota={`${datos?.protocolos_con_deuda ?? 0} protocolo${datos?.protocolos_con_deuda === 1 ? "" : "s"}`}
            tono="entra"
          />
          {/*
            Esto no estaba en ningún lado. Es plata que el laboratorio tiene y
            no es suya: sin verla, nadie devuelve nada hasta que el paciente
            vuelve a reclamar.
          */}
          <Cifra
            titulo="Debemos devolver"
            valor={plata(datos?.lab_debe_devolver)}
            nota={`${datos?.protocolos_con_devolucion ?? 0} protocolo${datos?.protocolos_con_devolucion === 1 ? "" : "s"}`}
            tono="sale"
          />
          <Cifra
            titulo="Neto a favor"
            valor={plata(datos?.neto_a_favor)}
            nota="La diferencia entre las dos"
            tono="neto"
          />
        </div>
      )}
    </section>
  )
}

function Cifra({
  titulo,
  valor,
  nota,
  tono,
}: {
  titulo: string
  valor: string
  nota: string
  tono: "entra" | "sale" | "neto"
}) {
  const estilo = {
    entra: "border-emerald-200 bg-emerald-50/60 text-emerald-800",
    sale: "border-rose-200 bg-rose-50/60 text-rose-800",
    neto: "border-slate-200 bg-slate-50 text-slate-900",
  }[tono]

  return (
    <div className={`rounded-lg border p-3 ${estilo}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-80">{titulo}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums sm:text-2xl">{valor}</div>
      <div className="text-xs opacity-70">{nota}</div>
    </div>
  )
}
