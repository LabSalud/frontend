"use client"

import type { KeyboardEvent } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  User,
  Stethoscope,
  Building,
  TestTube,
  Send,
  DollarSign,
  RefreshCw,
  ClipboardCheck,
  ShieldCheck,
  Receipt,
  Plus,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card"
import { Switch } from "../../ui/switch"
import { Label } from "../../ui/label"
import { Input } from "../../ui/input"
import { Button } from "../../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { PatientSearch } from "./patient-search"
import { MedicoCombobox } from "./medico-combobox"
import { ObraSocialCombobox } from "./obra-social-combobox"
import { AnalysisSearch } from "./analysis-search"
import { AnalysisTable } from "./analysis-table"
import { TRAJO_ORDEN_OPTIONS, type TrajoOrdenStatus } from "@/lib/protocol-order"
import type {
  Patient,
  Doctor,
  Insurance,
  SelectedAnalysis,
  SendMethod,
  PreauthStatus,
  UnplannedTransactionInput,
} from "../../../types"

type CreationPreauthStatus = Exclude<PreauthStatus, "not_required">
type StatusOption<T extends string> = { value: T; label: string; description: string }
type StatusTone = "complete" | "partial" | "missing"

const PREAUTH_OPTIONS: Array<StatusOption<CreationPreauthStatus>> = [
  {
    value: "completa",
    label: "Completa",
    description: "El paciente trajo la preautorización final. Los análisis no cubiertos se cobran particular.",
  },
  {
    value: "incompleta",
    label: "Incompleta",
    description: "Falta gestionar o traer otra preautorización para análisis pendientes.",
  },
  {
    value: "no_trajo",
    label: "No la trajo",
    description: "No hay preautorización presentada todavía; se cobra como particular hasta regularizar.",
  },
]

const getStatusTone = (value: string): StatusTone => {
  if (value === "completa") return "complete"
  if (value === "incompleta") return "partial"
  return "missing"
}

const toneClasses: Record<StatusTone, { selected: string; unselected: string; icon: string }> = {
  complete: {
    selected: "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200",
    unselected: "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/60",
    icon: "text-emerald-600",
  },
  partial: {
    selected: "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-200",
    unselected: "border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50/60",
    icon: "text-amber-600",
  },
  missing: {
    selected: "border-red-600 bg-red-50 text-red-900 ring-2 ring-red-200",
    unselected: "border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50/60",
    icon: "text-red-600",
  },
}

const statusIcons = {
  complete: CheckCircle2,
  partial: AlertTriangle,
  missing: CircleX,
}

function StatusButtonGroup<T extends string>({
  labelId,
  options,
  value,
  onChange,
}: {
  labelId: string
  options: Array<StatusOption<T>>
  value: T | ""
  onChange: (value: T) => void
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return
    event.preventDefault()
    const currentIndex = Math.max(0, options.findIndex((option) => option.value === value))
    const lastIndex = options.length - 1
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? lastIndex
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
            ? currentIndex === 0
              ? lastIndex
              : currentIndex - 1
            : currentIndex === lastIndex
              ? 0
              : currentIndex + 1

    onChange(options[nextIndex].value)
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className="grid gap-2 sm:grid-cols-3"
      onKeyDown={handleKeyDown}
    >
      {options.map((option, optionIndex) => {
        const tone = getStatusTone(option.value)
        const Icon = statusIcons[tone]
        const isSelected = value === option.value
        const descriptionId = `${labelId}-${option.value}-description`

        return (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            role="radio"
            aria-checked={isSelected}
            aria-describedby={descriptionId}
            tabIndex={isSelected || (!value && optionIndex === 0) ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`h-auto min-h-24 justify-start whitespace-normal rounded-md border p-3 text-left transition ${
              isSelected ? toneClasses[tone].selected : toneClasses[tone].unselected
            }`}
          >
            <span className="flex w-full items-start gap-2">
              <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${toneClasses[tone].icon}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">{option.label}</span>
                <span id={descriptionId} className="mt-1 block text-xs leading-snug opacity-80">
                  {option.description}
                </span>
              </span>
            </span>
          </Button>
        )
      })}
    </div>
  )
}

