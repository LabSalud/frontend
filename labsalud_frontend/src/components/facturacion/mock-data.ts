/**
 * Datos de ejemplo para el PROTOTIPO de facturación (rediseño 2026-07-04).
 * El backend todavía no tiene estos endpoints — ver doc/facturacion-rediseno-backend-prompt.md.
 * Reemplazar por fetch real cuando existan; las formas de acá son la referencia
 * de lo que se le pide al backend.
 */

export type BillingEntityId = "centro" | "clinica"

export interface BillingEntity {
  id: BillingEntityId
  name: string
  /** La Clínica informa el cobro discriminado por OOSS; el Centro deposita un monto único. */
  reportsBreakdownByOoss: boolean
}

export const MOCK_ENTITIES: BillingEntity[] = [
  { id: "centro", name: "Centro de Bioquímicos", reportsBreakdownByOoss: false },
  { id: "clinica", name: "La Clínica", reportsBreakdownByOoss: true },
]

/** A qué entidad se presenta cada OOSS actualmente (editable en configuración;
 * puede cambiar de una presentación a otra). */
export const MOCK_OSS_ENTITY: Record<number, BillingEntityId> = {
  1: "centro", // OSDE
  2: "clinica", // Swiss Medical
  3: "centro", // Galeno
}

export type PaperStatus = "ok" | "pendiente" | "no_aplica"

export interface PendingProtocol {
  protocolId: number
  patientName: string
  ossId: number
  ossName: string
  totalUb: number
  papers: {
    orden: PaperStatus
    preauth: PaperStatus
    resumen: PaperStatus
  }
}

export const MOCK_PENDING_PROTOCOLS: PendingProtocol[] = [
  {
    protocolId: 4821,
    patientName: "María Gómez",
    ossId: 1,
    ossName: "OSDE",
    totalUb: 120,
    papers: { orden: "ok", preauth: "no_aplica", resumen: "ok" },
  },
  {
    protocolId: 4830,
    patientName: "Juan Pérez",
    ossId: 1,
    ossName: "OSDE",
    totalUb: 85,
    papers: { orden: "ok", preauth: "ok", resumen: "pendiente" },
  },
  {
    protocolId: 4835,
    patientName: "Lucía Fernández",
    ossId: 2,
    ossName: "Swiss Medical",
    totalUb: 200,
    papers: { orden: "pendiente", preauth: "ok", resumen: "ok" },
  },
  {
    protocolId: 4840,
    patientName: "Roberto Sosa",
    ossId: 3,
    ossName: "Galeno",
    totalUb: 60,
    papers: { orden: "ok", preauth: "no_aplica", resumen: "ok" },
  },
]

export interface OssBreakdown {
  ossId: number
  ossName: string
  protocolsCount: number
  totalUb: number
  /** null hasta que la OOSS publica el valor y el usuario lo carga. */
  ubValue: number | null
  expectedAmount: number | null
  /** Cargado cuando llega el desglose (ej. la Clínica); null si aún no se cobró. */
  collectedAmount: number | null
}

export interface Presentation {
  id: number
  entityId: BillingEntityId
  label: string
  periodStart: string
  periodEnd: string
  status: "abierta" | "cerrada" | "cobrada"
  /** Fecha objetivo de cierre. Editable en cualquier momento; puede quedar
   * "pendiente" (null) — no es obligatoria para cerrar la presentación. */
  closeDate: string | null
  closedAt: string | null
  ossBreakdown: OssBreakdown[]
  /** Para entidades sin desglose por OOSS (ej. el Centro): un solo depósito. */
  collectedTotal: number | null
  differenceReason?: string
  /** Lo cobrado a pacientes particulares en el período de esta presentación.
   * NO se factura a ninguna entidad (Centro/Clínica); se muestra aparte solo
   * a modo informativo. Ocasionalmente se factura a ARCA si el paciente pide
   * comprobante (flujo ya existente en el detalle del protocolo). */
  particularAmount: number
}

