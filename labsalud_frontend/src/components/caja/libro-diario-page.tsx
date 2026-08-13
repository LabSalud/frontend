import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ANALYTICS_ENDPOINTS } from "@/config/api"
import { useApiQuery } from "@/hooks/use-api-query"

/**
 * El libro diario: cada movimiento de plata del sistema, en orden.
 *
 * Se arma del ledger de auditoría, no de una tabla propia. Por eso el libro
 * nace con TODO lo que ya pasó en vez de empezar vacío el día que se escribió
 * esta pantalla, y por eso no hace falta que nadie se acuerde de registrar un
 * movimiento: si tocó plata, el ledger ya lo tiene.
 */

type Cambio = { concepto: string; de: string; a: string; delta: string }

type Movimiento = {
  id: number
  momento: string
  protocolo: number | null
  usuario: string
  detalle: string
  cambios: Cambio[]
  total: string
}

type Respuesta = {
  movimientos: Movimiento[]
  hay_mas: boolean
  desde: string | null
  hasta: string | null
}

// Los nombres de campo del modelo no son los del mostrador. Nadie dice
// "value_paid": dice "cobrado al paciente".
const NOMBRE_DEL_CONCEPTO: Record<string, string> = {
  value_paid: "Cobrado al paciente",
  coseguro_amount: "Coseguro",
  material_descartable_amount: "Material descartable",
  derivacion_amount: "Derivación",
  amount_to_return: "A devolver",
}

const plata = (valor: string) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(Number.parseFloat(valor || "0"))

const cuando = (iso: string) => {
  const fecha = new Date(iso)
  return {
    dia: fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    hora: fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
  }
}

const hoyISO = () => {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, "0")
  const dia = String(ahora.getDate()).padStart(2, "0")
  return `${ahora.getFullYear()}-${mes}-${dia}`
}

const haceDias = (dias: number) => {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - dias)
  const mes = String(fecha.getMonth() + 1).padStart(2, "0")
  const dia = String(fecha.getDate()).padStart(2, "0")
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

export default function LibroDiarioPage() {
  const [desde, setDesde] = useState(haceDias(7))
  const [hasta, setHasta] = useState(hoyISO())

  const consulta = useApiQuery<Respuesta>({
    queryKey: ["analytics", "libro-diario", desde, hasta],
    url: `${ANALYTICS_ENDPOINTS.LIBRO_DIARIO}?desde=${desde}&hasta=${hasta}`,
    staleTime: 30 * 1000,
  })

  const movimientos = consulta.data?.movimientos || []

  // El neto del período, para no tener que sumar a mano lo que ya está en
  // pantalla. Entradas y salidas por separado: un neto de cero puede ser "no
  // pasó nada" o "entraron cien mil y salieron cien mil", y no son lo mismo.
  const entradas = movimientos
    .map((m) => Number.parseFloat(m.total))
    .filter((n) => n > 0)
    .reduce((a, b) => a + b, 0)
  const salidas = movimientos
    .map((m) => Number.parseFloat(m.total))
    .filter((n) => n < 0)
    .reduce((a, b) => a + b, 0)

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Libro diario</h1>
        <p className="mt-1 text-sm text-slate-600">
          Cada movimiento de plata del sistema, en orden. Se actualiza solo.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Desde</span>
          <Input
            type="date"
            value={desde}
            max={hasta}
            onChange={(e) => setDesde(e.target.value)}
            className="w-40"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Hasta</span>
          <Input
            type="date"
            value={hasta}
            min={desde}
            max={hoyISO()}
            onChange={(e) => setHasta(e.target.value)}
            className="w-40"
          />
        </label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDesde(hoyISO())
              setHasta(hoyISO())
            }}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDesde(haceDias(30))
              setHasta(hoyISO())
            }}
          >
            Último mes
          </Button>
        </div>
      </div>

      {!consulta.isLoading && movimientos.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Resumen titulo="Entró" valor={plata(String(entradas))} tono="entra" />
          <Resumen titulo="Salió" valor={plata(String(salidas))} tono="sale" />
          <Resumen titulo="Neto" valor={plata(String(entradas + salidas))} tono="neto" />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {consulta.isLoading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : consulta.error ? (
          <div className="p-8 text-center text-sm text-rose-700">
            No se pudo traer el libro diario. Probá de nuevo.
          </div>
        ) : movimientos.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              No hubo movimientos de plata en estas fechas.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Probá con un rango más amplio.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {movimientos.map((mov) => {
              const momento = cuando(mov.momento)
              const total = Number.parseFloat(mov.total)
              return (
                <li key={mov.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 p-4">
                  <div className="w-20 shrink-0 text-xs tabular-nums text-slate-500">
                    <div>{momento.dia}</div>
                    <div>{momento.hora}</div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 text-sm">
                      {mov.protocolo ? (
                        <a
                          href={`/protocolos/${mov.protocolo}`}
                          className="font-medium text-sky-700 underline-offset-2 hover:underline"
                        >
                          Protocolo {mov.protocolo}
                        </a>
                      ) : (
                        <span className="font-medium text-slate-700">Sin protocolo</span>
                      )}
                      {mov.usuario ? (
                        <span className="text-slate-500">· {mov.usuario}</span>
                      ) : null}
                    </div>

                    <ul className="mt-1 space-y-0.5">
                      {mov.cambios.map((cambio, i) => (
                        <li key={i} className="text-xs text-slate-600">
                          {NOMBRE_DEL_CONCEPTO[cambio.concepto] || cambio.concepto}:{" "}
                          <span className="tabular-nums">{plata(cambio.de)}</span> →{" "}
                          <span className="tabular-nums font-medium">{plata(cambio.a)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div
                    className={`shrink-0 text-base font-semibold tabular-nums ${
                      total >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {total >= 0 ? "+" : ""}
                    {plata(mov.total)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {consulta.data?.hay_mas ? (
        <p className="text-center text-xs text-slate-500">
          Hay más movimientos de los que entran en esta pantalla. Acotá las fechas para verlos todos.
        </p>
      ) : null}
    </div>
  )
}

function Resumen({
  titulo,
  valor,
  tono,
}: {
  titulo: string
  valor: string
  tono: "entra" | "sale" | "neto"
}) {
  const color = {
    entra: "text-emerald-700",
    sale: "text-rose-700",
    neto: "text-slate-900",
  }[tono]

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{valor}</div>
    </div>
  )
}
