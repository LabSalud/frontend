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
