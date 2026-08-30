"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resolverUb } from "@/lib/ub-por-nomenclador"
import type { BioUnitValue, NBU } from "@/types"

/** Lo que se tipeó, por id de nomenclador. Vacío = hereda del padre. */
export type UbPorNbu = Record<number, string>

interface CampoUbPorNomencladorProps {
  nbus: NBU[]
  valores: UbPorNbu
  onChange: (valores: UbPorNbu) => void
  error?: string
  disabled?: boolean
}

/**
 * EL UB QUE SE COBRA SE CARGA ACÁ.
 *
 * Es el número que multiplica el valor de la UB de cada obra social: es acá
 * donde se lo busca cuando algo se está cobrando mal. Antes solo estaba en la
 * edición del análisis, así que un análisis recién dado de alta existía,
 * aparecía en el buscador del ingreso, se podía pedir — y cotizaba cero hasta
 * que alguien se acordara de entrar a editarlo.
 *
 * El mismo bloque en el alta y en la edición: es el mismo dato y se carga
 * igual, y tenerlo dos veces escrito era la razón por la que solo una de las
 * dos pantallas lo tenía.
 *
 * LA HERENCIA SE MUESTRA MIENTRAS SE TIPEA
 * ========================================
 * Los nomencladores son una cadena y un análisis solo necesita valor en la que
 * lo revalorizó. El "hereda 3 de Base" se calcula con lo que hay en el
 * formulario AHORA, no con lo guardado: escribir el UB del principal tiene que
 * mostrar de inmediato qué pasa a heredar cada actualización, que es
 * justamente lo que se está decidiendo.
 */
export function CampoUbPorNomenclador({
  nbus,
  valores,
  onChange,
  error,
  disabled,
}: CampoUbPorNomencladorProps) {
  if (nbus.length === 0) return null

  // `resolverUb` camina la cadena sobre la forma que devuelve el backend, así
  // que lo tipeado se le pasa con esa misma forma.
  const enEdicion: BioUnitValue[] = nbus
    .filter((nbu) => (valores[nbu.id] ?? "").trim())
    .map((nbu) => ({ nbu_id: nbu.id, nbu_name: nbu.name, year: nbu.year ?? 0, value: valores[nbu.id].trim() }))

  return (
    <div className="space-y-2 rounded-md border border-blue-100 bg-blue-50/50 p-3">
      <Label className="text-sm font-semibold text-blue-900">UB por nomenclador</Label>
      <p className="text-xs text-blue-800">
        Es lo que se cobra: cada obra social usa el nomenclador que tiene asignado. Dejarlo vacío
        hace que el análisis herede el UB del nomenclador del que cuelga — así solo se carga lo que
        cambió en cada actualización.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="mt-1 space-y-1.5">
        {nbus.map((nbu) => {
          const rige = resolverUb(enEdicion, nbu.id, nbus)
          return (
            <div key={nbu.id} className="flex items-center gap-2 rounded-md bg-white p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-900">
                  {nbu.name}
                  {nbu.year ? <span className="text-gray-400"> · {nbu.year}</span> : null}
                </p>
                <p className="text-[11px] text-gray-500">
                  {rige.esPropio
                    ? "Valor propio"
                    : rige.valor
                      ? `Hereda ${rige.valor} de ${rige.heredadoDe}`
                      : "Sin UB en esta cadena"}
                </p>
              </div>
              <Input
                value={valores[nbu.id] ?? ""}
                onChange={(e) => onChange({ ...valores, [nbu.id]: e.target.value })}
                placeholder={rige.valor && !rige.esPropio ? `${rige.valor} (heredado)` : "UB"}
                disabled={disabled}
                className="h-8 w-24 shrink-0 tabular-nums"
                aria-label={`UB en ${nbu.name}`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
