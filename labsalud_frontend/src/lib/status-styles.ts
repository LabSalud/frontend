import type { PaymentStatus, PreauthStatus } from "@/types"

export const PROTOCOL_STATUS_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12] as const

export type ProtocolStatusId = (typeof PROTOCOL_STATUS_IDS)[number]

type ProtocolStatusStyle = {
  id: ProtocolStatusId
  statsKey:
    | "pendingEntry"
    | "pendingValidation"
    | "incompletePayment"
    | "cancelled"
    | "completed"
    | "pendingRetiro"
    | "sendFailed"
    | "pendingBilling"
    | "pendingDelivery"
    | "pendingReview"
    | "missingInfo"
  label: string
  shortLabel: string
  badge: string
  badgeOutline: string
  card: string
  text: string
  icon: string
  solid: string
  border: string
}

const fallbackProtocolStatusStyle: Omit<ProtocolStatusStyle, "id" | "statsKey"> = {
  label: "Desconocido",
  shortLabel: "Sin estado",
  badge: "bg-gray-100 text-gray-800",
  badgeOutline: "bg-gray-100 text-gray-800 border-gray-300",
  card: "bg-gray-50",
  text: "text-gray-700",
  icon: "text-gray-400",
  solid: "bg-gray-500 hover:bg-gray-600",
  border: "border-l-gray-500",
}

export const PROTOCOL_STATUS_STYLES: Record<ProtocolStatusId, ProtocolStatusStyle> = {
  1: {
    id: 1,
    statsKey: "pendingEntry",
    label: "Pendiente de carga",
    shortLabel: "Pend. Carga",
    badge: "bg-yellow-100 text-yellow-800",
    badgeOutline: "bg-yellow-100 text-yellow-800 border-yellow-300",
    card: "bg-yellow-50",
    text: "text-yellow-700",
    icon: "text-yellow-500",
    solid: "bg-yellow-500 hover:bg-yellow-600",
    border: "border-l-yellow-500",
  },
  2: {
    id: 2,
    statsKey: "pendingValidation",
    label: "Pendiente de validación",
    shortLabel: "Pend. Validación",
    badge: "bg-cyan-100 text-cyan-800",
    badgeOutline: "bg-cyan-100 text-cyan-800 border-cyan-300",
    card: "bg-cyan-50",
    text: "text-cyan-700",
    icon: "text-cyan-500",
    solid: "bg-cyan-500 hover:bg-cyan-600",
    border: "border-l-cyan-500",
  },
  3: {
    id: 3,
    statsKey: "incompletePayment",
    label: "Pago incompleto",
    shortLabel: "Pago Incompleto",
    badge: "bg-orange-100 text-orange-800",
    badgeOutline: "bg-orange-100 text-orange-800 border-orange-300",
    card: "bg-orange-50",
    text: "text-orange-700",
    icon: "text-orange-500",
    solid: "bg-orange-500 hover:bg-orange-600",
    border: "border-l-orange-500",
  },
  4: {
    id: 4,
    statsKey: "cancelled",
    label: "Cancelado",
    shortLabel: "Cancelado",
    badge: "bg-red-100 text-red-800",
    badgeOutline: "bg-red-100 text-red-800 border-red-300",
    card: "bg-red-50",
    text: "text-red-700",
    icon: "text-red-500",
    solid: "bg-red-500 hover:bg-red-600",
    border: "border-l-red-500",
  },
  5: {
    id: 5,
    statsKey: "completed",
    label: "Completado",
    shortLabel: "Completado",
    badge: "bg-emerald-100 text-emerald-800",
    badgeOutline: "bg-emerald-100 text-emerald-800 border-emerald-300",
    card: "bg-emerald-50",
    text: "text-emerald-700",
    icon: "text-emerald-500",
    solid: "bg-emerald-500 hover:bg-emerald-600",
    border: "border-l-emerald-500",
  },
  6: {
    id: 6,
    statsKey: "pendingRetiro",
    label: "Pendiente de retiro",
    shortLabel: "Pend. Retiro",
    badge: "bg-violet-100 text-violet-800",
    badgeOutline: "bg-violet-100 text-violet-800 border-violet-300",
    card: "bg-violet-50",
    text: "text-violet-700",
    icon: "text-violet-500",
    solid: "bg-violet-500 hover:bg-violet-600",
    border: "border-l-violet-500",
  },
  7: {
    id: 7,
    statsKey: "sendFailed",
    label: "Envío fallido",
    shortLabel: "Envío Fallido",
    badge: "bg-rose-100 text-rose-800",
    badgeOutline: "bg-rose-100 text-rose-800 border-rose-300",
    card: "bg-rose-50",
    text: "text-rose-700",
    icon: "text-rose-500",
    solid: "bg-rose-500 hover:bg-rose-600",
    border: "border-l-rose-500",
  },
  8: {
    id: 8,
    statsKey: "pendingBilling",
    label: "Pendiente de facturación",
    shortLabel: "Pend. Facturación",
    badge: "bg-teal-100 text-teal-800",
    badgeOutline: "bg-teal-100 text-teal-800 border-teal-300",
    card: "bg-teal-50",
    text: "text-teal-700",
    icon: "text-teal-500",
    solid: "bg-teal-500 hover:bg-teal-600",
    border: "border-l-teal-500",
  },
  10: {
    id: 10,
    statsKey: "pendingDelivery",
    label: "Pendiente de envío",
    shortLabel: "Pend. Envío",
    badge: "bg-blue-100 text-blue-800",
    badgeOutline: "bg-blue-100 text-blue-800 border-blue-300",
    card: "bg-blue-50",
    text: "text-blue-700",
    icon: "text-blue-500",
    solid: "bg-blue-500 hover:bg-blue-600",
    border: "border-l-blue-500",
  },
  11: {
    id: 11,
    statsKey: "pendingReview",
    label: "Pendiente de revisión",
    shortLabel: "Pend. Revisión",
    badge: "bg-fuchsia-100 text-fuchsia-800",
    badgeOutline: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
    card: "bg-fuchsia-50",
    text: "text-fuchsia-700",
    icon: "text-fuchsia-500",
    solid: "bg-fuchsia-500 hover:bg-fuchsia-600",
    border: "border-l-fuchsia-500",
  },
  12: {
    id: 12,
    statsKey: "missingInfo",
    label: "Información faltante",
    shortLabel: "Info Faltante",
    badge: "bg-amber-100 text-amber-800",
    badgeOutline: "bg-amber-100 text-amber-800 border-amber-300",
    card: "bg-amber-50",
    text: "text-amber-800",
    icon: "text-amber-500",
    solid: "bg-amber-500 hover:bg-amber-600",
    border: "border-l-amber-500",
  },
}

