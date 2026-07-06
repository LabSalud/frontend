import { useState } from "react"
import { toast } from "sonner"
import {
  MOCK_ENTITIES,
  MOCK_OSS_ENTITY,
  MOCK_PENDING_PROTOCOLS,
  MOCK_PRESENTATIONS,
  MOCK_REMINDER_PHONES,
  MOCK_REMINDER_DAYS_BEFORE,
  type BillingEntityId,
  type Presentation,
  type PendingProtocol,
  type ReminderPhone,
} from "./mock-data"

// Simula la latencia de red del prototipo (el backend real todavía no existe).
const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Estado + acciones del prototipo de facturación, 100% en memoria. Cuando el
 * backend implemente los endpoints de doc/facturacion-rediseno-backend-prompt.md,
 * este hook se reemplaza por uno que hace fetch/mutate reales; la forma de los
 * datos y de las acciones ya está pensada para ese reemplazo.
 */
export function useFacturacionMock() {
  const [presentations, setPresentations] = useState<Presentation[]>(MOCK_PRESENTATIONS)
  const [pendingProtocols, setPendingProtocols] = useState<PendingProtocol[]>(MOCK_PENDING_PROTOCOLS)
  const [reminderPhones, setReminderPhones] = useState<ReminderPhone[]>(MOCK_REMINDER_PHONES)
  const [reminderDaysBefore, setReminderDaysBefore] = useState(MOCK_REMINDER_DAYS_BEFORE)
  const [markingProtocolId, setMarkingProtocolId] = useState<number | null>(null)

  const entities = MOCK_ENTITIES

  const openPresentationFor = (entityId: BillingEntityId) =>
    presentations.find((p) => p.entityId === entityId && p.status === "abierta") ?? null

  const historyFor = (entityId: BillingEntityId) =>
    presentations.filter((p) => p.entityId === entityId && p.status !== "abierta").sort((a, b) => b.id - a.id)

  /** Todas las presentaciones de una entidad (incluye la abierta), para el gráfico. */
  const presentationsFor = (entityId: BillingEntityId) =>
    presentations.filter((p) => p.entityId === entityId).sort((a, b) => a.id - b.id)

  const pendingProtocolsFor = (entityId: BillingEntityId) =>
    pendingProtocols.filter((p) => MOCK_OSS_ENTITY[p.ossId] === entityId)

  const markProtocolBilled = async (protocolId: number) => {
    const protocol = pendingProtocols.find((p) => p.protocolId === protocolId)
    if (!protocol) return
    setMarkingProtocolId(protocolId)
    try {
      await delay()
      const entityId = MOCK_OSS_ENTITY[protocol.ossId]
      setPresentations((prev) =>
        prev.map((pres) => {
          if (pres.entityId !== entityId || pres.status !== "abierta") return pres
          const existing = pres.ossBreakdown.find((o) => o.ossId === protocol.ossId)
          if (existing) {
            return {
              ...pres,
              ossBreakdown: pres.ossBreakdown.map((o) =>
                o.ossId === protocol.ossId
                  ? { ...o, protocolsCount: o.protocolsCount + 1, totalUb: o.totalUb + protocol.totalUb }
                  : o,
              ),
            }
          }
          return {
            ...pres,
            ossBreakdown: [
              ...pres.ossBreakdown,
              {
                ossId: protocol.ossId,
                ossName: protocol.ossName,
                protocolsCount: 1,
                totalUb: protocol.totalUb,
                ubValue: null,
                expectedAmount: null,
                collectedAmount: null,
              },
            ],
          }
        }),
      )
      setPendingProtocols((prev) => prev.filter((p) => p.protocolId !== protocolId))
      toast.success(`Protocolo #${protocolId} marcado como facturado`)
    } finally {
      setMarkingProtocolId(null)
    }
  }

  const saveUbValue = async (presentationId: number, ossId: number, value: number) => {
    await delay()
    setPresentations((prev) =>
      prev.map((pres) =>
        pres.id !== presentationId
          ? pres
          : {
              ...pres,
              ossBreakdown: pres.ossBreakdown.map((o) =>
                o.ossId === ossId ? { ...o, ubValue: value, expectedAmount: o.totalUb * value } : o,
              ),
            },
      ),
    )
    toast.success("Valor UB cargado, monto esperado recalculado")
  }

  const saveCollected = async (presentationId: number, ossId: number, value: number) => {
    await delay()
    setPresentations((prev) =>
      prev.map((pres) =>
        pres.id !== presentationId
          ? pres
          : {
              ...pres,
              ossBreakdown: pres.ossBreakdown.map((o) => (o.ossId === ossId ? { ...o, collectedAmount: value } : o)),
            },
      ),
    )
    toast.success("Monto cobrado cargado")
  }

  const saveCollectedTotal = async (presentationId: number, value: number) => {
    await delay()
    setPresentations((prev) =>
      prev.map((pres) => (pres.id !== presentationId ? pres : { ...pres, collectedTotal: value, status: "cobrada" })),
    )
    toast.success("Monto total cobrado cargado")
  }

  const closePresentation = async (entityId: BillingEntityId, nextCloseDate: string | null) => {
    await delay()
    const current = openPresentationFor(entityId)
    if (!current) return
    const today = new Date().toISOString().slice(0, 10)
    setPresentations((prev) => [
      ...prev.map((p) => (p.id === current.id ? { ...p, status: "cerrada" as const, closedAt: today } : p)),
      {
        id: Math.max(...prev.map((p) => p.id)) + 1,
        entityId,
        label: "Presentación en curso",
        periodStart: today,
        periodEnd: nextCloseDate ?? "",
        status: "abierta",
        closeDate: nextCloseDate,
        closedAt: null,
        ossBreakdown: [],
        collectedTotal: null,
        particularAmount: 0,
      },
    ])
    toast.success(nextCloseDate ? `Presentación cerrada. Próximo cierre: ${nextCloseDate}` : "Presentación cerrada. Fecha de próximo cierre pendiente.")
  }

  /** Editar la fecha de cierre objetivo de la presentación abierta, en cualquier momento. */
  const setTargetCloseDate = async (presentationId: number, date: string) => {
    await delay(200)
    setPresentations((prev) => prev.map((p) => (p.id === presentationId ? { ...p, closeDate: date } : p)))
    toast.success(`Fecha de cierre actualizada: ${date}`)
  }

  const addReminderPhone = async (label: string, phone: string) => {
    await delay(200)
    setReminderPhones((prev) => [...prev, { id: Math.max(0, ...prev.map((p) => p.id)) + 1, label, phone, active: true }])
    toast.success("Número agregado")
  }

  const togglePhone = async (id: number, active: boolean) => {
    await delay(150)
    setReminderPhones((prev) => prev.map((p) => (p.id === id ? { ...p, active } : p)))
  }

  const removePhone = async (id: number) => {
    await delay(150)
    setReminderPhones((prev) => prev.filter((p) => p.id !== id))
    toast.success("Número eliminado")
  }

  const changeDaysBefore = async (days: number) => {
    await delay(150)
    setReminderDaysBefore(days)
    toast.success(`Ahora se avisa ${days} días antes del cierre`)
  }

  return {
    entities,
    openPresentationFor,
    historyFor,
    presentationsFor,
    pendingProtocolsFor,
    markingProtocolId,
    markProtocolBilled,
    saveUbValue,
    saveCollected,
    saveCollectedTotal,
    closePresentation,
    setTargetCloseDate,
    reminderPhones,
    reminderDaysBefore,
    addReminderPhone,
    togglePhone,
    removePhone,
    changeDaysBefore,
  }
}
