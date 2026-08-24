"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface CampoPrecioFijoProps {
  /** Si el laboratorio habilitó la función en Configuración → Montos fijos. */
  habilitado: boolean
  cobraPrecioFijo: boolean
  onCobraPrecioFijoChange: (valor: boolean) => void
  precio: string
  onPrecioChange: (valor: string) => void
  error?: string
}

/**
 * El precio fijo de un análisis: el interruptor y el monto.
 *
 * SE MUESTRA APAGADO, NO ESCONDIDO
 * ================================
 * Con la función deshabilitada el campo sigue a la vista, gris y con el cartel
 * que dice dónde se prende. Esconderlo dejaba la función imposible de
 * encontrar: quien busca cómo cobrar una práctica sin UB la busca acá, en el
 * análisis, y no en la pestaña de los montos del sistema.
 *
 * Es el mismo bloque en el alta y en la edición. Vive aparte porque son dos
 * diálogos distintos y un precio que se explica de dos maneras distintas
 * según por dónde se entre es un precio que se carga mal.
 */
export function CampoPrecioFijo({
  habilitado,
  cobraPrecioFijo,
  onCobraPrecioFijoChange,
  precio,
  onPrecioChange,
  error,
}: CampoPrecioFijoProps) {
  return (
    <div className="space-y-3 rounded-lg bg-gray-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Label htmlFor="cobraPrecioFijo" className="font-medium">
            Se cobra a precio fijo
          </Label>
          <p className="text-sm text-gray-500">
            {habilitado
              ? "Al paciente se le cobra el precio de acá abajo en vez de calcularlo por UB. No cambia lo que se le presenta a la obra social."
              : "Para usarlo, primero hay que habilitarlo en Configuración → Montos fijos."}
          </p>
        </div>
        <Switch
          id="cobraPrecioFijo"
          checked={cobraPrecioFijo}
          onCheckedChange={onCobraPrecioFijoChange}
          disabled={!habilitado}
        />
      </div>

      {cobraPrecioFijo && habilitado && (
        <div className="space-y-2">
          <Label htmlFor="precioParticular">Precio para el particular *</Label>
          <Input
            id="precioParticular"
            type="number"
            min="0"
            step="0.01"
            value={precio}
            onChange={(e) => onPrecioChange(e.target.value)}
            placeholder="0.00"
          />
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            <p className="text-xs text-gray-500">
              Con precio fijo la unidad bioquímica deja de ser obligatoria: son
              las prácticas que se cobran sin nomenclador.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
