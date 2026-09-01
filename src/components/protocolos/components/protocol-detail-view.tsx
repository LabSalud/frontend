"use client"

import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import {
  BookOpen,
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
  Minus,
  Mail,
  MessageCircle,
  Printer,
} from "lucide-react"
import { ListaOrdenable } from "@/components/common/lista-ordenable"
import { Button } from "../../ui/button"
import { Badge } from "../../ui/badge"
import { Switch } from "../../ui/switch"
import { InitialsAvatar } from "@/components/common/initials-avatar"
import { StatusPill } from "@/components/common/status-pill"
import { AuditTimelineMini } from "@/components/common/audit-timeline-mini"
import { getPreauthStatusInfo, getSendMethodInfo } from "@/lib/status-styles"
import { isActoBioquimico } from "@/lib/codigos-analisis"
import { cn } from "@/lib/utils"
import { MensajesDeWhatsApp } from "./mensajes-de-whatsapp"
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
  insurance?: { name?: string; chooses_billing_entity?: boolean }
  affiliate_number?: string
  /** Por dónde se le entrega el resultado al paciente. */
  send_method?: { id?: number; name?: string }
  /** A qué entidad se le presenta ESTE protocolo. Solo la eligen las obras
   *  sociales que facturan por Centro o por Clínica según la preautorización. */
  billing_entity?: { id: number; name: string } | null
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
  statusId: number
  statusName: string
  // acciones
  onReport: () => void
  onPayment: () => void
  onCancel: () => void
  onUncancel: () => void
  onArca: () => void
  onOrderStatus: () => void
  onPreauth: () => void
  onCoseguro: () => void
  onEntidadDeFacturacion: () => void
  onMedico: () => void
  onObraSocial: () => void
  onHistory: () => void
  onUnplanned: () => void
  onToggleAuthorization: (detail: ProtocolDetailType) => void
  updatingDetailId: number | null
  /** Alta, baja y orden de los análisis. Sin ellas la sección es de solo lectura. */
  onQuitarAnalisis?: (detail: ProtocolDetailType) => void
  onAgregarAnalisis?: () => void
  onReordenarAnalisis?: (ordenados: ProtocolDetailType[]) => void
  quitandoDetalle?: number | null
  auditEvents: ProtocolAuditEvent[]
  onGoResults: () => void
  onGoValidation: () => void
  onGoPatient: () => void
  // flags
  isEditable: boolean
  showReports: boolean
  /** Si viene, el botón de Reportes se muestra deshabilitado con este motivo. */
  reportsDisabledReason?: string
  canBeCancelled: boolean
  isCancelled: boolean
  canUncancel: boolean
  /** Hay una cancelación o una reactivación en curso. El botón se apaga hasta
   *  que el servidor conteste: los dos endpoints tardan —recalculan estado y
   *  pagos del protocolo entero— y sin esto se puede apretar tres veces. */
  isCancelling?: boolean
  isUncancelling?: boolean
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
      {/* En un teléfono el título y los botones no entran en el mismo renglón:
          "Análisis (12)" más "Validar" más "Cargar resultados" se pisaban. Abajo
          de `sm` van apilados, con los botones ocupando el ancho. */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
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

/**
 * La UB de una práctica dentro del protocolo, y de qué nomenclador salió.
 *
 * POR QUÉ NO ES UN SOLO NÚMERO
 * ============================
 * Cada análisis tiene una cantidad de UB por nomenclador, y un protocolo usa
 * dos: el de Particular y el que usa la obra social. Cuál corre lo decide el
 * interruptor de la fila.
 *
 * Se muestra porque es de dónde sale el precio. Cuando alguien pregunta por qué
 * un análisis salió lo que salió, o por qué el mismo análisis vale distinto en
 * dos protocolos, la respuesta casi siempre es ésta —y hasta ahora había que ir
 * a buscarla al nomenclador.
 *
 * El aclarador dice de dónde salió: una obra social puede no nombrar la
 * práctica, y ahí se cobra por el nomenclador particular. Ver `get_ub` en
 * `laboratory/protocols/serializers.py`.
 */
function ubDeLaFila(d: ProtocolDetailType, isPrivate: boolean) {
  // Un análisis cobrado a precio fijo no salió de ningún nomenclador. Mostrar
  // su UB acá contestaría con un número que no participó del precio, que es
  // justo lo contrario de para qué está esta explicación.
  if (d.precio_fijo && (isPrivate || !d.is_authorized)) {
    return {
      valor: `$${d.precio_fijo}`,
      detalle: "Precio fijo cargado en el análisis: no se cobró por UB",
    }
  }
  if (isPrivate || !d.is_authorized) {
    return { valor: d.ub, detalle: "UB del nomenclador particular" }
  }
  if (d.ub_obra_social) {
    return { valor: d.ub, detalle: "UB del nomenclador de la obra social" }
  }
  return {
    valor: d.ub,
    detalle:
      "El nomenclador de la obra social no nombra esta práctica: se toma la UB de Particular",
  }
}

export function ProtocolDetailView(props: ProtocolDetailViewProps) {
  const {
    detail,
    patientName,
    patientAge,
    patientSex,
    doctorName,
    insuranceName,
    statusName,
    onReport,
    onPayment,
    onCancel,
    onUncancel,
    onArca,
    onOrderStatus,
    onPreauth,
    onCoseguro,
    onEntidadDeFacturacion,
    onMedico,
    onObraSocial,
    onHistory,
    onUnplanned,
    onToggleAuthorization,
    updatingDetailId,
    onQuitarAnalisis,
    onAgregarAnalisis,
    onReordenarAnalisis,
    quitandoDetalle,
    auditEvents,
    onGoResults,
    onGoValidation,
    onGoPatient,
    isEditable,
    showReports,
    reportsDisabledReason,
    canBeCancelled,
    isCancelled,
    canUncancel,
    isCancelling = false,
    isUncancelling = false,
    showOrderAction,
    showPreauthAction,
    showCoseguroAction,
  } = props

  const details = detail.details ?? []
  const isPrivate = (insuranceName || "").toLowerCase() === "particular"
  const envio = getSendMethodInfo(detail.send_method?.name)
  const IconoDeEnvio =
    envio.accion === "whatsapp" ? MessageCircle : envio.accion === "email" ? Mail : Printer
  const unplanned = detail.unplanned_transactions ?? []
  const balancePending = Number.parseFloat(detail.amount_pending || "0")
  const toReturn = Number.parseFloat(detail.amount_to_return || "0")
  // El total a pagar del paciente. Se mira este y no el saldo: un protocolo
  // cobrado y saldado SÍ tiene movimientos en el libro, y hay que poder ir.
  const totalAPagar = Number.parseFloat(detail.private_amount_due ?? detail.amount_due ?? "0")
  const sinNadaQueCobrar = !(totalAPagar > 0) && Number.parseFloat(detail.patient_paid || "0") <= 0
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
                // Sin permiso el botón NO se esconde: queda deshabilitado con
                // el motivo, para que se entienda por qué dejó de andar.
                //
                // EL MÉTODO DE ENVÍO VA COLGADO DEL BOTÓN
                // =======================================
                // Es lo primero que se necesita saber antes de tocarlo: si el
                // paciente retira, no hay nada que mandar; si va por WhatsApp o
                // por mail, sí. Estaba adentro del diálogo, así que para
                // saberlo había que abrirlo —y a esa altura ya se abrió por las
                // dudas—. Se sigue cambiando ahí adentro; acá solo se lee.
                <span title={reportsDisabledReason} className="inline-flex flex-col items-stretch gap-1">
                  <Button size="sm" variant="outline" onClick={onReport} disabled={Boolean(reportsDisabledReason)}>
                    <FileText className="mr-1.5 h-4 w-4" />
                    Reportes
                  </Button>
                  {/* Mientras el detalle no llegó no hay método: no se
                      inventa un "Sin método de envío" que después cambia. */}
                  {detail.send_method?.name && (
                    <Badge
                      variant="outline"
                      title={`Método de envío: ${envio.label}`}
                      className={cn("justify-center gap-1 font-normal", envio.badge)}
                    >
                      <IconoDeEnvio className="h-3 w-3" />
                      <span className="truncate">{envio.label}</span>
                    </Badge>
                  )}
                </span>
              )}
              {/* MIENTRAS EL SERVIDOR NO CONTESTA, EL BOTÓN NO SE PUEDE APRETAR.
                  Cancelar y reactivar tardan —los dos recalculan el estado y los
                  pagos del protocolo entero— y el botón se quedaba igual que
                  antes: parecía que no había pasado nada, así que se lo apretaba
                  otra vez. Ahora se apaga y dice qué está haciendo. */}
              {isCancelled
                ? canUncancel && (
                    <Button size="sm" variant="outline" onClick={onUncancel} disabled={isUncancelling}>
                      {isUncancelling ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-1.5 h-4 w-4" />
                      )}
                      {isUncancelling ? "Reactivando..." : "Reactivar"}
                    </Button>
                  )
                : canBeCancelled && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={onCancel}
                      disabled={isCancelling}
                    >
                      {isCancelling && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                      {isCancelling ? "Cancelando..." : "Cancelar protocolo"}
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
            // Los botones NO se estiran al ancho del teléfono: "Cargar
            // resultados" partido en dos renglones ocupa más y se lee peor que
            // el botón entero. Envuelven si de verdad no entran.
            <div className="flex flex-wrap gap-2">
              {isPendingValidation && (
                <Button size="sm" variant="outline" onClick={onGoValidation} className="whitespace-nowrap">
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  Validar
                </Button>
              )}
              <Button
                size="sm"
                className="whitespace-nowrap bg-[#204983] hover:bg-[#1a3d6f]"
                onClick={onGoResults}
              >
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
              <ListaOrdenable
                items={details}
                getId={(d) => d.id}
                onReorder={(ordenados) => onReordenarAnalisis?.(ordenados)}
                disabled={!isEditable || !onReordenarAnalisis}
              >
                {(d, manija) => {
                const isBillingAct = isActoBioquimico(d.code)
                const ub = ubDeLaFila(d, isPrivate)
                // Las etiquetas del análisis. Se arman una vez y se dibujan en
                // dos lugares distintos —pegadas al nombre en escritorio, en su
                // propio renglón en el teléfono— porque no es lo mismo tener
                // 900 px de ancho que 300.
                const etiquetas = (
                  <>
                    {ub.valor && (
                      <Badge
                        variant="outline"
                        title={ub.detalle}
                        className="shrink-0 border-slate-200 font-mono text-[11px] text-slate-500"
                      >
                        UB {ub.valor}
                      </Badge>
                    )}
                    {isBillingAct && (
                      <Badge variant="outline" className="shrink-0 border-slate-200 text-slate-500">
                        Sin resultado
                      </Badge>
                    )}
                    {d.is_urgent && <Badge className="shrink-0 bg-rose-100 text-rose-700">Urgente</Badge>}
                  </>
                )
                // EN UN TELÉFONO LA FILA ES UNA TARJETA DE DOS RENGLONES.
                //
                // Todo esto —quitar, manija, código, nombre, la UB, "Sin
                // resultado", "Urgente", y del otro lado "Cubre OOSS" con su
                // interruptor— entraba en un renglón solo porque en escritorio
                // sobra ancho. En 360 px lo fijo ya se come el renglón entero:
                // el nombre se achicaba hasta desaparecer y las etiquetas
                // terminaban dibujadas ENCIMA del interruptor.
                //
                // Abajo de `sm` es una grilla de dos columnas:
                //
                //     [−] [⋮⋮] [880001] Hemograma completo con
                //                       fórmula
                //     [UB 5] [Urgente]        Cubre OOSS  (o)
                //
                // El nombre entero arriba (hasta dos renglones, después corta),
                // las etiquetas abajo a la izquierda y la cobertura abajo a la
                // derecha. Cada fila tiene la misma forma, que es lo que hace
                // que una lista de doce análisis se lea de un vistazo.
                //
                // En `sm` y para arriba el `li` vuelve a ser flex, el bloque de
                // etiquetas de abajo desaparece con `sm:hidden` y queda
                // exactamente la fila de siempre.
                return (
                <li className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 py-2.5 sm:flex sm:items-center sm:justify-between sm:gap-3">
                  <div className="col-span-2 flex min-w-0 items-start gap-2.5 sm:col-span-1 sm:items-center">
                    {/* El menos va primero de todo, como pediste: la acción de
                        sacar tiene que estar en el mismo lugar en cada fila y
                        no perdida entre los datos. */}
                    {isEditable && onQuitarAnalisis && (
                      <button
                        type="button"
                        onClick={() => onQuitarAnalisis(d)}
                        disabled={quitandoDetalle === d.id || details.length <= 1}
                        title={
                          details.length <= 1
                            ? "Es el único análisis: cancelá el protocolo en su lugar"
                            : "Quitar del protocolo"
                        }
                        className="shrink-0 rounded-full border border-rose-200 p-0.5 text-rose-600
                                   transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Quitar ${d.name}`}
                      >
                        {quitandoDetalle === d.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Minus className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    {manija}
                    <span
                      title={
                        isBillingAct
                          ? "Acto de facturación: no lleva resultado"
                          : d.is_valid
                            ? "Resultado validado"
                            : d.is_loaded
                              ? "Resultado cargado, sin validar"
                              : "Resultado sin cargar"
                      }
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-xs font-medium",
                        isBillingAct
                          ? "bg-slate-100 text-slate-500"
                          : d.is_valid
                            ? "bg-emerald-100 text-emerald-700"
                            : d.is_loaded
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {d.code}
                    </span>
                    {/* `min-w-0`: sin eso un item de flex no achica por debajo de
                        su contenido y no corta nunca. En el teléfono el nombre
                        entra en dos renglones antes de cortar —es el dato que se
                        vino a leer—; en escritorio sigue siendo uno solo, que es
                        lo que mantiene la lista pareja. */}
                    <span className="min-w-0 flex-1 text-sm font-medium text-gray-800 max-sm:line-clamp-2 sm:flex-none sm:truncate">
                      {d.name}
                    </span>
                    <span className="hidden shrink-0 items-center gap-2.5 sm:flex">{etiquetas}</span>
                  </div>

                  {/* Las etiquetas, en su propio renglón y solo en el teléfono. */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:hidden">{etiquetas}</div>
                  {isPrivate ? (
                    <Badge className="shrink-0 justify-self-end bg-amber-100 text-amber-700">Particular</Badge>
                  ) : (
                    <div className="flex shrink-0 items-center justify-self-end gap-2">
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
                )
              }}
              </ListaOrdenable>
            </ul>
          )}

          {/* El botón de agregar, al final de la lista. */}
          {isEditable && onAgregarAnalisis && (
            <div className="pt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={onAgregarAnalisis}
                className="w-full border-dashed text-[#204983] hover:bg-blue-50 sm:w-auto"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Agregar análisis
              </Button>
            </div>
          )}
        </Section>

        {/* DEBAJO DE LOS ANÁLISIS, PORQUE HABLA DE ELLOS.
            Cada mensaje dice qué análisis llevaba: la pregunta que se contesta
            acá es "¿le llegó la glucemia?", y para eso hay que tener la lista
            de arriba a la vista. */}
        <MensajesDeWhatsApp protocolId={detail.id} />

      </div>

      {/* ===== Columna lateral ===== */}
      <div className="space-y-4">
        {/* Obra social: afiliado + orden + preauth */}
        <SidebarCard
          icon={Shield}
          title="Obra social"
          actions={
            isEditable && (
              <div className="flex items-center gap-1">
                {/* CAMBIAR LA OBRA SOCIAL ES OTRA COSA QUE EDITAR EL PROTOCOLO.
                    Rehace los precios del protocolo entero, así que tiene su
                    propio diálogo con su propio aviso, y no un campo más en una
                    lista de campos sueltos. */}
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#204983]" onClick={onObraSocial}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Cambiar
                </Button>
              </div>
            )
          }
        >
          <Row label="Obra social" value={insuranceName || "Particular"} />
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
        <SidebarCard
          icon={Stethoscope}
          title="Médico solicitante"
          actions={
            isEditable && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#204983]" onClick={onMedico}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Cambiar
              </Button>
            )
          }
        >
          <Row label="Profesional" value={doctorName || "—"} />
          {detail.doctor?.license && <Row label="Matrícula" value={detail.doctor.license} />}
        </SidebarCard>

        {/* Facturación: desglose + pagos + ARCA */}
        <SidebarCard icon={CreditCard} title="Facturación">
          {/* A QUÉ ENTIDAD VA ESTE PROTOCOLO.
              Solo aparece en las obras sociales que facturan por Centro o por
              Clínica según la preautorización: en las demás la entidad sale de
              la obra social y no hay nada que elegir.

              Se puede corregir porque se elige en el mostrador, con la
              preautorización en la mano, y ahí se puede errar. Una entidad
              equivocada no da ningún error: el protocolo aparece en los
              pendientes de la otra y se factura ahí. Se descubre al cerrar el
              mes, cuando ya se presentó. */}
          {detail.insurance?.chooses_billing_entity && (
            <div className="flex items-center justify-between gap-2 py-1">
              <span className="text-sm text-gray-500">Entidad a facturar</span>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-sm font-medium",
                  detail.billing_entity ? "text-gray-900" : "text-amber-700",
                )}>
                  {detail.billing_entity?.name || "Sin elegir"}
                </span>
                {isEditable && (
                  <button
                    onClick={onEntidadDeFacturacion}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-[#204983]"
                    title="Cambiar la entidad a facturar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

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

            {/* AL LIBRO, FILTRADO POR ESTE PROTOCOLO.
                Va con las otras acciones de plata porque es una más: desde ahí
                se corrigen los cargos, los montos cobrados y la forma de pago
                de un cobro que se cargó mal.

                No se esconde por permiso. Si a quien lo aprieta le falta
                `administrar_libro_diario`, se lo dice la ruta; el panel de
                corrección lo chequea y el backend lo exige. Un botón que no
                está no se puede preguntar por qué no está. */}
            {/* SIN NADA QUE COBRAR NO HAY FILA EN EL LIBRO.
                El libro lista movimientos de plata. Un protocolo que no tiene
                nada para cobrar no genera ninguno, así que el botón llevaba a
                buscar una fila que no existe. Queda deshabilitado y diciendo
                por qué, en vez de mandar a un lugar vacío. */}
            {sinNadaQueCobrar ? (
              <Button
                size="sm"
                variant="outline"
                disabled
                className="h-8 text-xs"
                title="Este protocolo no tiene nada para cobrar, así que no tiene movimientos en el libro diario."
              >
                <BookOpen className="mr-1 h-3.5 w-3.5" />
                Ver en libro diario
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 border-[#204983] text-xs text-[#204983] hover:bg-[#204983] hover:text-white"
              >
                <Link to={`/libro-diario?protocolo=${detail.id}`} data-no-expand>
                  <BookOpen className="mr-1 h-3.5 w-3.5" />
                  Ver en libro diario
                </Link>
              </Button>
            )}
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
