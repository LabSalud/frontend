export const normalizeCuil = (value: string): string => value.replace(/\D/g, "").slice(0, 11)

export const formatCuilForDisplay = (value: string): string => {
  const digits = normalizeCuil(value)

  if (digits.length <= 2) return digits
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}

export const inferGenderFromCuil = (value: string): "M" | "F" | undefined => {
  const prefix = normalizeCuil(value).slice(0, 2)

  if (prefix === "20" || prefix === "23") return "M"
  if (prefix === "27" || prefix === "24") return "F"
  return undefined
}

export const isValidCuil = (value: string): boolean => {
  const digits = normalizeCuil(value)
  if (digits.length !== 11) return false

  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = multipliers.reduce((total, multiplier, index) => total + Number(digits[index]) * multiplier, 0)
  const remainder = sum % 11
  const expectedCheckDigit = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder

  return expectedCheckDigit === Number(digits[10])
}

export const getCuilValidationMessage = (value: string): string => {
  const digits = normalizeCuil(value)

  if (!digits) return "El CUIL es obligatorio"
  if (digits.length !== 11) return "El CUIL debe tener 11 dígitos"
  if (!isValidCuil(digits)) return "El CUIL no es válido"
  return "CUIL válido"
}
