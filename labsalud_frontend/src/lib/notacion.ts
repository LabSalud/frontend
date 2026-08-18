/**
 * Notación científica de las unidades del catálogo.
 *
 * Una determinación guarda la unidad partida en dos: `measure_unit` (`/µL`) y
 * `scientific_exponent` (`6`). La bioquímica carga `4,5` y el informe imprime
 * `4.500.000 /µL`.
 *
 * Acá hay dos cosas y son distintas:
 *
 * - `unidadCompleta()` arma `×10⁶/µL` para mostrar AL LADO del número sin
 *   expandir. En la pantalla de carga es imprescindible: sin eso la bioquímica
 *   no sabe en qué escala está escribiendo.
 * - `expandirNumero()` es la vista previa de lo que va a decir el informe. Es
 *   solo eso: quien multiplica de verdad es el backend
 *   (`laboratory/catalog/notacion.py`), y el valor se guarda como se escribió.
 */

const SUPERINDICES = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"]

/** Más que esto no es una unidad, es un error de carga. */
export const EXPONENTE_MAXIMO = 30

export function esExponenteValido(exponente: number | null | undefined): exponente is number {
  return (
    typeof exponente === "number" &&
    Number.isInteger(exponente) &&
    exponente > 0 &&
    exponente <= EXPONENTE_MAXIMO
  )
}

/** `6` → `"⁶"` */
export function superindice(exponente: number): string {
  return String(exponente)
    .split("")
    .map((d) => SUPERINDICES[Number(d)] ?? d)
    .join("")
}

/** `("/µL", 6)` → `"×10⁶/µL"`. Sin exponente devuelve la unidad tal cual. */
export function unidadCompleta(
  unidad: string | null | undefined,
  exponente?: number | null,
): string {
  const limpia = (unidad ?? "").trim()
  if (!esExponenteValido(exponente)) return limpia

  const notacion = `×10${superindice(exponente)}`
  if (!limpia) return notacion
  return limpia.startsWith("/") ? `${notacion}${limpia}` : `${notacion} ${limpia}`
}

/** `4.500000` → `"4.500.000"`. Punto de miles y coma decimal, como el informe. */
function conSeparadores(entero: string, decimales: string, signo: string): string {
  const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return signo + (decimales ? `${conPuntos},${decimales}` : conPuntos)
}

/**
 * El número multiplicado por 10^exponente, o `null` si no es un número.
 *
 * Se corre la coma en vez de multiplicar en punto flotante: `4.5678 * 1000` da
 * `4567.8000000000002` en JavaScript, y una vista previa que no coincide con
 * el informe es peor que no tener vista previa.
 */
export function expandirNumero(
  valor: string | null | undefined,
  exponente?: number | null,
): string | null {
  const crudo = (valor ?? "").trim()
  if (!crudo || !esExponenteValido(exponente)) return null
  if (!/^[+-]?\d+([.,]\d+)?$/.test(crudo)) return null

  const signo = crudo.startsWith("-") ? "-" : ""
  const sinSigno = crudo.replace(/^[+-]/, "")
  const [enteroCrudo, decimalCrudo = ""] = sinSigno.split(/[.,]/)

  const digitos = enteroCrudo + decimalCrudo
  const coma = enteroCrudo.length + exponente

  let entero: string
  let decimales: string
  if (coma >= digitos.length) {
    entero = digitos + "0".repeat(coma - digitos.length)
    decimales = ""
  } else {
    entero = digitos.slice(0, coma)
    decimales = digitos.slice(coma)
  }

  entero = entero.replace(/^0+(?=\d)/, "")
  decimales = decimales.replace(/0+$/, "")
  return conSeparadores(entero, decimales, signo)
}
