/**
 * Configuración del auto-logout por inactividad.
 *
 * El valor real lo manda el backend en `inactivity_logout_minutes` (por
 * usuario); estos números son el fallback cuando todavía no lo conocemos.
 */

/**
 * 5 minutos. Con el segundo factor puesto, la sesión corta dejó de ser una
 * molestia: volver a entrar es usuario + contraseña, sin código, mientras dure
 * la ventana de confianza del dispositivo.
 */
export const DEFAULT_IDLE_MINUTES = 5

export const MIN_IDLE_MINUTES = 1

const WARNING_RATIO = 0.2
const MIN_WARNING_MS = 15 * 1000
const MAX_WARNING_MS = 60 * 1000

/** Minutos de inactividad válidos, cayendo al default si el backend manda cualquier cosa. */
export const resolveIdleMinutes = (value: unknown): number => {
  const minutes = Number(value)
  return Number.isFinite(minutes) && minutes >= MIN_IDLE_MINUTES ? minutes : DEFAULT_IDLE_MINUTES
}

export const resolveIdleTimeMs = (value: unknown): number => resolveIdleMinutes(value) * 60 * 1000

/**
 * Cuánto antes del cierre aparece el modal de aviso.
 *
 * Era fijo en 30 segundos, pensado para una ventana de 30 minutos. Con 5
 * minutos ese aviso queda corto (el usuario que volvió del pasillo ni lo ve),
 * y con el mínimo de 1 minuto un aviso fijo se comería media ventana. Lo
 * hacemos proporcional —20% del tiempo de inactividad— con piso de 15s y techo
 * de 60s: 5 min → 1 min de aviso, 1 min → 15s, 30 min → 1 min.
 */
export const resolveWarningTimeMs = (idleTimeMs: number): number => {
  const proportional = idleTimeMs * WARNING_RATIO
  const clamped = Math.min(MAX_WARNING_MS, Math.max(MIN_WARNING_MS, proportional))
  // Nunca puede ser >= al total, si no el aviso arrancaría antes de empezar a contar.
  return Math.min(clamped, Math.max(1000, idleTimeMs / 2))
}


// ---------------------------------------------------------------------------
// Tramos horarios
// ---------------------------------------------------------------------------

/**
 * Una franja del día con su propio tiempo de inactividad.
 *
 * `hasta` puede ser menor que `desde`: "13:30 a 07:30" es "el resto del día" y
 * es el tramo que más se usa.
 */
export interface TramoDeInactividad {
  desde: string
  hasta: string
  minutos: number
}

const MINUTOS_DEL_DIA = 24 * 60
const HORA_VALIDA = /^([01]\d|2[0-3]):([0-5]\d)$/

/** `"07:30"` → 450. `null` si no es una hora. */
export const minutosDeLaHora = (hora: string): number | null => {
  if (!HORA_VALIDA.test((hora || "").trim())) return null
  const [h, m] = hora.trim().split(":").map(Number)
  return h * 60 + m
}

/** El tramo como uno o dos rangos `[inicio, fin)` sobre el reloj de 24 horas. */
const rangosDe = (desde: number, hasta: number): Array<[number, number]> =>
  desde < hasta ? [[desde, hasta]] : [[desde, MINUTOS_DEL_DIA], [0, hasta]]

const minutoDelDia = (fecha: Date) => fecha.getHours() * 60 + fecha.getMinutes()

/**
 * Cuántos minutos de inactividad rigen AHORA.
 *
 * Las horas que no cubre ningún tramo caen en el valor de siempre del usuario:
 * los tramos agregan excepciones, no reemplazan la configuración. La misma
 * regla, escrita igual, vive en `user_management/tramos_de_inactividad.py`.
 */
export const minutosDeInactividadAhora = (
  tramos: TramoDeInactividad[] | undefined | null,
  porDefecto: unknown,
  ahora: Date = new Date(),
): number => {
  const fallback = resolveIdleMinutes(porDefecto)
  if (!tramos?.length) return fallback

  const momento = minutoDelDia(ahora)
  for (const tramo of tramos) {
    const desde = minutosDeLaHora(tramo.desde)
    const hasta = minutosDeLaHora(tramo.hasta)
    if (desde === null || hasta === null || desde === hasta) continue
    for (const [inicio, fin] of rangosDe(desde, hasta)) {
      if (momento >= inicio && momento < fin) {
        return resolveIdleMinutes(tramo.minutos)
      }
    }
  }
  return fallback
}

export const msDeInactividadAhora = (
  tramos: TramoDeInactividad[] | undefined | null,
  porDefecto: unknown,
  ahora: Date = new Date(),
): number => minutosDeInactividadAhora(tramos, porDefecto, ahora) * 60 * 1000

/**
 * Cuánto falta para el próximo borde de tramo.
 *
 * Sirve para programar el recálculo EN el borde en vez de preguntar cada
 * treinta segundos: a las 13:30 en punto la ventana pasa a ser la de la tarde,
 * sin depender de cuándo cayó el último tic.
 *
 * Si no hay tramos, devuelve `null`: no hay nada que recalcular.
 */
export const msHastaElProximoBorde = (
  tramos: TramoDeInactividad[] | undefined | null,
  ahora: Date = new Date(),
): number | null => {
  if (!tramos?.length) return null

  const bordes = new Set<number>()
  for (const tramo of tramos) {
    const desde = minutosDeLaHora(tramo.desde)
    const hasta = minutosDeLaHora(tramo.hasta)
    if (desde !== null) bordes.add(desde)
    if (hasta !== null) bordes.add(hasta)
  }
  if (bordes.size === 0) return null

  const momento = minutoDelDia(ahora)
  const segundos = ahora.getSeconds() + ahora.getMilliseconds() / 1000
  let menor = Number.POSITIVE_INFINITY
  for (const borde of bordes) {
    // Minutos hasta el borde, dando la vuelta al día si ya pasó.
    const faltan = (borde - momento + MINUTOS_DEL_DIA) % MINUTOS_DEL_DIA
    // El borde de este mismo minuto ya pasó: el próximo es dentro de un día.
    const ms = (faltan === 0 ? MINUTOS_DEL_DIA : faltan) * 60 * 1000 - segundos * 1000
    if (ms < menor) menor = ms
  }
  // Un segundo de gracia: cruzar el borde justo en el milisegundo exacto deja
  // el cálculo del lado de antes.
  return Math.max(1000, menor + 1000)
}
