export const normalizeDni = (value?: string | null): string => (value || "").replace(/\D/g, "").slice(0, 8)

export const formatDniForDisplay = (value?: string | null): string => {
  const digits = normalizeDni(value)
  if (!digits) return ""
  // Formato argentino con puntos de miles: XX.XXX.XXX
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export const isValidDni = (value: string): boolean => {
  const digits = normalizeDni(value)
  return digits.length === 7 || digits.length === 8
}

export const getDniValidationMessage = (value: string): string => {
  const digits = normalizeDni(value)

  if (!digits) return "El DNI es obligatorio"
  if (digits.length < 7 || digits.length > 8) return "El DNI debe tener 7 u 8 dígitos"
  return "DNI válido"
}
