"use client"

import { useEffect, useState } from "react"
import { Banknote, Landmark } from "lucide-react"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BILLING_ENDPOINTS } from "@/config/api"
import { useApi } from "@/hooks/use-api"

/**
 * Cómo pagó el paciente: efectivo o transferencia, y a qué cuenta.
 *
 * POR QUÉ LA CUENTA ES OBLIGATORIA CUANDO ES TRANSFERENCIA
 * ========================================================
 * Al cerrar la caja hay que cruzar cada transferencia contra el extracto de SU
 * cuenta. "Transferencia" a secas obliga a reconstruir a cuál entró, días
 * después y de memoria. El backend también lo rechaza; acá se pide antes para
 * no perder la carga entera por un campo.
 *
 * SE MUESTRAN NOMBRE Y ALIAS
 * ==========================
 * Los dos, porque se usan en momentos distintos: el alias se le dicta al
 * paciente en el mostrador, y el nombre es por el que se busca al conciliar.
 *
 * Lo comparten el ingreso y el detalle del protocolo: es el mismo dato y se
 * corrige en los dos lados.
 */

export type CuentaElegible = { id: number; nombre: string; alias: string }

type Props = {
  formaDePago: string
  cuentaId: string
  onFormaChange: (forma: string) => void
  onCuentaChange: (id: string) => void
  disabled?: boolean
}

const EFECTIVO = "efectivo"
const TRANSFERENCIA = "transferencia"

export function FormaDePago({
  formaDePago,
  cuentaId,
  onFormaChange,
  onCuentaChange,
  disabled = false,
}: Props) {
  const { apiRequest } = useApi()
  const [cuentas, setCuentas] = useState<CuentaElegible[]>([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (formaDePago !== TRANSFERENCIA || cuentas.length > 0) return
    let vigente = true
    setCargando(true)
    apiRequest(`${BILLING_ENDPOINTS.CUENTAS_DE_COBRO}?is_active=true`)
      .then((r) => (r.ok ? r.json() : null))
      .then((datos) => {
        if (!vigente || !datos) return
        setCuentas(Array.isArray(datos) ? datos : datos.results || [])
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formaDePago])

  const elegir = (forma: string) => {
    onFormaChange(forma)
    // Cambiar a efectivo tiene que soltar la cuenta: el backend rechaza un
    // efectivo con cuenta, y dejarla puesta guardaría un dato que contradice
    // lo que dice la pantalla.
    if (forma !== TRANSFERENCIA) onCuentaChange("")
  }

  const elegida = cuentas.find((c) => String(c.id) === cuentaId)

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <Label className="text-sm font-medium text-gray-700">Forma de pago</Label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => elegir(formaDePago === EFECTIVO ? "" : EFECTIVO)}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition
            ${formaDePago === EFECTIVO
              ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-800"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          <Banknote className="h-4 w-4" />
          Efectivo
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => elegir(formaDePago === TRANSFERENCIA ? "" : TRANSFERENCIA)}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition
            ${formaDePago === TRANSFERENCIA
              ? "border-sky-300 bg-sky-50 font-medium text-sky-800"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          <Landmark className="h-4 w-4" />
          Transferencia
        </button>
      </div>

      {formaDePago === TRANSFERENCIA && (
        <div className="space-y-1.5">
          <Label htmlFor="cuenta-de-cobro" className="text-sm">
            ¿A qué cuenta? *
          </Label>
          <Select value={cuentaId} onValueChange={onCuentaChange} disabled={disabled || cargando}>
            <SelectTrigger id="cuenta-de-cobro" className="bg-white">
              <SelectValue
                placeholder={cargando ? "Cargando cuentas..." : "Elegir cuenta"}
              />
            </SelectTrigger>
            <SelectContent>
              {cuentas.map((cuenta) => (
                <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                  {cuenta.nombre}
                  {cuenta.alias ? ` · ${cuenta.alias}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {elegida ? (
            <p className="text-xs text-gray-600">
              <span className="font-medium">{elegida.nombre}</span>
              {elegida.alias ? (
                <>
                  {" · alias "}
                  <span className="font-mono">{elegida.alias}</span>
                </>
              ) : null}
            </p>
          ) : null}

          {!cargando && cuentas.length === 0 && (
            <p className="text-xs text-amber-700">
              No hay cuentas cargadas. Se dan de alta en Configuración → Facturación.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
