import type { BioUnitValue, ReferenceRange, ReferenceRangeEvaluation, ReferenceValues } from "@/types"

const referenceGroupLabels: Record<string, string> = {
  hombre_mayor: "Hombre adulto",
  mujer_mayor: "Mujer adulta",
  nino: "Niño",
  nina: "Niña",
}

export const formatReferenceGroup = (group: string): string => referenceGroupLabels[group] || group

export const formatReferenceRange = (range: ReferenceRange): string => {
  const min = range.min_value || "-"
  const max = range.max_value || "-"
  return `${formatReferenceGroup(range.group)}: ${min} - ${max}`
}

export const formatReferenceValues = (values?: ReferenceValues): string[] => {
  if (!values) return []

  return Object.entries(values)
    .filter(([, bounds]) => bounds && (bounds.min || bounds.max))
    .map(([group, bounds]) => `${formatReferenceGroup(group)}: ${bounds?.min || "-"} - ${bounds?.max || "-"}`)
}

export const formatBioUnitValues = (values?: BioUnitValue[]): string[] => {
  if (!values?.length) return []

  return [...values]
    .sort((a, b) => a.year - b.year)
    .map((item) => `${item.year}: ${item.value || "N/A"}`)
}

export const getReferenceEvaluationLabel = (evaluation?: ReferenceRangeEvaluation | null): string => {
  switch (evaluation?.status) {
    case "in_range":
      return "Dentro de rango"
    case "out_of_range":
      return "Fuera de rango"
    case "no_applicable_reference":
      return "Sin referencia aplicable"
    case "no_reference":
      return "Sin referencia"
    case "uncheckable":
      return "No evaluable"
    default:
      return "No evaluado"
  }
}

export const formatEvaluatedReference = (evaluation?: ReferenceRangeEvaluation | null): string | null => {
  if (!evaluation?.reference) return null
  return formatReferenceRange(evaluation.reference)
}
