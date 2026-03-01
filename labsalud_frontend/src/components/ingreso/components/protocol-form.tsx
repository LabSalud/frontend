"use client"

import { User, Stethoscope, Building, TestTube, Send, DollarSign, RefreshCw } from "lucide-react"
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
import type { Patient, Doctor, Insurance, SelectedAnalysis, SendMethod } from "../../../types"

interface Totals {
  authorizedTotal: number
  privateTotal: number
  total: number
  patientOwes: number
  authorizedUb: number
  privateUb: number
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
  isRefund: boolean
  isPrivateInsurance: boolean
  totals: Totals
  onAnalysisChange: (analyses: SelectedAnalysis[]) => void
  onDoctorSelect: (doctor: Doctor | null) => void
  onInsuranceSelect: (insurance: Insurance | null) => void
  onSendMethodSelect: (sendMethod: SendMethod | null) => void
  onPatientFound: (patient: Patient) => void
  onPatientNotFound: (dni: string) => void
  onReset: () => void
  onShowCreateMedico: () => void
  onShowCreateObraSocial: () => void
  onPatientPaidChange: (value: string) => void
  onAffiliateNumberChange: (number: string) => void
  onRefundChange: (isRefund: boolean) => void
}

export function ProtocolForm({
  doctors,
  insurances,
  sendMethods,
  selectedAnalyses,
  selectedDoctor,
  selectedInsurance,
  selectedSendMethod,
  patientPaid,
  affiliateNumber,
  isRefund,
  isPrivateInsurance,
  totals,
  onAnalysisChange,
  onDoctorSelect,
  onInsuranceSelect,
  onSendMethodSelect,
  onPatientFound,
  onPatientNotFound,
  onReset,
  onShowCreateMedico,
  onShowCreateObraSocial,
  onPatientPaidChange,
  onAffiliateNumberChange,
  onRefundChange,
}: ProtocolFormProps) {
  const paidAmount = Number.parseFloat(patientPaid) || 0
  const remaining = Math.max(0, totals.patientOwes - paidAmount)

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
          <PatientSearch onPatientFound={onPatientFound} onPatientNotFound={onPatientNotFound} onReset={onReset} />
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
            <h3 className="text-base sm:text-lg font-semibold text-[#204983]">Obra Social</h3>
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
        />

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
