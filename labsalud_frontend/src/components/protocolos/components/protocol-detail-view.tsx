"use client"

import type { ReactNode } from "react"
import {
  TestTube,
  CheckCircle,
  DollarSign,
  Receipt,
  RotateCcw,
  Shield,
  Stethoscope,
  CreditCard,
  Clock,
  FlaskConical,
  ChevronRight,
  Pencil,
  Plus,
  ClipboardCheck,
  FileText,
  Loader2,
} from "lucide-react"
import { Button } from "../../ui/button"
import { Badge } from "../../ui/badge"
import { Switch } from "../../ui/switch"
import { InitialsAvatar } from "@/components/common/initials-avatar"
import { StatusPill } from "@/components/common/status-pill"
import { AuditTimelineMini } from "@/components/common/audit-timeline-mini"
import { getPreauthStatusInfo } from "@/lib/status-styles"
import { cn } from "@/lib/utils"
import type {
  ProtocolAuditEvent,
  ProtocolDetail as ProtocolDetailType,
  UnplannedTransaction,
} from "@/types"

export interface ProtocolDetailViewData {
  id: number
  status?: { id?: number; name?: string }
  patient?: { id: number; dni?: string; is_anonymous?: boolean }
  doctor?: { license?: string }
  insurance?: { name?: string }
  affiliate_number?: string
  // Pago (desglose)
  amount_due?: string
  private_amount_due?: string
  patient_paid?: string
  amount_pending?: string
  amount_to_return?: string
  analyses_amount_due?: string
  coseguro_amount?: string
  material_descartable_amount?: string
  derivacion_amount?: string
  extras_total?: string
  unplanned_transactions?: UnplannedTransaction[]
  trajo_orden?: string
  preauth_status?: string
  preauth_reference?: string
  details?: ProtocolDetailType[]
}

export interface ProtocolDetailViewProps {
  detail: ProtocolDetailViewData
  patientName: string
  patientAge?: number
  patientSex?: string
  doctorName: string
  insuranceName: string
  sendMethodName: string
  statusId: number
  statusName: string
  // acciones
  onReport: () => void
  onPayment: () => void
  onEdit: () => void
  onCancel: () => void
  onUncancel: () => void
  onArca: () => void
  onOrderStatus: () => void
  onPreauth: () => void
  onCoseguro: () => void
  onHistory: () => void
  onUnplanned: () => void
  onToggleAuthorization: (detail: ProtocolDetailType) => void
  updatingDetailId: number | null
  auditEvents: ProtocolAuditEvent[]
  onGoResults: () => void
  onGoValidation: () => void
  onGoPatient: () => void
  // flags
  isEditable: boolean
  showReports: boolean
  canBeCancelled: boolean
  isCancelled: boolean
  canUncancel: boolean
  showOrderAction: boolean
  showPreauthAction: boolean
  showCoseguroAction: boolean
}

