import { useState } from "react"

import { BookOpen } from "lucide-react"

import { DataTable, type Column } from "@/components/common/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

  const columnas: Column<Movimiento>[] = [
    {
      id: "momento",
      header: "Fecha",
      className: "w-28 align-top",
      cell: (mov) => {
        const momento = cuando(mov.momento)
        return (
          <div className="text-xs tabular-nums text-gray-500">
            <div className="font-medium text-gray-700">{momento.dia}</div>
            <div>{momento.hora}</div>
          </div>
        )
      },
    },
    {
      id: "origen",
      header: "Protocolo",
      className: "align-top",
      cell: (mov) => (
        <div className="text-sm">
          {mov.protocolo ? (
            <a
              href={`/protocolos/${mov.protocolo}`}
              className="font-medium text-[#204983] underline-offset-2 hover:underline"
            >
              Protocolo {mov.protocolo}
            </a>
          ) : (
            <span className="font-medium text-gray-700">Sin protocolo</span>
          )}
          {mov.usuario ? (
            <div className="text-xs text-gray-500">{mov.usuario}</div>
          ) : null}
        </div>
      ),
    },
    {
      id: "detalle",
      header: "Qué cambió",
      responsive: "hidden md:table-cell",
      className: "align-top",
      cell: (mov) => (
        <ul className="space-y-0.5">
          {mov.cambios.map((cambio, i) => (
            <li key={i} className="text-xs text-gray-600">
              {NOMBRE_DEL_CONCEPTO[cambio.concepto] || cambio.concepto}:{" "}
              <span className="tabular-nums">{plata(cambio.de)}</span>
              {" → "}
              <span className="font-medium tabular-nums text-gray-900">{plata(cambio.a)}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      className: "align-top",
      cell: (mov) => {
        const total = Number.parseFloat(mov.total)
        return (
          <span
            className={`text-sm font-semibold tabular-nums ${
              total >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {total >= 0 ? "+" : ""}
            {plata(mov.total)}
          </span>
        )
      },
    },
  ]

  return (
    <div className="mx-auto w-full max-w-full px-4 py-4">
      <div className="rounded-2xl bg-white/95 p-4 shadow-md backdrop-blur-sm md:p-6">
        {/* Fila superior: título · rango de fechas · atajos.
            Misma caja blanca y mismo esqueleto que Pacientes, Protocolos y
            Facturación. Antes esta pantalla ponía sus cosas sueltas sobre el
            fondo y por eso se leía distinta del resto del sistema. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="lg:w-64 lg:shrink-0">
            <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800 md:text-2xl">
              <BookOpen className="h-5 w-5 text-[#204983]" />
              Libro diario
            </h1>
            <p className="text-sm text-gray-500">
              {movimientos.length > 0
                ? `${movimientos.length} movimientos`
                : "Cada movimiento de plata, en orden"}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Desde</span>
              <Input
                type="date"
                value={desde}
                max={hasta}
                onChange={(e) => setDesde(e.target.value)}
                className="h-9 w-40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Hasta</span>
              <Input
                type="date"
                value={hasta}
                min={desde}
                max={hoyISO()}
                onChange={(e) => setHasta(e.target.value)}
                className="h-9 w-40"
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
        </div>

        {!consulta.isLoading && movimientos.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Resumen titulo="Entró" valor={plata(String(entradas))} tono="entra" />
            <Resumen titulo="Salió" valor={plata(String(salidas))} tono="sale" />
            <Resumen titulo="Neto" valor={plata(String(entradas + salidas))} tono="neto" />
          </div>
        ) : null}

        {consulta.error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            No se pudo traer el libro diario. Probá de nuevo.
          </div>
        ) : (
          <div className="mt-4">
            <DataTable
              columns={columnas}
              rows={movimientos}
              getRowId={(mov) => mov.id}
              isLoading={consulta.isLoading}
              emptyMessage="No hubo movimientos de plata en estas fechas. Probá con un rango más amplio."
            />
          </div>
        )}

        {consulta.data?.hay_mas ? (
          <p className="mt-4 text-center text-xs text-gray-500">
            Hay más movimientos de los que entran en esta pantalla. Acotá las fechas para verlos todos.
          </p>
        ) : null}
      </div>
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
    neto: "text-gray-900",
  }[tono]

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{titulo}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{valor}</div>
    </div>
  )
}
