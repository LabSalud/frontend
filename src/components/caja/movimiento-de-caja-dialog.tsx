"use client"

import { useEffect, useState } from "react"
import { Loader2, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormaDePago } from "@/components/common/forma-de-pago"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BILLING_ENDPOINTS, USER_ENDPOINTS } from "@/config/api"
import useAuth from "@/contexts/auth-context"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { formatApiError, getErrorMessage } from "@/lib/api-error"

/**
 * Cargar un gasto o un ingreso que no pasa por ningún protocolo.
 *
 * Comprar reactivos, pagar el gas, cobrar un alquiler. Antes esto no entraba
 * al sistema: el libro diario mostraba cada peso que movió un paciente y
 * ninguno de los que movió el laboratorio, y quien cerraba la caja los llevaba
 * aparte en un papel.
 *
 * QUIÉN LO HIZO NO ES SIEMPRE QUIEN LO CARGA
 * ==========================================
 * Arranca en quien está usando el sistema, porque es el caso normal, pero se
 * puede cambiar: la secretaria anota el gasto que hizo la bioquímica. Quién lo
 * cargó lo guarda el backend por su cuenta y no se elige.
 */

type Persona = { id: number; username: string; first_name: string; last_name: string }

const nombreDe = (p: Persona) =>
  `${p.first_name} ${p.last_name}`.trim() || p.username

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Se llama cuando el movimiento quedó guardado, para refrescar el libro. */
  onGuardado: () => void
}

export function MovimientoDeCajaDialog({ open, onOpenChange, onGuardado }: Props) {
  const { user } = useAuth()
  const { apiRequest } = useApi()
  const toastActions = useToast()

  const [tipo, setTipo] = useState("gasto")
  const [descripcion, setDescripcion] = useState("")
  const [monto, setMonto] = useState("")
  const [usuarioId, setUsuarioId] = useState("")
  // De dónde sale el gasto o a dónde entra el ingreso. Obligatorio: sin esto,
  // el arqueo del efectivo y el saldo del banco no se pueden cuadrar contra el
  // libro — el movimiento podía haber sido cualquiera de los dos.
  const [formaDePago, setFormaDePago] = useState("")
  const [cuentaId, setCuentaId] = useState("")
  const [personas, setPersonas] = useState<Persona[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  // Al abrir se limpia todo y el "lo hizo" vuelve a arrancar en uno mismo: si
  // quedara el de la carga anterior, el segundo gasto del día se le anotaría a
  // otra persona sin que nadie lo note.
  useEffect(() => {
    if (!open) return
    setTipo("gasto")
    setDescripcion("")
    setMonto("")
    setFormaDePago("")
    setCuentaId("")
    setUsuarioId(user?.id ? String(user.id) : "")
    setError("")
  }, [open, user?.id])

  useEffect(() => {
    if (!open) return
    let vigente = true
    apiRequest(`${USER_ENDPOINTS.USERS}?is_active=true&limit=200`)
      .then((r) => (r.ok ? r.json() : null))
      .then((datos) => {
        if (!vigente || !datos) return
        setPersonas(datos.results || datos || [])
      })
      .catch(() => {
        // Sin la lista igual se puede cargar: queda a nombre de uno mismo.
      })
    return () => {
      vigente = false
    }
  }, [open, apiRequest])

  const montoValido = Number.parseFloat(monto.replace(",", ".")) > 0
  const pagoCompleto =
    formaDePago === "efectivo" || (formaDePago === "transferencia" && !!cuentaId)
  const puedeGuardar =
    descripcion.trim().length > 0 && montoValido && pagoCompleto && !guardando

  const guardar = async () => {
    if (!puedeGuardar) return
    setGuardando(true)
    setError("")
    try {
      const respuesta = await apiRequest(BILLING_ENDPOINTS.MOVIMIENTOS_DE_CAJA, {
        method: "POST",
        body: {
          tipo,
          descripcion: descripcion.trim(),
          monto: monto.replace(",", "."),
          payment_method: formaDePago,
          payment_account: formaDePago === "transferencia" && cuentaId ? Number(cuentaId) : null,
          ...(usuarioId ? { usuario: Number(usuarioId) } : {}),
        },
      })

      if (respuesta.ok) {
        toastActions.success(tipo === "gasto" ? "Gasto registrado" : "Ingreso registrado", {
          description: descripcion.trim(),
        })
        onGuardado()
        onOpenChange(false)
        return
      }

      const datos = await respuesta.json().catch(() => ({}))
      setError(formatApiError(datos, "No se pudo registrar el movimiento."))
    } catch (e) {
      setError(getErrorMessage(e, "Ocurrió un error de red o servidor."))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar gasto o ingreso</DialogTitle>
          <DialogDescription>
            Plata que entra o sale del laboratorio y no pasa por ningún protocolo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm">Tipo</Label>
            {/* Dos botones y no un desplegable: son dos opciones y la
                diferencia entre ellas es el signo de la plata. */}
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { valor: "gasto", texto: "Gasto", clase: "border-rose-300 bg-rose-50 text-rose-800" },
                  { valor: "ingreso", texto: "Ingreso", clase: "border-emerald-300 bg-emerald-50 text-emerald-800" },
                ] as const
              ).map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => setTipo(opcion.valor)}
                  disabled={guardando}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    tipo === opcion.valor
                      ? opcion.clase
                      : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {opcion.texto}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="movimiento-descripcion" className="text-sm">
              Descripción *
            </Label>
            <Input
              id="movimiento-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="ej: reactivos de hematología"
              maxLength={200}
              disabled={guardando}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="movimiento-monto" className="text-sm">
              Monto *
            </Label>
            <Input
              id="movimiento-monto"
              type="text"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") guardar()
              }}
              placeholder="0,00"
              disabled={guardando}
              className="tabular-nums"
            />
            <p className="text-xs text-gray-500">
              Siempre positivo: el signo lo pone el tipo.
            </p>
          </div>

          {/* Un gasto sale del cajón o de una cuenta, y un ingreso entra a uno
              de los dos. Sin decir cuál, el arqueo del efectivo y el saldo del
              banco no se pueden cuadrar contra el libro. */}
          <FormaDePago
            formaDePago={formaDePago}
            cuentaId={cuentaId}
            onFormaChange={setFormaDePago}
            onCuentaChange={setCuentaId}
            disabled={guardando}
          />

          <div className="space-y-2">
            <Label htmlFor="movimiento-usuario" className="text-sm">
              Lo hizo
            </Label>
            <Select value={usuarioId} onValueChange={setUsuarioId} disabled={guardando}>
              <SelectTrigger id="movimiento-usuario">
                <SelectValue placeholder="Elegí quién" />
              </SelectTrigger>
              <SelectContent>
                {personas.map((persona) => (
                  <SelectItem key={persona.id} value={String(persona.id)}>
                    {nombreDe(persona)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Quién hizo el gasto. Queda registrado aparte quién lo cargó.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            onClick={guardar}
            disabled={!puedeGuardar}
            className="bg-[#204983] hover:bg-[#1a3d6f]"
          >
            {guardando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="mr-2 h-4 w-4" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
