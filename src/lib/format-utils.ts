// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

// El backend serializa las fechas/horas YA en hora Argentina (offset -03:00),
// así que ese es el valor correcto a mostrar. Fijamos la zona horaria del
// laboratorio en el formateo para que el horario NO dependa de la zona horaria
// de la máquina del usuario (si no, `toLocaleString` lo convertiría y cambiaría
// la hora). Así se muestra tal cual lo manda el backend.
export const LAB_TIME_ZONE = "America/Argentina/Cordoba"

export const formatUtils = {
  // Formatear DNI con puntos de miles (XX.XXX.XXX)
  formatDni: (dni: string): string => {
    const digits = dni.replace(/\D/g, "")
    if (digits.length >= 7 && digits.length <= 8) {
      return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }
    return dni
  },

  // Formatear fecha para input
  formatDateForInput: (dateString: string): string => {
    if (!dateString) return ""

    if (dateString.includes("/")) {
      const parts = dateString.split("/")
      if (parts[0].length === 4) {
        const [year, month, day] = parts
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      } else {
        const [day, month, year] = parts
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      }
    }
    return dateString.split("T")[0]
  },

  // Formatear fecha para mostrar
  formatDateForDisplay: (dateString: string): string => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  },

  // Formatear nombre completo
  formatFullName: (firstName: string, lastName: string): string => {
    return `${firstName || ""} ${lastName || ""}`.trim()
  },

  // Limpiar solo números
  extractNumbers: (value: string): string => {
    return value.replace(/\D/g, "")
  },

  // Capitalizar primera letra
  capitalize: (text: string): string => {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  },

  // Formatear teléfono
  formatPhone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  },
}

/**
 * Parsea una fecha que viene del backend (UTC) de forma robusta.
 * El backend envía `str (utc)` pero puede o no tener el sufijo `Z`.
 * Si falta el sufijo de zona horaria, JS lo interpretaría como hora local
 * y mostraría la hora incorrecta (con offset).
 *
 * Esta función fuerza la interpretación UTC cuando no hay zona horaria explícita.
 */
export const parseUtcDate = (value: string | null | undefined): Date | null => {
  if (!value) return null
  const trimmed = value.trim()

  // Si ya tiene zona horaria (Z, +HH:MM, -HH:MM) o es solo fecha, dejarlo tal cual
  const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)
  const hasTime = trimmed.includes("T") || /\d{2}:\d{2}/.test(trimmed)

  let isoCandidate = trimmed.replace(" ", "T")

  if (hasTime && !hasTimezone) {
    isoCandidate = `${isoCandidate}Z`
  }

  const parsed = new Date(isoCandidate)
  if (isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

/**
 * Formatea una fecha UTC del backend en hora local Argentina, mostrando fecha y hora completas.
 */
export const formatUtcDateTime = (value: string | null | undefined): string => {
  const parsed = parseUtcDate(value)
  if (!parsed) return "Sin fecha"
  return parsed.toLocaleString("es-AR", {
    timeZone: LAB_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

/**
 * Formatea solo la fecha (sin hora) en formato local Argentina.
 */
export const formatUtcDate = (value: string | null | undefined): string => {
  const parsed = parseUtcDate(value)
  if (!parsed) return "Sin fecha"
  return parsed.toLocaleDateString("es-AR", {
    timeZone: LAB_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}
