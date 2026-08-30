"use client"

import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InputUnidadDeMedida } from "./input-unidad-de-medida"
import { esExponenteValido } from "@/lib/notacion"
import { CampoNotacionCientifica } from "./campo-notacion-cientifica"
import {
  rangosConNombreParaEnviar,
  rangosParaEnviar,
  rangosVacios,
  ValoresDeReferencia,
  type NamedRange,
  type RangeMap,
  type RangoConNombre,
  type RefRange,
} from "./valores-de-referencia"

/**
 * Las determinaciones que se cargan junto con el análisis.
 *
 * POR QUÉ EL ALTA PREGUNTA SI ES UN MÓDULO
 * ========================================
 * Un análisis sin determinaciones no sirve para nada: aparece en el buscador,
 * se puede pedir, y cuando llega a la pantalla de carga la bioquímica no tiene
 * dónde escribir el resultado. Antes había que acordarse de entrar después a
 * cargárselas.
 *
 * La mayoría de los análisis tienen una sola determinación, que se llama igual
 * que el análisis (GLUCEMIA → GLUCEMIA). Preguntar el nombre en ese caso es
 * pedir dos veces lo mismo, así que solo se pide la unidad y los valores de
 * referencia. Un módulo (HEMOGRAMA) sí lleva varias, cada una con su nombre.
 */

export type DeterminacionEnEdicion = {
  /** Solo para la key de React: no se manda. */
  id: string
  nombre: string
  unidad: string
  exponente: string
  ranges: RangeMap
  rangosConNombre: RangoConNombre[]
}

let siguienteId = 0

export function determinacionVacia(nombre = ""): DeterminacionEnEdicion {
  siguienteId += 1
  return {
    id: `det-${siguienteId}`,
    nombre,
    unidad: "",
    exponente: "",
    ranges: rangosVacios(),
    rangosConNombre: [],
  }
}

export type DeterminacionParaEnviar = {
  name: string
  measure_unit: string
  scientific_exponent: number | null
  reference_ranges: RefRange[]
  named_ranges: NamedRange[]
}

/** Lo que espera el backend en `determinations` al crear el análisis. */
export function paraEnviar(
  determinaciones: DeterminacionEnEdicion[],
  nombreDelAnalisis: string,
  esModulo: boolean,
): DeterminacionParaEnviar[] {
  return determinaciones
    .map((d) => ({
      // Un análisis simple: la determinación se llama igual que el análisis.
      name: (esModulo ? d.nombre : nombreDelAnalisis).trim(),
      measure_unit: d.unidad.trim(),
      scientific_exponent: esExponenteValido(Number(d.exponente)) ? Number(d.exponente) : null,
      reference_ranges: rangosParaEnviar(d.ranges),
      named_ranges: rangosConNombreParaEnviar(d.rangosConNombre),
    }))
    .filter((d) => d.name)
}

/** Los errores que hay que mostrar, o `null` si está todo bien. */
export function validar(
  determinaciones: DeterminacionEnEdicion[],
  esModulo: boolean,
): string | null {
  if (esModulo) {
    if (determinaciones.length === 0) return "Un módulo necesita al menos una determinación."
    if (determinaciones.some((d) => !d.nombre.trim()))
      return "Todas las determinaciones necesitan un nombre."
    const nombres = determinaciones.map((d) => d.nombre.trim().toLowerCase())
    if (new Set(nombres).size !== nombres.length)
      return "Hay dos determinaciones con el mismo nombre."
  }
  if (determinaciones.some((d) => d.exponente.trim() !== "" && !esExponenteValido(Number(d.exponente))))
    return "La notación científica tiene que ser un número entero entre 1 y 30."
  return null
}

interface Props {
  esModulo: boolean
  nombreDelAnalisis: string
  determinaciones: DeterminacionEnEdicion[]
  onChange: (determinaciones: DeterminacionEnEdicion[]) => void
  disabled?: boolean
}

export function DeterminacionesDelAlta({
  esModulo,
  nombreDelAnalisis,
  determinaciones,
  onChange,
  disabled,
}: Props) {
  const actualizar = (id: string, cambios: Partial<DeterminacionEnEdicion>) =>
    onChange(determinaciones.map((d) => (d.id === id ? { ...d, ...cambios } : d)))

  const quitar = (id: string) => onChange(determinaciones.filter((d) => d.id !== id))

  return (
    <div className="space-y-4">
      {determinaciones.map((det, indice) => (
        <div
          key={det.id}
          className="space-y-4 rounded-lg border border-gray-200 p-3"
        >
          {esModulo && (
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`det-nombre-${det.id}`} className="text-sm">
                  Determinación {indice + 1} *
                </Label>
                <Input
                  id={`det-nombre-${det.id}`}
                  value={det.nombre}
                  onChange={(e) => actualizar(det.id, { nombre: e.target.value })}
                  placeholder="ej: Hemoglobina"
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => quitar(det.id)}
                disabled={disabled || determinaciones.length === 1}
                aria-label={`Quitar la determinación ${indice + 1}`}
                className="mt-7 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {!esModulo && (
            <p className="text-xs text-gray-500">
              Se va a crear una determinación llamada{" "}
              <span className="font-medium text-gray-700">
                {nombreDelAnalisis.trim() || "igual que el análisis"}
              </span>
              .
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor={`det-unidad-${det.id}`} className="text-sm">
              Unidad de medida
            </Label>
            <InputUnidadDeMedida
              id={`det-unidad-${det.id}`}
              value={det.unidad}
              onChange={(unidad) => actualizar(det.id, { unidad })}
              disabled={disabled}
            />
          </div>

          <CampoNotacionCientifica
            id={`det-exponente-${det.id}`}
            unidad={det.unidad}
            exponente={det.exponente}
            onChange={(valor) => actualizar(det.id, { exponente: valor })}
          />

          <ValoresDeReferencia
            ranges={det.ranges}
            onChange={(ranges) => actualizar(det.id, { ranges })}
            namedRanges={det.rangosConNombre}
            onNamedRangesChange={(rangosConNombre) => actualizar(det.id, { rangosConNombre })}
            disabled={disabled}
          />
        </div>
      ))}

      {esModulo && (
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange([...determinaciones, determinacionVacia()])}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar determinación
        </Button>
      )}
    </div>
  )
}