export const PROTOCOL_STATUS_STATS_KEY: Record<number, string> = Object.fromEntries(
  Object.values(PROTOCOL_STATUS_STYLES).map((style) => [style.id, style.statsKey]),
)

export const ALLOWED_PROTOCOL_STATUS_FILTERS = PROTOCOL_STATUS_IDS.filter((id) => id !== 8)

export const getProtocolStatusStyle = (statusId?: number | null) => {
  if (statusId && statusId in PROTOCOL_STATUS_STYLES) {
    return PROTOCOL_STATUS_STYLES[statusId as ProtocolStatusId]
  }
  return fallbackProtocolStatusStyle
}

export const getProtocolStatusBadgeClass = (statusId?: number | null, outlined = false) => {
  const style = getProtocolStatusStyle(statusId)
  return outlined ? style.badgeOutline : style.badge
}

export const getProtocolStatusButtonClass = (statusId: number, selected: boolean) =>
  selected ? getProtocolStatusStyle(statusId).solid : ""

export const getPaymentStatusInfo = (paymentStatus?: PaymentStatus | null) => {
  if (!paymentStatus) {
    return {
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      borderColor: "border-gray-200",
      badge: "bg-gray-100 text-gray-700 border-gray-200",
      label: "Sin estado",
    }
  }

  switch (paymentStatus.id) {
    case 1:
      return {
        color: "text-emerald-700",
        bgColor: "bg-emerald-100",
        borderColor: "border-emerald-200",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: paymentStatus.name,
      }
    case 2:
      return {
        color: "text-orange-700",
        bgColor: "bg-orange-100",
        borderColor: "border-orange-200",
        badge: "bg-orange-50 text-orange-700 border-orange-200",
        label: paymentStatus.name,
      }
    case 3:
      return {
        color: "text-amber-700",
        bgColor: "bg-amber-100",
        borderColor: "border-amber-200",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        label: paymentStatus.name,
      }
    default:
      return {
        color: "text-gray-600",
        bgColor: "bg-gray-100",
        borderColor: "border-gray-200",
        badge: "bg-gray-100 text-gray-700 border-gray-200",
        label: paymentStatus.name,
      }
  }
}

export const getPreauthStatusInfo = (status?: PreauthStatus | null) => {
  switch (status) {
    case "completa":
      return {
        label: "Preauth completa",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        iconClassName: "text-emerald-500",
      }
    case "incompleta":
      return {
        label: "Preauth incompleta",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        iconClassName: "text-amber-500",
      }
    case "no_trajo":
      return {
        label: "Sin preauth",
        badge: "bg-red-50 text-red-700 border-red-200",
        iconClassName: "text-red-500",
      }
    case "not_required":
      return {
        label: "Preauth no requerida",
        badge: "bg-gray-50 text-gray-700 border-gray-200",
        iconClassName: "text-gray-400",
      }
    default:
      return {
        label: "Preauth sin estado",
        badge: "bg-gray-50 text-gray-700 border-gray-200",
        iconClassName: "text-gray-400",
      }
  }
}
