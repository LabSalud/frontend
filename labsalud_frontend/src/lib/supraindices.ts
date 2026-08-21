/**
 * Caracteres en supraíndice, para escribirlos dentro de un campo de texto
 * común.
 *
 * `measure_unit` es un CharField: no hay negrita ni cursiva ni `<sup>` que
 * guardar, así que un `mm³` se guarda literalmente con el carácter Unicode
 * `³`. Eso viaja igual al backend, a la base y al PDF (WeasyPrint toma la
 * fuente del sistema y las resuelve sin problema).
 *
 * NO ES LO MISMO QUE LA NOTACIÓN CIENTÍFICA
 * =========================================
 * El `×10⁶` de una unidad NO se escribe acá: vive en `scientific_exponent`,
 * como campo aparte, por las razones que explica `campo-notacion-cientifica`.
 * Esto es para lo otro: `mm³`, `cm²`, `m/s²`, `µm⁻¹`.
 *
 * Unicode no tiene supraíndice para todo. Falta la `q` minúscula y faltan la
 * C, F, Q, S, X, Y y Z mayúsculas. Lo que no está se devuelve tal cual.
 */

const SUPRAINDICES: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",

  "a": "ᵃ", "b": "ᵇ", "c": "ᶜ", "d": "ᵈ", "e": "ᵉ",
  "f": "ᶠ", "g": "ᵍ", "h": "ʰ", "i": "ⁱ", "j": "ʲ",
  "k": "ᵏ", "l": "ˡ", "m": "ᵐ", "n": "ⁿ", "o": "ᵒ",
  "p": "ᵖ", "r": "ʳ", "s": "ˢ", "t": "ᵗ", "u": "ᵘ",
  "v": "ᵛ", "w": "ʷ", "x": "ˣ", "y": "ʸ", "z": "ᶻ",

  "A": "ᴬ", "B": "ᴮ", "D": "ᴰ", "E": "ᴱ", "G": "ᴳ",
  "H": "ᴴ", "I": "ᴵ", "J": "ᴶ", "K": "ᴷ", "L": "ᴸ",
  "M": "ᴹ", "N": "ᴺ", "O": "ᴼ", "P": "ᴾ", "R": "ᴿ",
  "T": "ᵀ", "U": "ᵁ", "V": "ⱽ", "W": "ᵂ",
}

/** El carácter en supraíndice, o el mismo carácter si Unicode no lo tiene. */
export function aSupraindice(caracter: string): string {
  return SUPRAINDICES[caracter] ?? caracter
}

/** Si existe versión en supraíndice de este carácter. */
export function tieneSupraindice(caracter: string): boolean {
  return caracter in SUPRAINDICES
}
