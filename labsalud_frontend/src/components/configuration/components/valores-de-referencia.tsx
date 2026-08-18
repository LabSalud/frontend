"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Los valores de referencia de una determinación: los 4 grupos.
 *
 * POR QUÉ ES UN COMPONENTE Y NO ESTÁ ESCRITO EN CADA DIÁLOGO
 * ==========================================================
 * La edición tenía esta grilla y el alta pedía un JSON a mano, en un
 * `<textarea>`. O sea que para cargar un rango al crear había que saber la
 * forma del objeto, y equivocarse en una llave no daba error: guardaba una
 * determinación sin rangos, y el informe salía sin ellos.
 *
 * Ahora es la misma grilla en los dos lados, y el mismo formato de salida.
 */

export const REF_GROUPS = [
  { key: "hombre", label: "Hombre", sex: "male", age_group: "adult" },
  { key: "mujer", label: "Mujer", sex: "female", age_group: "adult" },
  { key: "nino", label: "Niño", sex: "male", age_group: "child" },
  { key: "nina", label: "Niña", sex: "female", age_group: "child" },
] as const

export type RangeMap = Record<string, { min: string; max: string }>

export type RefRange = {
  sex?: string
  age_group?: string
  min_value?: string
  max_value?: string
}

export const rangosVacios = (): RangeMap => ({
  hombre: { min: "", max: "" },
  mujer: { min: "", max: "" },
  nino: { min: "", max: "" },
  nina: { min: "", max: "" },
})

/** Lo que viene del backend, en los 4 casilleros. */
export function rangosDesde(existentes?: RefRange[]): RangeMap {
  const mapa = rangosVacios()
  for (const grupo of REF_GROUPS) {
    const encontrado = (existentes || []).find(
      (r) => r.sex === grupo.sex && r.age_group === grupo.age_group,
    )
    if (encontrado) {
      mapa[grupo.key] = { min: encontrado.min_value ?? "", max: encontrado.max_value ?? "" }
    }
  }
  return mapa
}

/** Los 4 casilleros, en lo que espera el backend. Los vacíos no van. */
export function rangosParaEnviar(ranges: RangeMap): RefRange[] {
  return REF_GROUPS.filter((g) => ranges[g.key].min.trim() || ranges[g.key].max.trim()).map((g) => ({
    sex: g.sex,
    age_group: g.age_group,
    min_value: ranges[g.key].min.trim(),
    max_value: ranges[g.key].max.trim(),
  }))
}

interface Props {
  ranges: RangeMap
  onChange: (ranges: RangeMap) => void
  disabled?: boolean
}

export function ValoresDeReferencia({ ranges, onChange, disabled }: Props) {
  const setRange = (key: string, campo: "min" | "max", valor: string) =>
    onChange({ ...ranges, [key]: { ...ranges[key], [campo]: valor } })

  return (
    <div className="space-y-2">
      <Label className="text-sm">Valores de referencia (opcional)</Label>
      <p className="text-xs text-gray-500">
        Dejá vacío el grupo que no aplique. Acepta decimales con «,» o «.».
      </p>
      <div className="space-y-2">
        <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-2 text-xs font-medium text-gray-500">
          <span />
          <span>Mínimo</span>
          <span>Máximo</span>
        </div>
        {REF_GROUPS.map((g) => (
          <div key={g.key} className="grid grid-cols-[80px_1fr_1fr] items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{g.label}</span>
            <Input
              value={ranges[g.key].min}
              onChange={(e) => setRange(g.key, "min", e.target.value)}
              placeholder="—"
              disabled={disabled}
              className="h-9 text-sm"
            />
            <Input
              value={ranges[g.key].max}
              onChange={(e) => setRange(g.key, "max", e.target.value)}
              placeholder="—"
              disabled={disabled}
              className="h-9 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