export const MOCK_PRESENTATIONS: Presentation[] = [
  // Centro: sin desglose por OOSS al cobrar
  {
    id: 101,
    entityId: "centro",
    label: "1ra quincena julio",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-15",
    status: "abierta",
    closeDate: "2026-07-15",
    closedAt: null,
    ossBreakdown: [
      { ossId: 1, ossName: "OSDE", protocolsCount: 2, totalUb: 205, ubValue: null, expectedAmount: null, collectedAmount: null },
      { ossId: 3, ossName: "Galeno", protocolsCount: 1, totalUb: 60, ubValue: null, expectedAmount: null, collectedAmount: null },
    ],
    collectedTotal: null,
    particularAmount: 48200,
  },
  {
    id: 100,
    entityId: "centro",
    label: "2da quincena junio",
    periodStart: "2026-06-16",
    periodEnd: "2026-06-30",
    status: "cobrada",
    closeDate: "2026-06-30",
    closedAt: "2026-06-30",
    ossBreakdown: [
      { ossId: 1, ossName: "OSDE", protocolsCount: 5, totalUb: 480, ubValue: 410, expectedAmount: 196800, collectedAmount: null },
      { ossId: 3, ossName: "Galeno", protocolsCount: 3, totalUb: 150, ubValue: 420, expectedAmount: 63000, collectedAmount: null },
    ],
    collectedTotal: 250000,
    differenceReason: "OOSS pagó menos de lo esperado; a confirmar motivo con Galeno.",
    particularAmount: 62500,
  },
  {
    id: 99,
    entityId: "centro",
    label: "1ra quincena junio",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-15",
    status: "cobrada",
    closeDate: "2026-06-15",
    closedAt: "2026-06-15",
    ossBreakdown: [
      { ossId: 1, ossName: "OSDE", protocolsCount: 4, totalUb: 390, ubValue: 405, expectedAmount: 157950, collectedAmount: null },
      { ossId: 3, ossName: "Galeno", protocolsCount: 2, totalUb: 100, ubValue: 415, expectedAmount: 41500, collectedAmount: null },
    ],
    collectedTotal: 199450,
    particularAmount: 55100,
  },

  // Clínica: desglose por OOSS al cobrar
  {
    id: 201,
    entityId: "clinica",
    label: "1ra quincena julio",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-15",
    status: "abierta",
    // Sin fecha de cierre definida todavía: queda "pendiente" hasta que se cargue.
    closeDate: null,
    closedAt: null,
    ossBreakdown: [
      { ossId: 2, ossName: "Swiss Medical", protocolsCount: 1, totalUb: 200, ubValue: null, expectedAmount: null, collectedAmount: null },
    ],
    collectedTotal: null,
    particularAmount: 21300,
  },
  {
    id: 200,
    entityId: "clinica",
    label: "2da quincena junio",
    periodStart: "2026-06-16",
    periodEnd: "2026-06-30",
    status: "cobrada",
    closeDate: "2026-06-30",
    closedAt: "2026-06-30",
    ossBreakdown: [
      { ossId: 2, ossName: "Swiss Medical", protocolsCount: 6, totalUb: 640, ubValue: 460, expectedAmount: 294400, collectedAmount: 294400 },
    ],
    collectedTotal: null,
    particularAmount: 38900,
  },
  {
    id: 199,
    entityId: "clinica",
    label: "1ra quincena junio",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-15",
    status: "cobrada",
    closeDate: "2026-06-15",
    closedAt: "2026-06-15",
    ossBreakdown: [
      { ossId: 2, ossName: "Swiss Medical", protocolsCount: 5, totalUb: 520, ubValue: 450, expectedAmount: 234000, collectedAmount: 234000 },
    ],
    collectedTotal: null,
    particularAmount: 29700,
  },
]

export interface ReminderPhone {
  id: number
  label: string
  phone: string
  active: boolean
}

export const MOCK_REMINDER_PHONES: ReminderPhone[] = [
  { id: 1, label: "Bioquímica", phone: "+54 9 11 5555-0101", active: true },
  { id: 2, label: "Secretaría", phone: "+54 9 11 5555-0202", active: true },
]

export const MOCK_REMINDER_DAYS_BEFORE = 5
