export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Sin fecha"

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date

    if (isNaN(dateObj.getTime())) {
      return "Fecha inválida"
    }

    return dateObj.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return "Fecha inválida"
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "Sin fecha"

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date

    if (isNaN(dateObj.getTime())) {
      return "Fecha inválida"
    }

    return dateObj.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "Fecha inválida"
  }
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "Sin hora"

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date

    if (isNaN(dateObj.getTime())) {
      return "Hora inválida"
    }

    return dateObj.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "Hora inválida"
  }
}

export function calculateAge(birthDate: Date | string | null | undefined): number {
  if (!birthDate) return 0

  try {
    const birthDateObj = typeof birthDate === "string" ? new Date(birthDate) : birthDate

    if (isNaN(birthDateObj.getTime())) {
      return 0
    }

    const today = new Date()
    let age = today.getFullYear() - birthDateObj.getFullYear()
    const monthDiff = today.getMonth() - birthDateObj.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--
    }

    return age
  } catch {
    return 0
  }
}

export function isValidDate(date: unknown): boolean {
  return date instanceof Date && !isNaN(date.getTime())
}

export function parseDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString)
    return isValidDate(date) ? date : null
  } catch {
    return null
  }
}