interface Totals {
  authorizedTotal: number
  privateTotal: number
  total: number
  patientOwes: number
  authorizedUb: number
  privateUb: number
  extrasTotal: number
}

interface ProtocolFormProps {
  patient: Patient | null
  doctors: Doctor[]
  insurances: Insurance[]
  sendMethods: SendMethod[]
  selectedAnalyses: SelectedAnalysis[]
  selectedDoctor: Doctor | null
  selectedInsurance: Insurance | null
  selectedSendMethod: SendMethod | null
  patientPaid: string
  affiliateNumber: string
  trajoOrden: TrajoOrdenStatus | ""
  preauthStatus: PreauthStatus | ""
  isRefund: boolean
  isPrivateInsurance: boolean
  shouldShowOrder: boolean
  shouldShowPreauth: boolean
  shouldChargeMaterial: boolean
  shouldChargeDerivacion: boolean
  shouldChargeCoseguro: boolean
  extraAmounts: {
    material_descartable_amount: string
    derivacion_amount: string
  }
  coseguroAmount: string
  unplannedTransactions: UnplannedTransactionInput[]
  totals: Totals
  onAnalysisChange: (analyses: SelectedAnalysis[]) => void
  onDoctorSelect: (doctor: Doctor | null) => void
  onInsuranceSelect: (insurance: Insurance | null) => void
  onSendMethodSelect: (sendMethod: SendMethod | null) => void
  onPatientFound: (patient: Patient) => void
  onPatientNotFound: (dni: string) => void
  onCreateAnonymous?: () => void
  onReset: () => void
  onShowCreateMedico: () => void
  onShowCreateObraSocial: () => void
  onPatientPaidChange: (value: string) => void
  onAffiliateNumberChange: (number: string) => void
  onTrajoOrdenChange: (trajoOrden: TrajoOrdenStatus | "") => void
  onPreauthStatusChange: (status: PreauthStatus | "") => void
  onExtraAmountsChange: (amounts: { material_descartable_amount: string; derivacion_amount: string }) => void
  onCoseguroChange: (value: string) => void
  onUnplannedTransactionsChange: (items: UnplannedTransactionInput[]) => void
  onRefundChange: (isRefund: boolean) => void
}

