/**
 * Resaltar en el texto lo que el usuario escribió.
 *
 * POR QUÉ NO ALCANZA CON `indexOf`
 * ================================
 * En el laboratorio la mitad de los apellidos llevan tilde y nadie los tipea
 * con tilde. Buscando "perez" hay que resaltar "Pérez", así que la comparación
 * va sobre el texto sin tildes y el recorte sobre el original.
 *
 * Eso funciona porque sacar la tilde no cambia el LARGO: `"é"` en NFD son dos
 * caracteres y al quitar la marca queda uno, igual que el original. Si por lo
 * que sea los largos no coinciden —algún carácter raro—, se devuelve el texto
 * tal cual: quedarse sin resaltado es molesto, resaltar el pedazo equivocado
 * confunde.
 */

export interface Trozo {
  texto: string
  resaltado: boolean
}

const sinTildes = (texto: string): string =>
  texto.normalize("NFD").replace(/\p{M}/gu, "")

/** Las palabras del término, largas primero para que gane la coincidencia más específica. */
const palabrasDe = (termino: string): string[] =>
  Array.from(new Set(sinTildes(termino.toLowerCase()).split(/[^\p{L}\p{N}]+/u)))
    .filter((palabra) => palabra.length >= 2)
    .sort((a, b) => b.length - a.length)

export function resaltar(texto: string, termino: string): Trozo[] {
  if (!texto || !termino) return [{ texto, resaltado: false }]

  const plano = sinTildes(texto).toLowerCase()
  if (plano.length !== texto.length) return [{ texto, resaltado: false }]

  const palabras = palabrasDe(termino)
  if (palabras.length === 0) return [{ texto, resaltado: false }]

  // Marca posición por posición y después junta: así dos palabras que se
  // solapan no se pisan ni duplican el texto.
  const marcado = new Array<boolean>(texto.length).fill(false)
  for (const palabra of palabras) {
    let desde = plano.indexOf(palabra)
    while (desde !== -1) {
      for (let i = desde; i < desde + palabra.length; i += 1) marcado[i] = true
      desde = plano.indexOf(palabra, desde + palabra.length)
    }
  }

  const trozos: Trozo[] = []
  let actual = ""
  let actualResaltado = marcado[0]
  for (let i = 0; i < texto.length; i += 1) {
    if (marcado[i] === actualResaltado) {
      actual += texto[i]
      continue
    }
    trozos.push({ texto: actual, resaltado: actualResaltado })
    actual = texto[i]
    actualResaltado = marcado[i]
  }
  if (actual) trozos.push({ texto: actual, resaltado: actualResaltado })
  return trozos
}
