import type { BioUnitValue, NBU } from "@/types"

/**
 * Qué UB rige para un análisis en un nomenclador.
 *
 * LOS NOMENCLADORES SON UNA CADENA
 * ================================
 * Cada uno cuelga de otro: "Actualización 2024" → "Actualización 2023" → "Base".
 * Un análisis no necesita tener valor propio en el 2024 — si no lo tiene, se usa
 * el del 2023, y si tampoco, el de la Base. Solo se revaloriza lo que cambió.
 *
 * Mostrar únicamente los valores propios, que es lo que hacía la pantalla del
 * nomenclador, deja la impresión de que los demás análisis no tienen UB. Tienen:
 * el heredado, que es el que se termina cobrando.
 *
 * Se resuelve acá y no en el backend porque el listado del catálogo ya devuelve
 * los valores propios de cada análisis con su nomenclador, y la lista de
 * nomencladores ya trae de cuál cuelga cada uno. Con eso alcanza — es la misma
 * caminata que hace `NBU.get_ub_quantity`.
 */

export type UbResuelto = {
  /** La cantidad de UB, o null si no hay en ningún eslabón de la cadena. */
  valor: string | null
  /** true si el valor es propio del nomenclador consultado, no heredado. */
  esPropio: boolean
  /** Nombre del nomenclador que lo aporta, cuando viene heredado. */
  heredadoDe: string | null
}

const SIN_UB: UbResuelto = { valor: null, esPropio: false, heredadoDe: null }

export function resolverUb(
  valores: BioUnitValue[] | undefined,
  nbuId: number | null | undefined,
  nomencladores: NBU[],
): UbResuelto {
  if (!nbuId) return SIN_UB

  const porId = new Map(nomencladores.map((n) => [n.id, n]))
  const propios = new Map<number, string>()
  for (const v of valores ?? []) {
    if (v.nbu_id && (v.value ?? "").trim()) propios.set(v.nbu_id, v.value)
  }

  // El `vistos` es por las dudas: un nomenclador que cuelgue de sí mismo colgaría
  // la pantalla, y el backend se cuida igual.
  const vistos = new Set<number>()
  let actual: number | null | undefined = nbuId
  while (actual && !vistos.has(actual)) {
    vistos.add(actual)
    const valor = propios.get(actual)
    if (valor) {
      const esPropio = actual === nbuId
      return {
        valor,
        esPropio,
        heredadoDe: esPropio ? null : porId.get(actual)?.name ?? null,
      }
    }
    actual = porId.get(actual)?.parent_nbu ?? null
  }
  return SIN_UB
}

/** El valor propio de ese nomenclador, si lo tiene. Vacío si hereda. */
export function ubPropio(valores: BioUnitValue[] | undefined, nbuId: number): string {
  return (valores ?? []).find((v) => v.nbu_id === nbuId)?.value ?? ""
}
