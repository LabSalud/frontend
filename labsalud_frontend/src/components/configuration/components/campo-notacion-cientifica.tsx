"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { esExponenteValido, expandirNumero, unidadCompleta } from "@/lib/notacion"

/**
 * La notación científica de la unidad, aparte de la unidad.
 *
 * POR QUÉ ES UN CAMPO Y NO SE ESCRIBE EN LA UNIDAD
 * ================================================
 * Antes se cargaba `×10⁶/µL` como texto y el informe lo interpretaba al
 * imprimir. Eso hace que por cuánto se multiplica el resultado de un paciente
 * dependa de cómo alguien tipeó una cadena.
 *
 * Igual se sigue aceptando escribirla en la unidad: el backend la separa al
 * guardar y la devuelve ya partida.
 *
 * La vista previa está porque el número que se carga y el que se imprime son
 * distintos, y esa es exactamente la clase de cosa que conviene ver antes de
 * guardar y no en el informe de un paciente.
 */

const EJEMPLO = "4,5"

interface Props {
  id: string
  unidad: string
  /** Texto porque el input puede estar vacío, que es lo normal. */
  exponente: string
  onChange: (valor: string) => void
  error?: string
}

export function CampoNotacionCientifica({ id, unidad, exponente, onChange, error }: Props) {
  const numero = exponente.trim() === "" ? null : Number(exponente)
  const valido = esExponenteValido(numero)
  const ejemplo = valido ? expandirNumero(EJEMPLO, numero) : null

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm">
        Notación científica (opcional)
      </Label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 shrink-0">×10</span>
        <Input
          id={id}
          type="number"
          min={1}
          max={30}
          inputMode="numeric"
          value={exponente}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className="h-9 w-20 text-sm"
        />
        <span className="text-sm text-gray-500 truncate">
          {valido ? unidadCompleta(unidad, numero) : "sin notación"}
        </span>
      </div>
      {error ? (
        <p className="text-xs md:text-sm text-red-500">{error}</p>
      ) : (
        <p className="text-xs text-gray-500">
          {ejemplo
            ? `Se carga ${EJEMPLO} y el informe imprime ${ejemplo} ${unidad.trim()}`.trim()
            : "Solo para unidades como ×10⁶/µL: se carga el número corto y el informe muestra el número completo."}
        </p>
      )}
    </div>
  )
}
