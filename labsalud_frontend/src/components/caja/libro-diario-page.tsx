import { useState } from "react"

import { Banknote, BookOpen, Landmark, Pencil, Plus, Trash2 } from "lucide-react"

import { DataTable, type Column } from "@/components/common/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ANALYTICS_ENDPOINTS, PROTOCOL_ENDPOINTS } from "@/config/api"
import { useApiQuery } from "@/hooks/use-api-query"
import { BILLING_ENDPOINTS } from "@/config/api"
import useAuth from "@/contexts/auth-context"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { PERMISSIONS } from "@/config/permissions"
import { FormaDePagoDialog } from "@/components/protocolos/components/dialogs/forma-de-pago-dialog"
import { MovimientoDeCajaDialog } from "./movimiento-de-caja-dialog"

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
  /** Del ledger es un número; de un asiento cargado a mano, `caja-<id>`. */
  id: number | string
  momento: string
  protocolo: number | null
  usuario: string
  detalle: string
  cambios: Cambio[]
  total: string
  /** "efectivo" | "transferencia" | "" si no se registró. */
  forma_de_pago: string
  cuenta_de_cobro: string
  /** Para preseleccionar la cuenta al corregir; `null` si pagó en efectivo. */
  cuenta_de_cobro_id?: number | null
  cuenta_alias: string
  /** Solo en los asientos cargados a mano: "gasto" | "ingreso". */
  tipo_de_movimiento?: string
  movimiento_de_caja_id?: number
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
  gasto: "Gasto",
  ingreso: "Ingreso",
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
  const { hasPermission } = useAuth()
  const { apiRequest } = useApi()
  const toastActions = useToast()
  const [desde, setDesde] = useState(haceDias(7))
  const [hasta, setHasta] = useState(hoyISO())
  const [agregando, setAgregando] = useState(false)
  const [corrigiendo, setCorrigiendo] = useState<Movimiento | null>(null)

  // Cargar un gasto y corregir una forma de pago es OPERAR con plata; mirar el
  // libro es otra cosa. El backend contesta 403 sin este permiso, así que los
  // botones tampoco aparecen.
  const puedeOperar = hasPermission(PERMISSIONS.MANAGE_BILLING.codename)

  const consulta = useApiQuery<Respuesta>({
    queryKey: ["analytics", "libro-diario", desde, hasta],
    url: `${ANALYTICS_ENDPOINTS.LIBRO_DIARIO}?desde=${desde}&hasta=${hasta}`,
    staleTime: 30 * 1000,
  })

  const movimientos = consulta.data?.movimientos || []

  const anular = async (id: number) => {
    const respuesta = await apiRequest(BILLING_ENDPOINTS.MOVIMIENTO_DE_CAJA(id), {
      method: "DELETE",
    })
    if (respuesta.ok) {
      toastActions.success("Movimiento anulado")
      consulta.refetch()
      return
    }
    toastActions.error("No se pudo anular el movimiento")
  }

  /**
   * Corregir cómo se cobró un protocolo, sin salir del libro.
   *
   * La forma de pago no es del asiento: es del protocolo. El libro la muestra
   * al lado de cada movimiento porque es lo que se necesita para conciliar,
   * pero el dato vive en un solo lugar. Por eso corregirla acá la corrige en
   * todas las líneas de ese protocolo y en su ficha, que es justamente lo que
   * se quiere cuando se cargó mal: no hay una versión del pago por asiento.
   *
   * Se corrige desde acá porque el error aparece acá. Quien concilia la caja
   * ve una transferencia que el extracto no tiene, y hasta ahora tenía que
   * anotarse el protocolo, buscarlo en otra pantalla y volver.
   */
  const corregirFormaDePago = async (forma: string, cuentaId: string) => {
    const protocolo = corrigiendo?.protocolo
    if (!protocolo) return false

    const respuesta = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOL_DETAIL(protocolo), {
      method: "PATCH",
      body: {
        payment_method: forma,
        // Un efectivo con cuenta lo rechaza el backend, y mandar la vieja
        // guardaría algo que contradice lo que se ve en pantalla.
        payment_account: forma === "transferencia" && cuentaId ? Number(cuentaId) : null,
      },
    })
    if (!respuesta.ok) {
      toastActions.error("No se pudo cambiar la forma de pago")
      return false
    }

    toastActions.success("Forma de pago corregida")
    setCorrigiendo(null)
    consulta.refetch()
    return true
  }

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
          ) : mov.tipo_de_movimiento ? (
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${
                mov.tipo_de_movimiento === "ingreso"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {mov.tipo_de_movimiento === "ingreso" ? "Ingreso" : "Gasto"}
            </span>
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
      id: "pago",
      header: "Cómo pagó",
      className: "align-top",
      cell: (mov) => (
        <div className="flex items-start gap-1.5">
          {mov.forma_de_pago === "transferencia" ? (
            <div className="text-xs">
              <span className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-sky-800">
                <Landmark className="h-3 w-3" />
                Transferencia
              </span>
              {mov.cuenta_de_cobro ? (
                <div className="mt-0.5 text-gray-600">{mov.cuenta_de_cobro}</div>
              ) : null}
              {mov.cuenta_alias ? (
                <div className="font-mono text-[11px] text-gray-400">{mov.cuenta_alias}</div>
              ) : null}
            </div>
          ) : mov.forma_de_pago === "efectivo" ? (
            <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-800">
              <Banknote className="h-3 w-3" />
              Efectivo
            </span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}

          {/* Solo los movimientos de un protocolo: un gasto del laboratorio no
              tiene forma de pago del paciente que corregir. */}
          {puedeOperar && mov.protocolo ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-gray-400 hover:text-[#204983]"
              aria-label={`Corregir la forma de pago del protocolo ${mov.protocolo}`}
              title="Corregir la forma de pago"
              onClick={() => setCorrigiendo(mov)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
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

  if (puedeOperar) {
    // Solo los asientos cargados a mano se pueden anular: los del ledger son
    // el registro de lo que pasó y no se tocan desde acá.
    columnas.push({
      id: "anular",
      header: "",
      align: "right",
      className: "w-10 align-top",
      cell: (mov) =>
        mov.movimiento_de_caja_id ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-rose-600"
            aria-label={`Anular ${mov.detalle}`}
            onClick={() => anular(mov.movimiento_de_caja_id as number)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null,
    })
  }

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

            {puedeOperar ? (
              <Button
                size="sm"
                onClick={() => setAgregando(true)}
                className="bg-[#204983] hover:bg-[#1a3d6f]"
              >
                <Plus className="mr-1 h-4 w-4" />
                Gasto o ingreso
              </Button>
            ) : null}
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

      <MovimientoDeCajaDialog
        open={agregando}
        onOpenChange={setAgregando}
        onGuardado={() => consulta.refetch()}
      />

      <FormaDePagoDialog
        open={corrigiendo !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setCorrigiendo(null)
        }}
        formaDePago={corrigiendo?.forma_de_pago || ""}
        cuentaDeCobroId={
          corrigiendo?.cuenta_de_cobro_id ? String(corrigiendo.cuenta_de_cobro_id) : ""
        }
        onGuardar={corregirFormaDePago}
      />
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
