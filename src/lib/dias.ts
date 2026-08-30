/**
 * Días del calendario, como los cuenta el laboratorio.
 *
 * TODO EN HORA LOCAL, NUNCA EN UTC
 * ===============================
 * `new Date(iso).toISOString().slice(0, 10)` es la forma fácil y está mal: un
 * protocolo cargado a las 22:30 del 21 en Córdoba tiene un ISO que en UTC ya
 * dice 22, y ese turno de la tarde aparecería agrupado en el día siguiente.
 * Acá se usa siempre el calendario local, que es el mismo que el usuario ve en
 * la columna de fecha de la fila.
 *
 * El backend hace el mismo corte del lado del servidor (`ProtocolFilterSet`),
 * así que el día que separa la lista y el día que filtra el listado son el
 * mismo día.
 */

/** `Date` → `"2026-08-21"`, en hora local. */
export function aClaveDeDia(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0")
  const dia = String(fecha.getDate()).padStart(2, "0")
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

/** El día de un ISO del backend, en hora local. `null` si no es una fecha. */
export function diaDeIso(iso: string | null | undefined): string | null {
  if (!iso) return null
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? null : aClaveDeDia(fecha)
}

export const hoy = (): string => aClaveDeDia(new Date())

/** `"2026-08-21"` → `Date` local a medianoche. */
export function deClaveDeDia(clave: string): Date {
  const [anio, mes, dia] = clave.split("-").map(Number)
  return new Date(anio, (mes ?? 1) - 1, dia ?? 1)
}

/** El día `cuantos` días después (o antes, con negativo). */
export function correrDias(clave: string, cuantos: number): string {
  const fecha = deClaveDeDia(clave)
  fecha.setDate(fecha.getDate() + cuantos)
  return aClaveDeDia(fecha)
}

/** Días enteros de `desde` a `hasta`. Negativo si `hasta` es anterior. */
export function diasEntre(desde: string, hasta: string): number {
  const unDia = 24 * 60 * 60 * 1000
  return Math.round((deClaveDeDia(hasta).getTime() - deClaveDeDia(desde).getTime()) / unDia)
}

const FORMATO_LARGO = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
})

/**
 * Cómo se lee un día en pantalla.
 *
 * "Hoy" y "Ayer" en vez de la fecha porque son los dos días que la gente del
 * mostrador mira todo el tiempo, y leer "jueves 21 de agosto" para decir "hoy"
 * es hacer una cuenta mental por cada vez que se mira la pantalla.
 */
export function nombreDelDia(clave: string): string {
  const distancia = diasEntre(clave, hoy())
  if (distancia === 0) return "Hoy"
  if (distancia === 1) return "Ayer"
  const texto = FORMATO_LARGO.format(deClaveDeDia(clave))
  const conMayuscula = texto.charAt(0).toUpperCase() + texto.slice(1)
  // El año solo cuando no es el corriente: en el 99% de los casos es ruido.
  const anio = deClaveDeDia(clave).getFullYear()
  return anio === new Date().getFullYear() ? conMayuscula : `${conMayuscula} de ${anio}`
}

/** `"2026-08-21"` → `"21/08/2026"`. */
export function comoFechaCorta(clave: string): string {
  const [anio, mes, dia] = clave.split("-")
  return `${dia}/${mes}/${anio}`
}