export function ProtocolForm({
  patient,
  doctors,
  insurances,
  sendMethods,
  selectedAnalyses,
  selectedDoctor,
  selectedInsurance,
  selectedSendMethod,
  patientPaid,
  affiliateNumber,
  trajoOrden,
  preauthStatus,
  isRefund,
  isPrivateInsurance,
  shouldShowOrder,
  shouldShowPreauth,
  shouldChargeMaterial,
  shouldChargeDerivacion,
  shouldChargeCoseguro,
  extraAmounts,
  coseguroAmount,
  unplannedTransactions,
  totals,
  onAnalysisChange,
  onDoctorSelect,
  onInsuranceSelect,
  onSendMethodSelect,
  onPatientFound,
  onPatientNotFound,
  onCreateAnonymous,
  onReset,
  onShowCreateMedico,
  onShowCreateObraSocial,
  onPatientPaidChange,
  onAffiliateNumberChange,
  onTrajoOrdenChange,
  onPreauthStatusChange,
  onExtraAmountsChange,
  onCoseguroChange,
  onUnplannedTransactionsChange,
  onRefundChange,
}: ProtocolFormProps) {
  const isAnonymousPatient = Boolean(patient?.is_anonymous)
  const paidAmount = Number.parseFloat(patientPaid) || 0
  const remaining = Math.max(0, totals.patientOwes - paidAmount)

  const addUnplanned = () =>
    onUnplannedTransactionsChange([...unplannedTransactions, { kind: "charge", description: "", amount: "" }])
  const updateUnplanned = (index: number, patch: Partial<UnplannedTransactionInput>) =>
    onUnplannedTransactionsChange(
      unplannedTransactions.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    )
  const removeUnplanned = (index: number) =>
    onUnplannedTransactionsChange(unplannedTransactions.filter((_, i) => i !== index))

  const handlePatientPaidChange = (value: string) => {
    onPatientPaidChange(value)
  }

  const handleFillTotal = () => {
    onPatientPaidChange(totals.patientOwes.toFixed(2))
  }

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="text-center text-[#204983] text-lg sm:text-xl">Configuración del Protocolo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Patient Search */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-[#204983]" />
            <h3 className="text-base sm:text-lg font-semibold text-[#204983]">Paciente</h3>
          </div>
          <PatientSearch
            onPatientFound={onPatientFound}
            onPatientNotFound={onPatientNotFound}
            onReset={onReset}
            onCreateAnonymous={onCreateAnonymous}
          />
        </div>

        {/* Doctor Selection */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-[#204983]" />
            <h3 className="text-base sm:text-lg font-semibold text-[#204983]">Médico</h3>
          </div>
          <MedicoCombobox
            medicos={doctors}
            selectedMedico={selectedDoctor}
            onMedicoSelect={onDoctorSelect}
            onShowCreateMedico={onShowCreateMedico}
          />
        </div>

        {/* Insurance Selection */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 sm:h-5 sm:w-5 text-[#204983]" />
            <h3 className="text-base sm:text-lg font-semibold text-[#204983]">
              Obra Social {isAnonymousPatient && <span className="text-xs font-normal text-amber-700">(opcional - paciente anónimo)</span>}
            </h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="sm:flex-grow">
              <ObraSocialCombobox
                obrasSociales={insurances}
                selectedObraSocial={selectedInsurance}
                onObraSocialSelect={onInsuranceSelect}
                onShowCreateObraSocial={onShowCreateObraSocial}
              />
            </div>
            {!isPrivateInsurance && selectedInsurance && (
              <div className="sm:w-1/3">
                <Input
                  placeholder="Número de afiliado *"
                  value={affiliateNumber}
                  onChange={(e) => onAffiliateNumberChange(e.target.value)}
                  className="h-10 w-full"
                  required
                />
              </div>
            )}
          </div>
          {selectedInsurance && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
              <span>
                Valor UB O.S.: <strong className="text-[#204983]">${selectedInsurance.ub_value}</strong>
              </span>
              <span>
                Valor UB Particular: <strong className="text-[#204983]">${selectedInsurance.private_ub_value}</strong>
              </span>
            </div>
          )}
        </div>

        {selectedInsurance && !isPrivateInsurance && (
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-[#204983]" />
              <h3 className="text-base sm:text-lg font-semibold text-[#204983]">Tipo de Cobertura</h3>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Switch id="refund" checked={isRefund} onCheckedChange={onRefundChange} />
              <Label htmlFor="refund" className="text-sm sm:text-base cursor-pointer">
                A reintegro
              </Label>
              <span className="text-xs text-gray-500">
                {isRefund
                  ? "(El paciente paga todo y la obra social le reintegra)"
                  : "(La obra social paga directamente lo autorizado)"}
              </span>
            </div>
          </div>
        )}

        {/* Send Method Selection */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 sm:h-5 sm:w-5 text-[#204983]" />
            <h3 className="text-base sm:text-lg font-semibold text-[#204983]">Método de Envío</h3>
          </div>
          <Select
            value={selectedSendMethod?.id.toString() || ""}
            onValueChange={(value) => {
              const method = sendMethods.find((m) => m.id.toString() === value)
              onSendMethodSelect(method || null)
            }}
          >
            <SelectTrigger className="h-9 sm:h-10">
              <SelectValue placeholder="Seleccionar método" />
            </SelectTrigger>
            <SelectContent>
              {sendMethods.map((method) => (
                <SelectItem key={method.id} value={method.id.toString()}>
                  {method.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {shouldShowOrder && (
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 text-[#204983]" />
              <h3 className="text-base sm:text-lg font-semibold text-[#204983]">Orden médica</h3>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <Label id="trajo-orden-label" className="text-sm sm:text-base">
                Estado de la orden *
              </Label>
              <div className="mt-2">
                <StatusButtonGroup
                  labelId="trajo-orden-label"
                  options={TRAJO_ORDEN_OPTIONS}
                  value={trajoOrden}
                  onChange={onTrajoOrdenChange}
                />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Todas las obras sociales requieren orden. Particular no la solicita.
              </p>
            </div>
          </div>
        )}

        {(shouldShowPreauth || shouldChargeMaterial || shouldChargeDerivacion || shouldChargeCoseguro) && (
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-[#204983]" />
              <h3 className="text-base sm:text-lg font-semibold text-[#204983]">Condiciones de la obra social</h3>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-3">
              {shouldShowPreauth && (
                <div className="space-y-2">
                  <Label id="preauth-status-label" className="text-sm sm:text-base">
                    Estado de la preautorización *
                  </Label>
                  <StatusButtonGroup
                    labelId="preauth-status-label"
                    options={PREAUTH_OPTIONS}
                    value={preauthStatus === "not_required" ? "" : preauthStatus}
                    onChange={onPreauthStatusChange}
                  />
                  <p className="text-xs text-blue-800">
                    Marcá en la tabla qué análisis cubre la OOSS. Los no cubiertos se cobran particular y no vuelven
                    incompleta la preautorización.
                  </p>
                  {preauthStatus && (
                    <p className="text-xs text-gray-600">
                      {PREAUTH_OPTIONS.find((option) => option.value === preauthStatus)?.description}
                    </p>
                  )}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {shouldChargeMaterial && (
                  <div className="space-y-1.5">
                    <Label htmlFor="material-descartable-protocol">Material descartable</Label>
                    <Input
                      id="material-descartable-protocol"
                      type="number"
                      min="0"
                      step="0.01"
                      value={extraAmounts.material_descartable_amount}
                      onChange={(event) =>
                        onExtraAmountsChange({
                          ...extraAmounts,
                          material_descartable_amount: event.target.value,
                        })
                      }
                      className="bg-white"
                    />
                  </div>
                )}
                {shouldChargeDerivacion && (
                  <div className="space-y-1.5">
                    <Label htmlFor="derivacion-protocol">Derivación</Label>
                    <Input
                      id="derivacion-protocol"
                      type="number"
                      min="0"
                      step="0.01"
                      value={extraAmounts.derivacion_amount}
                      onChange={(event) =>
                        onExtraAmountsChange({
                          ...extraAmounts,
                          derivacion_amount: event.target.value,
                        })
                      }
                      className="bg-white"
                    />
                  </div>
                )}
                {shouldChargeCoseguro && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="coseguro-protocol">
                      Coseguro <span className="text-xs font-normal text-gray-500">(monto informado por la OOSS al autorizar)</span>
                    </Label>
                    <Input
                      id="coseguro-protocol"
                      type="number"
                      min="0"
                      step="0.01"
                      value={coseguroAmount}
                      onChange={(event) => onCoseguroChange(event.target.value)}
                      placeholder="0.00"
                      className="bg-white"
                    />
                    <p className="text-xs text-blue-800">Se suma a lo que paga el paciente. Si no lo sabés ahora, dejalo vacío y se carga después.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analysis Search */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2">
            <TestTube className="h-4 w-4 sm:h-5 sm:w-5 text-[#204983]" />
            <h3 className="text-base sm:text-lg font-semibold text-[#204983]">Búsqueda de Análisis</h3>
          </div>
          <AnalysisSearch selectedAnalyses={selectedAnalyses} onAnalysisChange={onAnalysisChange} />
        </div>

        {/* Analysis Table with Authorization */}
        <AnalysisTable
          selectedAnalyses={selectedAnalyses}
          onAnalysisChange={onAnalysisChange}
          selectedInsurance={selectedInsurance}
          isPrivateInsurance={isPrivateInsurance}
          forcePrivateAnalyses={shouldShowPreauth && preauthStatus === "no_trajo"}
        />

        {/* Cobros / pagos no contemplados */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-[#204983]" />
              <h3 className="text-base sm:text-lg font-semibold text-[#204983]">Cobros / pagos no contemplados</h3>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addUnplanned} className="bg-transparent">
              <Plus className="mr-1 h-4 w-4" />
              Agregar
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Cargos o pagos que no encajan en los conceptos estándar (envío, transferencia, etc.). Suman al balance del
            protocolo. No se facturan a ARCA.
          </p>
          {unplannedTransactions.length > 0 && (
            <div className="space-y-2">
              {unplannedTransactions.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-2 rounded-md border border-gray-200 bg-gray-50 p-2 sm:grid-cols-[110px_minmax(0,1fr)_120px_auto] sm:items-end"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={item.kind}
                      onValueChange={(v: "charge" | "payment") => updateUnplanned(index, { kind: v })}
                    >
                      <SelectTrigger className="bg-white h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="charge">Cobro</SelectItem>
                        <SelectItem value="payment">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Descripción</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateUnplanned(index, { description: e.target.value })}
                      placeholder="Ej: envío a domicilio"
                      className="bg-white h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Monto</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) => updateUnplanned(index, { amount: e.target.value })}
                      placeholder="0.00"
                      className="bg-white h-9"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUnplanned(index)}
                    className="h-9 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedAnalyses.length > 0 && selectedInsurance && (
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-[#204983]" />
              <h3 className="text-base sm:text-lg font-semibold text-[#204983]">Resumen de Pago</h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {/* Totals breakdown */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {!isPrivateInsurance && (
                  <>
                    <div className="text-gray-600">Subtotal Obra Social:</div>
                    <div className="text-right font-medium">
                      ${totals.authorizedTotal.toFixed(2)}
                      <span className="text-xs text-gray-500 ml-1">({totals.authorizedUb.toFixed(2)} UB)</span>
                    </div>
                  </>
                )}

                <div className="text-gray-600">Subtotal Particular:</div>
                <div className="text-right font-medium">
                  ${totals.privateTotal.toFixed(2)}
                  <span className="text-xs text-gray-500 ml-1">({totals.privateUb.toFixed(2)} UB)</span>
                </div>

                {totals.extrasTotal > 0 && (
                  <>
                    <div className="text-gray-600">Cobros extra:</div>
                    <div className="text-right font-medium">${totals.extrasTotal.toFixed(2)}</div>
                  </>
                )}

                <div className="text-gray-600 font-semibold border-t pt-2">Total:</div>
                <div className="text-right font-bold text-[#204983] border-t pt-2">${totals.total.toFixed(2)}</div>
              </div>

              {/* Patient owes section */}
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {isRefund ? "El paciente debe pagar (reintegro):" : "El paciente debe pagar:"}
                  </span>
                  <span className="text-lg font-bold text-orange-600">${totals.patientOwes.toFixed(2)}</span>
                </div>

                {/* Payment input */}
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-grow">
                    <Label htmlFor="patientPaid" className="text-sm text-gray-600 mb-1 block">
                      Monto pagado por el paciente
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="patientPaid"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={patientPaid}
                        onChange={(e) => handlePatientPaidChange(e.target.value)}
                        className="h-10"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleFillTotal}
                        className="h-10 px-3 whitespace-nowrap bg-transparent"
                        title="Completar monto total"
                      >
                        Total
                      </Button>
                    </div>
                  </div>
                  <div className="text-right sm:min-w-[120px]">
                    <span className="text-xs text-gray-500 block">Restante</span>
                    <span className={`text-lg font-bold ${remaining > 0 ? "text-red-600" : "text-green-600"}`}>
                      ${remaining.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