const money = (v?: string | null) =>
  `$${Number.parseFloat(v || "0").toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const nonZero = (v?: string | null) => Math.abs(Number.parseFloat(v || "0")) > 0.001

function orderStatusInfo(s?: string) {
  if (s === "completa") return { label: "Completa", cls: "bg-emerald-100 text-emerald-700" }
  if (s === "incompleta") return { label: "Incompleta", cls: "bg-amber-100 text-amber-700" }
  if (s === "no_trajo") return { label: "No trajo la orden", cls: "bg-red-100 text-red-700" }
  return { label: "—", cls: "bg-gray-100 text-gray-600" }
}

function Section({ icon: Icon, title, actions, children }: { icon: typeof Shield; title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-800">
          <Icon className="h-5 w-5 text-[#204983]" />
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  )
}

function SidebarCard({ icon: Icon, title, actions, children }: { icon: typeof Shield; title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <Icon className="h-4 w-4 text-gray-400" />
          {title}
        </h3>
        {actions}
      </div>
      {children}
    </section>
  )
}

function Row({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={cn("text-right text-sm text-gray-800", strong && "font-bold")}>{value}</span>
    </div>
  )
}

export function ProtocolDetailView(props: ProtocolDetailViewProps) {
  const {
    detail,
    patientName,
    patientAge,
    patientSex,
    doctorName,
    insuranceName,
    sendMethodName,
    statusName,
    onReport,
    onPayment,
    onEdit,
    onCancel,
    onUncancel,
    onArca,
    onOrderStatus,
    onPreauth,
    onCoseguro,
    onHistory,
    onUnplanned,
    onToggleAuthorization,
    updatingDetailId,
    auditEvents,
    onGoResults,
    onGoValidation,
    onGoPatient,
    isEditable,
    showReports,
    canBeCancelled,
    isCancelled,
    canUncancel,
    showOrderAction,
    showPreauthAction,
    showCoseguroAction,
  } = props

  const details = detail.details ?? []
  const isPrivate = (insuranceName || "").toLowerCase() === "particular"
  const unplanned = detail.unplanned_transactions ?? []
  const balancePending = Number.parseFloat(detail.amount_pending || "0")
  const toReturn = Number.parseFloat(detail.amount_to_return || "0")
  const isPendingValidation = detail.status?.id === 2 || detail.status?.id === 11

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* ===== Columna principal ===== */}
      <div className="space-y-4 lg:col-span-2">
        {/* Cabecera: identidad + estado */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <InitialsAvatar name={patientName} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">Protocolo #{detail.id}</span>
                  <StatusPill statusName={statusName} />
                </div>
                <button
                  type="button"
                  onClick={onGoPatient}
                  className="group flex items-center gap-1 text-left text-xl font-bold text-gray-800 hover:text-[#204983]"
                >
                  {patientName}
                  <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
                {!detail.patient?.is_anonymous && (
                  <p className="text-sm text-gray-500">
                    DNI {detail.patient?.dni}
                    {typeof patientAge === "number" && ` · ${patientAge} años`}
                    {patientSex && ` · ${patientSex === "M" ? "Masculino" : patientSex === "F" ? "Femenino" : patientSex}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {showReports && (
                <Button size="sm" variant="outline" onClick={onReport}>
                  <FileText className="mr-1.5 h-4 w-4" />
                  Reportes
                </Button>
              )}
              {isCancelled
                ? canUncancel && (
                    <Button size="sm" variant="outline" onClick={onUncancel}>
                      <RotateCcw className="mr-1.5 h-4 w-4" />
                      Reactivar
                    </Button>
                  )
                : canBeCancelled && (
                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={onCancel}>
                      Cancelar protocolo
                    </Button>
                  )}
            </div>
          </div>
        </section>

        {/* Análisis: cargar resultados + autorización por análisis */}
        <Section
          icon={FlaskConical}
          title={`Análisis (${details.length})`}
          actions={
            <div className="flex gap-2">
              {isPendingValidation && (
                <Button size="sm" variant="outline" onClick={onGoValidation}>
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  Validar
                </Button>
              )}
              <Button size="sm" className="bg-[#204983] hover:bg-[#1a3d6f]" onClick={onGoResults}>
                <TestTube className="mr-1.5 h-4 w-4" />
                Cargar resultados
              </Button>
            </div>
          }
        >
          {details.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin análisis cargados</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {details.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      title={
                        d.is_valid ? "Resultado validado" : d.is_loaded ? "Resultado cargado, sin validar" : "Resultado sin cargar"
                      }
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-xs font-medium",
                        d.is_valid
                          ? "bg-emerald-100 text-emerald-700"
                          : d.is_loaded
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {d.code}
                    </span>
                    <span className="truncate text-sm font-medium text-gray-800">{d.name}</span>
                    {d.is_urgent && <Badge className="bg-rose-100 text-rose-700">Urgente</Badge>}
                  </div>
                  {isPrivate ? (
                    <Badge className="shrink-0 bg-amber-100 text-amber-700">Particular</Badge>
                  ) : (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={cn("text-xs", d.is_authorized ? "text-emerald-600" : "text-amber-600")}>
                        {d.is_authorized ? "Cubre OOSS" : "Particular"}
                      </span>
                      {updatingDetailId === d.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : (
                        <Switch
                          checked={d.is_authorized}
                          disabled={!isEditable}
                          onCheckedChange={() => onToggleAuthorization(d)}
                          className="scale-90 data-[state=checked]:bg-emerald-500"
                        />
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

      </div>

      {/* ===== Columna lateral ===== */}
      <div className="space-y-4">
        {/* Obra social: afiliado + orden + preauth */}
        <SidebarCard
          icon={Shield}
          title="Obra social"
          actions={
            isEditable && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#204983]" onClick={onEdit}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Editar
              </Button>
            )
          }
        >
          <Row label="Entidad" value={insuranceName || "Particular"} />
          {detail.affiliate_number && <Row label="N° afiliado" value={detail.affiliate_number} />}

          {/* Estados visibles sin abrir diálogos; el botón queda para cambiarlos. */}
          {showOrderAction && (
            <div className="flex items-center justify-between gap-2 py-1">
              <span className="text-sm text-gray-500">Orden médica</span>
              <div className="flex items-center gap-1.5">
                <Badge className={cn("font-normal", orderStatusInfo(detail.trajo_orden).cls)}>
                  {orderStatusInfo(detail.trajo_orden).label}
                </Badge>
                <button onClick={onOrderStatus} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-[#204983]" title="Cambiar estado de la orden">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          {showPreauthAction && (
            <div className="flex items-center justify-between gap-2 py-1">
              <span className="text-sm text-gray-500">Preautorización</span>
              <div className="flex items-center gap-1.5">
                <Badge className={cn("border font-normal", getPreauthStatusInfo(detail.preauth_status as never).badge)}>
                  {getPreauthStatusInfo(detail.preauth_status as never).label}
                </Badge>
                <button onClick={onPreauth} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-[#204983]" title="Cambiar preautorización">
                  <Shield className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </SidebarCard>

        {/* Médico */}
        <SidebarCard icon={Stethoscope} title="Médico solicitante">
          <Row label="Profesional" value={doctorName || "—"} />
          {detail.doctor?.license && <Row label="Matrícula" value={detail.doctor.license} />}
        </SidebarCard>

        {/* Facturación: desglose + pagos + ARCA */}
        <SidebarCard icon={CreditCard} title="Facturación">
          {nonZero(detail.analyses_amount_due) && <Row label="Análisis particulares" value={money(detail.analyses_amount_due)} />}
          {nonZero(detail.coseguro_amount) && <Row label="Coseguro" value={money(detail.coseguro_amount)} />}
          {nonZero(detail.material_descartable_amount) && <Row label="Material descartable" value={money(detail.material_descartable_amount)} />}
          {nonZero(detail.derivacion_amount) && <Row label="Derivación" value={money(detail.derivacion_amount)} />}

          {unplanned.length > 0 && (
            <div className="mt-1 border-t border-gray-100 pt-1">
              {unplanned.map((t) => (
                <Row
                  key={t.id}
                  label={
                    <span className="flex items-center gap-1">
                      <span className={cn("inline-block h-1.5 w-1.5 rounded-full", t.kind === "charge" ? "bg-red-400" : "bg-emerald-400")} />
                      {t.description}
                    </span>
                  }
                  value={<span className={t.kind === "charge" ? "text-red-600" : "text-emerald-600"}>{t.kind === "charge" ? "+" : "−"}{money(t.amount)}</span>}
                />
              ))}
            </div>
          )}

          <div className="mt-1 border-t border-gray-100 pt-1">
            <Row label="Total a pagar" value={money(detail.private_amount_due ?? detail.amount_due)} strong />
            <Row label="Pagado" value={<span className="text-emerald-600">{money(detail.patient_paid)}</span>} />
            {balancePending > 0 ? (
              <Row label="Saldo" value={<span className="font-semibold text-red-600">Debe {money(detail.amount_pending)}</span>} />
            ) : toReturn > 0 ? (
              <Row label="A favor del paciente" value={<span className="font-semibold text-amber-600">{money(detail.amount_to_return)}</span>} />
            ) : (
              <Row label="Saldo" value={<span className="font-medium text-emerald-600">Saldado</span>} />
            )}
            <Row label="Envío de resultados" value={sendMethodName || "—"} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            <Button size="sm" className="bg-[#204983] hover:bg-[#1a3d6f]" onClick={onPayment}>
              <DollarSign className="mr-1.5 h-4 w-4" />
              Registrar pago
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onUnplanned}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Pago/cargo extra
              </Button>
              {showCoseguroAction && (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onCoseguro}>
                  <Receipt className="mr-1 h-3.5 w-3.5" />
                  Coseguro
                </Button>
              )}
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onArca}>
              <Receipt className="mr-1 h-3.5 w-3.5" />
              Facturar a ARCA
            </Button>
          </div>
        </SidebarCard>

        {/* Historial: últimos 5 eventos amigables + ver completo */}
        <SidebarCard
          icon={Clock}
          title="Historial"
          actions={
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#204983]" onClick={onHistory}>
              Ver completo
            </Button>
          }
        >
          <AuditTimelineMini events={auditEvents} />
        </SidebarCard>
      </div>
    </div>
  )
}
