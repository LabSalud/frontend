export const TRAJO_ORDEN = {
  NO: "no_trajo",
  INCOMPLETA: "incompleta",
  COMPLETA: "completa",
} as const

export type TrajoOrdenStatus = (typeof TRAJO_ORDEN)[keyof typeof TRAJO_ORDEN]

export const TRAJO_ORDEN_OPTIONS: Array<{ value: TrajoOrdenStatus; label: string; description: string }> = [
  {
    value: TRAJO_ORDEN.COMPLETA,
    label: "Orden completa",
    description: "Cubre todos los análisis del protocolo.",
  },
  {
    value: TRAJO_ORDEN.INCOMPLETA,
    label: "Orden incompleta",
    description: "La orden cubre menos análisis que el protocolo.",
  },
  {
    value: TRAJO_ORDEN.NO,
    label: "No trajo orden",
    description: "El paciente todavía no entregó la orden médica.",
  },
]

export const normalizeTrajoOrden = (value: unknown): TrajoOrdenStatus => {
  if (value === true || value === 1 || value === "1" || value === "true") return TRAJO_ORDEN.COMPLETA
  if (value === false || value === 0 || value === "0" || value === "false") return TRAJO_ORDEN.NO
  if (value === TRAJO_ORDEN.INCOMPLETA) return TRAJO_ORDEN.INCOMPLETA
  if (value === TRAJO_ORDEN.NO) return TRAJO_ORDEN.NO
  return TRAJO_ORDEN.COMPLETA
}

export const isTrajoOrdenCompleta = (value: unknown) => normalizeTrajoOrden(value) === TRAJO_ORDEN.COMPLETA

export const getTrajoOrdenInfo = (value: unknown) => {
  const status = normalizeTrajoOrden(value)

  if (status === TRAJO_ORDEN.COMPLETA) {
    return {
      status,
      label: "Completa",
      description: "Orden médica completa",
      iconClassName: "text-emerald-500",
      badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    }
  }

  if (status === TRAJO_ORDEN.INCOMPLETA) {
    return {
      status,
      label: "Incompleta",
      description: "Orden médica incompleta",
      iconClassName: "text-amber-500",
      badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
    }
  }

  return {
    status,
    label: "Pendiente",
    description: "Orden médica pendiente",
    iconClassName: "text-red-500",
    badgeClassName: "border-red-200 bg-red-50 text-red-700",
  }
}
