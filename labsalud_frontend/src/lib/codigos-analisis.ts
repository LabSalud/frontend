/**
 * Códigos de análisis: los que el sistema trata distinto, y cómo se comparan.
 *
 * El código dejó de ser un entero. La mayoría siguen siendo los 6 dígitos del
 * NBU, pero el laboratorio también carga prácticas propias con códigos como
 * `A15` o `INT-3`.
 *
 * Todo lo que antes hacía `Number(a.code) === 660001` está acá, porque esas
 * comparaciones no fallan cuando el código es alfanumérico: `Number("A15")` da
 * `NaN` y toda comparación con `NaN` es falsa. El acto bioquímico dejaría de
 * agregarse solo, sin ningún error a la vista.
 *
 * Reemplaza a `acto-bioquimico.ts`: eran los mismos códigos escritos dos
 * veces, una como número y otra como texto.
 */

/** ACTO BIOQUÍMICO */
export const ACTO_BIOQUIMICO = "660001"
/** ACTO BIOQUÍMICO DE INTERNACIÓN (ABI) */
export const ACTO_BIOQUIMICO_INTERNACION = "661001"
/** ACTO BIOQUÍMICO COMPLEMENTARIO (ABC) */
export const ACTO_BIOQUIMICO_COMPLEMENTARIO = "662001"

/**
 * Ítems de facturación que no tienen un resultado real para cargar ni validar
 * (aunque el catálogo les arme una determinación de relleno). No cuentan como
 * "pendientes de cargar" en ninguna pantalla.
 */
export const ACTO_BIOQUIMICO_CODES = new Set([
  ACTO_BIOQUIMICO,
  ACTO_BIOQUIMICO_INTERNACION,
  ACTO_BIOQUIMICO_COMPLEMENTARIO,
])

/** Los dos que maneja la pantalla de ingreso. El ABC se carga aparte. */
export const ACTOS_DE_INGRESO = [ACTO_BIOQUIMICO, ACTO_BIOQUIMICO_INTERNACION]

/** Desde este código arrancan las prácticas de internación, que llevan ABI. */
const PRIMER_CODIGO_DE_INTERNACION = 661001

export function normalizarCodigo(code: unknown): string {
  if (code === null || code === undefined) return ""
  return String(code).trim()
}

export function isActoBioquimico(code: unknown): boolean {
  return ACTO_BIOQUIMICO_CODES.has(normalizarCodigo(code))
}

export function esActoDeIngreso(code: unknown): boolean {
  return ACTOS_DE_INGRESO.includes(normalizarCodigo(code))
}

/** El número del código, o `null` si es alfanumérico. */
export function comoNumero(code: unknown): number | null {
  const texto = normalizarCodigo(code)
  if (!/^\d+$/.test(texto)) return null
  return Number(texto)
}

/**
 * Si al agregar esta práctica hay que sumar el acto bioquímico común.
 *
 * Los actos no se piden a sí mismos, y las prácticas de internación
 * (código ≥ 661001) llevan el ABI, que se carga a mano.
 *
 * Una práctica propia del laboratorio —código alfanumérico, fuera del
 * nomenclador— es una práctica común: lleva acto. Es el lado seguro del error:
 * se factura de más y alguien lo saca, en vez de no facturarse y que no se
 * entere nadie.
 */
export function necesitaActoBioquimico(code: unknown): boolean {
  if (esActoDeIngreso(code)) return false
  const numero = comoNumero(code)
  return numero === null || numero < PRIMER_CODIGO_DE_INTERNACION
}

/**
 * Orden para mostrar: primero los numéricos por valor, después los
 * alfanuméricos alfabéticamente. Ordenar `A15` por su `Number` lo mandaría al
 * final de cualquier lista, en un lugar distinto cada vez.
 */
export function compararCodigos(a: unknown, b: unknown): number {
  const na = comoNumero(a)
  const nb = comoNumero(b)
  if (na !== null && nb !== null) return na - nb
  if (na !== null) return -1
  if (nb !== null) return 1
  return normalizarCodigo(a).localeCompare(normalizarCodigo(b), "es")
}

export function mismoCodigo(a: unknown, b: unknown): boolean {
  return normalizarCodigo(a).toUpperCase() === normalizarCodigo(b).toUpperCase()
}
