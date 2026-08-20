import type {
  BioUnitValue,
  NamedReferenceRange,
  ReferenceRange,
  ReferenceRangeEvaluation,
  ReferenceValues,
} from "@/types"

const referenceGroupLabels: Record<string, string> = {
  hombre_mayor: "Hombre adulto",
  mujer_mayor: "Mujer adulta",
  nino: "Niño",
  nina: "Niña",
  neonato: "Neonato",
}

export const formatReferenceGroup = (group: string): string => referenceGroupLabels[group] || group

const analysisCategoryLabels: Record<string, string> = {
  pmo: "PMO",
  pe: "PE",
  gestion: "Gestión",
}

/** Etiqueta legible de la categoría NBU del análisis ("" o desconocida → ""). */
export const formatAnalysisCategory = (category?: string): string =>
  category ? analysisCategoryLabels[category] || category : ""

/**
 * Los límites de un rango, como se leen.
 *
 * El rango puede ser abierto: con un solo límite es `> 4,5` o `< 5,9`, que es
 * lo que imprime el informe. Mostrarlo como `4,5 - -` decía otra cosa que el
 * papel que se lleva el paciente.
 */
export const formatReferenceBounds = (minValue?: string, maxValue?: string): string => {
  const min = (minValue || "").trim()
  const max = (maxValue || "").trim()
  if (min && max) return `${min} - ${max}`
  if (min) return `> ${min}`
  if (max) return `< ${max}`
  return ""
}

export const formatReferenceRange = (range: ReferenceRange): string =>
  `${formatReferenceGroup(range.group)}: ${formatReferenceBounds(range.min_value, range.max_value) || "-"}`

/** Un rango con nombre: el nombre lo puso el laboratorio y va tal cual. */
export const formatNamedReferenceRange = (range: NamedReferenceRange): string =>
  `${range.label}: ${formatReferenceBounds(range.min_value, range.max_value) || "-"}`

/** Los rangos con nombre que tengan algún límite, en orden. */
export const formatNamedReferenceRanges = (ranges?: NamedReferenceRange[]): string[] =>
  (ranges || [])
    .filter((range) => range.label && formatReferenceBounds(range.min_value, range.max_value))
    .map(formatNamedReferenceRange)

export const formatReferenceValues = (values?: ReferenceValues): string[] => {
  if (!values) return []

  return Object.entries(values)
    .filter(([, bounds]) => bounds && (bounds.min || bounds.max))
    .map(([group, bounds]) => `${formatReferenceGroup(group)}: ${formatReferenceBounds(bounds?.min, bounds?.max) || "-"}`)
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
