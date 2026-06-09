"use client"

import { useState, useEffect } from "react"
import { FileText } from "lucide-react"
import { Button } from "../ui/button"
import { Skeleton } from "../ui/skeleton"
import { toast } from "sonner"
import { ProtocolForm } from "./components/protocol-form"
import { PatientInfo } from "./components/patient-info"
import { DoctorInfo, InsuranceInfo } from "./components/selection-info"
import { CreatePatientForm } from "./components/create-patient-form"
import { EditPatientDialog } from "./components/edit-patient-dialog"
import { CreateMedicoForm } from "./components/create-medico-form"
import { CreateObraSocialForm } from "./components/create-obra-social-form"
import { EditMedicoDialog } from "../configuration/components/edit-medico-dialog"
import { EditObraSocialDialog } from "../configuration/components/edit-obra-social-dialog"
import { ProtocolSuccess } from "./components/protocol-success"
import { useApi } from "../../hooks/use-api"
import { CATALOG_ENDPOINTS, MEDICAL_ENDPOINTS, PROTOCOL_ENDPOINTS } from "@/config/api"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import type { TrajoOrdenStatus } from "@/lib/protocol-order"
import { useEndpointProgress } from "@/hooks/use-endpoint-progress"
import type {
  Patient,
  Doctor,
  Insurance,
  SelectedAnalysis,
  SendMethod,
  CreateProtocolInput,
  PaginatedResponse,
  Protocol,
  PricingConfig,
  PreauthStatus,
  UnplannedTransactionInput,
} from "../../types"

export default function IngresoPage() {
  const { apiRequest } = useApi()

  // Main states
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null)
  const [patientNotFound, setPatientNotFound] = useState(false)
  const [searchedCuil, setSearchedCuil] = useState("")
  const [creatingAnonymous, setCreatingAnonymous] = useState(false)
  const [selectedAnalyses, setSelectedAnalyses] = useState<SelectedAnalysis[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedInsurance, setSelectedInsurance] = useState<Insurance | null>(null)
  const [showEditPatient, setShowEditPatient] = useState(false)
  const [showEditDoctor, setShowEditDoctor] = useState(false)
  const [showEditInsurance, setShowEditInsurance] = useState(false)
  const [patientPaid, setPatientPaid] = useState("")
  const [selectedSendMethod, setSelectedSendMethod] = useState<SendMethod | null>(null)
  const [affiliateNumber, setAffiliateNumber] = useState("")
  const [trajoOrden, setTrajoOrden] = useState<TrajoOrdenStatus | "">("")
  const [preauthStatus, setPreauthStatus] = useState<PreauthStatus | "">("")
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null)
  const [extraAmounts, setExtraAmounts] = useState({
    material_descartable_amount: "",
    derivacion_amount: "",
  })
  const [coseguroAmount, setCoseguroAmount] = useState("")
  const [unplannedTransactions, setUnplannedTransactions] = useState<UnplannedTransactionInput[]>([])
  const [isRefund, setIsRefund] = useState(false)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [insurances, setInsurances] = useState<Insurance[]>([])
  const [sendMethods, setSendMethods] = useState<SendMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateMedico, setShowCreateMedico] = useState(false)
  const [showCreateObraSocial, setShowCreateObraSocial] = useState(false)
  const [successData, setSuccessData] = useState<{
    protocol: Protocol
    patient: Patient
    doctor: Doctor
    insurance: Insurance | null
    sendMethod: SendMethod
  } | null>(null)
  const createProgress = useEndpointProgress()

  useEffect(() => {
    loadInitialData()
  }, [])

  const extractErrorMessage = (errorData: unknown): string => formatApiError(errorData)

  const loadInitialData = async () => {
    try {
      setIsLoading(true)
      const [doctorsResponse, insurancesResponse, sendMethodsResponse, pricingResponse] = await Promise.all([
        apiRequest(`${MEDICAL_ENDPOINTS.DOCTORS}?limit=20&offset=0&is_active=true`),
        apiRequest(`${MEDICAL_ENDPOINTS.INSURANCES}?limit=20&offset=0&is_active=true`),
        apiRequest(PROTOCOL_ENDPOINTS.SEND_METHODS),
        apiRequest(CATALOG_ENDPOINTS.PRICING_CONFIG),
      ])

      if (doctorsResponse.ok) {
        const doctorsData: PaginatedResponse<Doctor> = await doctorsResponse.json()
        setDoctors(doctorsData.results)
      } else {
        const errorData = await doctorsResponse.json().catch(() => ({}))
        toast.error("Error al cargar médicos", { description: extractErrorMessage(errorData) })
      }

      if (insurancesResponse.ok) {
        const insurancesData: PaginatedResponse<Insurance> = await insurancesResponse.json()
        setInsurances(insurancesData.results)
      } else {
        const errorData = await insurancesResponse.json().catch(() => ({}))
        toast.error("Error al cargar obras sociales", { description: extractErrorMessage(errorData) })
      }

      if (sendMethodsResponse.ok) {
        const sendMethodsData: PaginatedResponse<SendMethod> = await sendMethodsResponse.json()
        setSendMethods(sendMethodsData.results)
      } else {
        const errorData = await sendMethodsResponse.json().catch(() => ({}))
        toast.error("Error al cargar métodos de envío", { description: extractErrorMessage(errorData) })
      }

      if (pricingResponse.ok) {
        const data: PricingConfig = await pricingResponse.json()
        setPricingConfig(data)
        setExtraAmounts({
          material_descartable_amount: data.material_descartable_amount || "0.00",
          derivacion_amount: data.derivacion_amount || "0.00",
        })
      }
    } catch (error) {
      console.error("Error loading initial data:", error)
      toast.error("Error al cargar los datos iniciales")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateTotals = () => {
    if (!selectedInsurance || selectedAnalyses.length === 0) {
      return { authorizedTotal: 0, privateTotal: 0, total: 0, patientOwes: 0, authorizedUb: 0, privateUb: 0, extrasTotal: 0 }
    }

    const insuranceUbValue = Number.parseFloat(selectedInsurance.ub_value) || 0
    const privateUbValue = selectedInsurance.private_ub_value || 0

    let authorizedUb = 0
    let privateUb = 0

    selectedAnalyses.forEach((analysis) => {
      const ub = Number.parseFloat(analysis.bio_unit) || 0
      if (selectedInsurance?.name.toLowerCase() === "particular") {
        privateUb += ub
      } else if (shouldShowPreauth && preauthStatus === "no_trajo") {
        privateUb += ub
      } else if (analysis.is_authorized) {
        authorizedUb += ub
      } else {
        privateUb += ub
      }
    })

    const authorizedTotal = authorizedUb * insuranceUbValue
    const privateTotal = privateUb * privateUbValue
    const material = shouldChargeMaterial ? Number.parseFloat(extraAmounts.material_descartable_amount) || 0 : 0
    const derivacion = shouldChargeDerivacion ? Number.parseFloat(extraAmounts.derivacion_amount) || 0 : 0
    const coseguro = shouldChargeCoseguro ? Number.parseFloat(coseguroAmount) || 0 : 0
    const unplannedCharges = unplannedTransactions
      .filter((t) => t.kind === "charge")
      .reduce((acc, t) => acc + (Number.parseFloat(t.amount) || 0), 0)
    const unplannedPayments = unplannedTransactions
      .filter((t) => t.kind === "payment")
      .reduce((acc, t) => acc + (Number.parseFloat(t.amount) || 0), 0)
    const extrasTotal = material + derivacion + coseguro + unplannedCharges
    const total = authorizedTotal + privateTotal + extrasTotal
    const patientOwes = Math.max(0, (isRefund ? total : privateTotal + extrasTotal) - unplannedPayments)

    return { authorizedTotal, privateTotal, total, patientOwes, authorizedUb, privateUb, extrasTotal }
  }

  const handleEditPatient = () => {
    setShowEditPatient(true)
  }

  const handlePatientUpdated = (updatedPatient: Patient) => {
    setCurrentPatient(updatedPatient)
    setShowEditPatient(false)
  }

  const handlePatientFound = (patient: Patient) => {
    setCurrentPatient(patient)
    setPatientNotFound(false)
    setSearchedCuil("")
  }

  const handlePatientNotFound = (cuil: string) => {
    setCurrentPatient(null)
    setPatientNotFound(true)
    setSearchedCuil(cuil)
  }

  const handlePatientCreated = (patient: Patient) => {
    setCurrentPatient(patient)
    setPatientNotFound(false)
    setSearchedCuil("")
    setCreatingAnonymous(false)
  }

  const handleCreateAnonymous = () => {
    setCurrentPatient(null)
    setSearchedCuil("")
    setPatientNotFound(true)
    setCreatingAnonymous(true)
  }

  const handleDoctorCreated = (doctor: Doctor) => {
    setDoctors([...doctors, doctor])
    setShowCreateMedico(false)
    toast.success("Médico creado exitosamente")
  }

  const handleInsuranceCreated = (insurance: Insurance) => {
    setInsurances([...insurances, insurance])
    setSelectedInsurance(insurance)
    setShowCreateObraSocial(false)
    toast.success("Obra social creada exitosamente")
  }

  const handleInsuranceSelect = (insurance: Insurance | null) => {
    setSelectedInsurance(insurance)
    setAffiliateNumber("")
    setIsRefund(false)
    setTrajoOrden("")
    setPreauthStatus("")
    setExtraAmounts({
      material_descartable_amount: pricingConfig?.material_descartable_amount || "0.00",
      derivacion_amount: pricingConfig?.derivacion_amount || "0.00",
    })
    setCoseguroAmount("")
  }

  const handleReset = () => {
    setCurrentPatient(null)
    setPatientNotFound(false)
    setSearchedCuil("")
    setCreatingAnonymous(false)
    setSelectedAnalyses([])
    setSelectedDoctor(null)
    setSelectedInsurance(null)
    setShowCreateMedico(false)
    setShowCreateObraSocial(false)
    setPatientPaid("")
    setSelectedSendMethod(null)
    setAffiliateNumber("")
    setTrajoOrden("")
    setPreauthStatus("")
    setIsRefund(false)
    setExtraAmounts({
      material_descartable_amount: pricingConfig?.material_descartable_amount || "0.00",
      derivacion_amount: pricingConfig?.derivacion_amount || "0.00",
    })
    setCoseguroAmount("")
    setUnplannedTransactions([])
  }

  const isPrivateInsurance = selectedInsurance?.name.toLowerCase() === "particular"
  const isAnonymousPatient = Boolean(currentPatient?.is_anonymous)
  const treatAsPrivate = isPrivateInsurance || (isAnonymousPatient && !selectedInsurance)
  const hasDerivationAnalysis = selectedAnalyses.some((analysis) => Boolean(analysis.requires_derivacion))
  const shouldShowOrder = Boolean(selectedInsurance && !isPrivateInsurance)
  const shouldShowPreauth = Boolean(selectedInsurance && !isPrivateInsurance && selectedInsurance.requires_preauthorization)
  const shouldChargeMaterial = Boolean(selectedInsurance && selectedInsurance.charges_material_descartable)
  const shouldChargeDerivacion = Boolean(
    selectedInsurance && selectedInsurance.charges_derivacion && hasDerivationAnalysis,
  )
  const shouldChargeCoseguro = Boolean(
    selectedInsurance && !isPrivateInsurance && selectedInsurance.charges_coseguro,
  )

  const handleDoctorUpdated = async () => {
    if (!selectedDoctor) return

    try {
      const response = await apiRequest(MEDICAL_ENDPOINTS.DOCTOR_DETAIL(selectedDoctor.id))
      if (!response.ok) {
        toast.error("No se pudo actualizar la vista del médico")
        setShowEditDoctor(false)
        return
      }
      const updatedDoctor: Doctor = await response.json()
      setSelectedDoctor(updatedDoctor)
      setDoctors((prev) => prev.map((doctor) => (doctor.id === updatedDoctor.id ? updatedDoctor : doctor)))
    } catch (error) {
      console.error("Error refreshing doctor:", error)
      toast.error("No se pudo actualizar la vista del médico")
    } finally {
      setShowEditDoctor(false)
    }
  }

  const handleInsuranceUpdated = async () => {
    if (!selectedInsurance) return

    try {
      const response = await apiRequest(MEDICAL_ENDPOINTS.INSURANCE_DETAIL(selectedInsurance.id))
      if (!response.ok) {
        toast.error("No se pudo actualizar la vista de la obra social")
        setShowEditInsurance(false)
        return
      }
      const updatedInsurance: Insurance = await response.json()
      setSelectedInsurance(updatedInsurance)
      setInsurances((prev) =>
        prev.map((insurance) => (insurance.id === updatedInsurance.id ? updatedInsurance : insurance)),
      )
    } catch (error) {
      console.error("Error refreshing insurance:", error)
      toast.error("No se pudo actualizar la vista de la obra social")
    } finally {
      setShowEditInsurance(false)
    }
  }

  const handleCreateProtocol = async () => {
    const missing: string[] = []
    if (!currentPatient) missing.push("paciente")
    if (!selectedDoctor) missing.push("médico")
    if (!isAnonymousPatient && !selectedInsurance) missing.push("obra social")
    if (selectedAnalyses.length === 0) missing.push("al menos un análisis")
    if (!selectedSendMethod) missing.push("método de envío")
    if (selectedInsurance && !isPrivateInsurance && !affiliateNumber.trim()) missing.push("número de afiliado")
    if (shouldShowOrder && !trajoOrden) missing.push("estado de la orden médica")
    if (shouldShowPreauth && !preauthStatus) missing.push("estado de la preautorización")

    if (missing.length > 0) {
      toast.error("Faltan datos para crear el protocolo", {
        description: `Completá: ${missing.join(", ")}.`,
      })
      return
    }

    if (!currentPatient || !selectedDoctor || !selectedSendMethod) {
      return
    }

    const patientForSuccess = currentPatient
    const doctorForSuccess = selectedDoctor
    const insuranceForSuccess = selectedInsurance
    const sendMethodForSuccess = selectedSendMethod

    try {
      createProgress.start()
      const currentPatientPaid = Number.parseFloat(patientPaid) || 0
      const totalValuePaid = currentPatientPaid

      const protocolData: CreateProtocolInput = {
        patient: currentPatient.id,
        doctor: selectedDoctor.id,
        send_method: selectedSendMethod.id,
        value_paid: totalValuePaid.toFixed(2),
        details: selectedAnalyses.map((analysis) => ({
          analysis: analysis.id,
          is_authorized: treatAsPrivate || preauthStatus === "no_trajo" ? false : analysis.is_authorized,
        })),
      }

      if (shouldShowOrder && trajoOrden) {
        protocolData.trajo_orden = trajoOrden
      }

      if (shouldShowPreauth && preauthStatus) {
        protocolData.preauth_status = preauthStatus
      }

      if (shouldChargeMaterial) {
        protocolData.material_descartable_amount_override = (Number.parseFloat(extraAmounts.material_descartable_amount) || 0).toFixed(2)
      }

      if (shouldChargeDerivacion) {
        protocolData.derivacion_amount_override = (Number.parseFloat(extraAmounts.derivacion_amount) || 0).toFixed(2)
      }

      // Si hay OOSS seleccionada se manda; si es anónimo sin OOSS, el backend asigna Particular
      if (selectedInsurance) {
        protocolData.insurance = selectedInsurance.id
      }

      if (selectedInsurance && !isPrivateInsurance && affiliateNumber.trim()) {
        protocolData.affiliate_number = affiliateNumber.trim()
      }

      const cleanedUnplanned = unplannedTransactions
        .map((t) => ({
          kind: t.kind,
          description: t.description.trim(),
          amount: (Number.parseFloat(t.amount) || 0).toFixed(2),
        }))
        .filter((t) => t.description !== "" && Number.parseFloat(t.amount) > 0)
      if (cleanedUnplanned.length > 0) {
        protocolData.unplanned_transactions_input = cleanedUnplanned
      }

      const protocolResponse = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOLS, {
        method: "POST",
        body: protocolData,
      })

      if (!protocolResponse.ok) {
        const errorData = await protocolResponse.json()
        console.error("Protocol creation error:", errorData)
        toast.error("Error al crear el protocolo", { description: extractErrorMessage(errorData) })
        createProgress.finish()
        return
      }

      const newProtocol = await protocolResponse.json()

      // Coseguro: monto opcional que da la OOSS. Se carga via endpoint dedicado.
      const coseguroValue = Number.parseFloat(coseguroAmount) || 0
      if (shouldChargeCoseguro && coseguroValue > 0) {
        try {
          const coseguroRes = await apiRequest(PROTOCOL_ENDPOINTS.SET_COSEGURO(newProtocol.id), {
            method: "POST",
            body: { amount: coseguroValue.toFixed(2) },
          })
          if (!coseguroRes.ok) {
            const errorData = await coseguroRes.json().catch(() => ({}))
            toast.warning("Protocolo creado, pero falló el coseguro", {
              description: extractErrorMessage(errorData),
            })
          }
        } catch (err) {
          toast.warning("Protocolo creado, pero falló el coseguro", {
            description: getErrorMessage(err, "Error al guardar coseguro"),
          })
        }
      }

      createProgress.finish()
      setSuccessData({
        protocol: newProtocol,
        patient: patientForSuccess,
        doctor: doctorForSuccess,
        insurance: insuranceForSuccess,
        sendMethod: sendMethodForSuccess,
      })
      toast.success("Protocolo creado exitosamente")
      handleReset()
    } catch (error) {
      console.error("Error creating protocol:", error)
      toast.error("Error al crear el protocolo", { description: getErrorMessage(error, "Error de conexión con el servidor") })
      createProgress.finish()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-2 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8">
            <div className="text-center">
              <Skeleton className="h-10 w-64 rounded mx-auto mb-3" />
              <Skeleton className="h-5 w-96 rounded mx-auto" />
            </div>
          </div>

          {/* Form and sidebar skeleton */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 justify-center">
            <div className="w-full lg:flex-1 lg:max-w-2xl">
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
            <div className="w-full lg:w-96 lg:flex-shrink-0">
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
          </div>

          {/* Button skeleton */}
          <div className="mt-4 sm:mt-6 flex justify-center px-2 sm:px-0">
            <Skeleton className="h-12 sm:h-14 lg:h-16 w-full max-w-4xl rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  const showRightPanel =
    currentPatient ||
    patientNotFound ||
    selectedDoctor ||
    selectedInsurance ||
    showCreateMedico ||
    showCreateObraSocial
  const isFormValid =
    currentPatient &&
    selectedDoctor &&
    (isAnonymousPatient || selectedInsurance) &&
    selectedAnalyses.length > 0 &&
    selectedSendMethod &&
    (treatAsPrivate || !selectedInsurance || affiliateNumber.trim()) &&
    (!shouldShowOrder || trajoOrden) &&
    (!shouldShowPreauth || preauthStatus)

  return (
    <div className="min-h-screen p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Ingreso de Protocolos</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Busque un paciente y configure su protocolo de análisis
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 justify-center">
          <div
            className={`
              w-full transition-all duration-500 ease-in-out
              ${showRightPanel ? "lg:flex-1 lg:max-w-2xl" : "lg:max-w-4xl mx-auto"}
            `}
          >
            <ProtocolForm
              patient={currentPatient}
              doctors={doctors}
              insurances={insurances}
              sendMethods={sendMethods}
              selectedAnalyses={selectedAnalyses}
              selectedDoctor={selectedDoctor}
              selectedInsurance={selectedInsurance}
              selectedSendMethod={selectedSendMethod}
              patientPaid={patientPaid}
              affiliateNumber={affiliateNumber}
              trajoOrden={trajoOrden}
              preauthStatus={preauthStatus}
              isRefund={isRefund}
              isPrivateInsurance={treatAsPrivate}
              shouldShowOrder={shouldShowOrder}
              shouldShowPreauth={shouldShowPreauth}
              shouldChargeMaterial={shouldChargeMaterial}
              shouldChargeDerivacion={shouldChargeDerivacion}
              shouldChargeCoseguro={shouldChargeCoseguro}
              extraAmounts={extraAmounts}
              coseguroAmount={coseguroAmount}
              unplannedTransactions={unplannedTransactions}
              totals={calculateTotals()}
              onAnalysisChange={setSelectedAnalyses}
              onDoctorSelect={setSelectedDoctor}
              onInsuranceSelect={handleInsuranceSelect}
              onSendMethodSelect={setSelectedSendMethod}
              onPatientFound={handlePatientFound}
              onPatientNotFound={handlePatientNotFound}
              onCreateAnonymous={handleCreateAnonymous}
              onReset={handleReset}
              onShowCreateMedico={() => setShowCreateMedico(true)}
              onShowCreateObraSocial={() => setShowCreateObraSocial(true)}
              onPatientPaidChange={setPatientPaid}
              onAffiliateNumberChange={setAffiliateNumber}
              onTrajoOrdenChange={setTrajoOrden}
              onPreauthStatusChange={setPreauthStatus}
              onExtraAmountsChange={setExtraAmounts}
              onCoseguroChange={setCoseguroAmount}
              onUnplannedTransactionsChange={setUnplannedTransactions}
              onRefundChange={setIsRefund}
            />
          </div>

          <div
            className={`
              w-full transition-all duration-500 ease-in-out
              ${
                showRightPanel
                  ? "lg:w-96 lg:flex-shrink-0 opacity-100 transform translate-x-0"
                  : "lg:w-0 lg:opacity-0 lg:transform lg:translate-x-full lg:overflow-hidden"
              }
            `}
          >
            <div className="space-y-4">
              {currentPatient && <PatientInfo patient={currentPatient} onEdit={handleEditPatient} />}
              {selectedDoctor && <DoctorInfo doctor={selectedDoctor} onEdit={() => setShowEditDoctor(true)} />}
              {selectedInsurance && (
                <InsuranceInfo insurance={selectedInsurance} onEdit={() => setShowEditInsurance(true)} />
              )}

              {patientNotFound && (
                <CreatePatientForm
                  initialCuil={searchedCuil}
                  defaultAnonymous={creatingAnonymous}
                  onPatientCreated={handlePatientCreated}
                  onCancel={() => {
                    setPatientNotFound(false)
                    setCreatingAnonymous(false)
                  }}
                />
              )}

              {showCreateMedico && (
                <CreateMedicoForm onMedicoCreated={handleDoctorCreated} onCancel={() => setShowCreateMedico(false)} />
              )}

              {showCreateObraSocial && (
                <CreateObraSocialForm
                  onObraSocialCreated={handleInsuranceCreated}
                  onCancel={() => setShowCreateObraSocial(false)}
                />
              )}
            </div>
          </div>
        </div>

        {currentPatient && (
          <div className="mt-4 sm:mt-6 flex justify-center px-2 sm:px-0">
            <div
              className={`
                w-full transition-all duration-500 ease-in-out
                ${showRightPanel ? "max-w-full lg:max-w-4xl" : "max-w-full lg:max-w-4xl"}
              `}
            >
              <Button
                onClick={handleCreateProtocol}
                disabled={!currentPatient || createProgress.isRunning}
                className={`
                  w-full h-12 sm:h-14 lg:h-16 text-white text-base sm:text-lg font-semibold 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  relative overflow-hidden transition-all duration-300
                  ${
                    createProgress.isRunning
                      ? "bg-gray-300 hover:bg-gray-300"
                      : "bg-[#204983] hover:bg-[#2d5a9b]"
                  }
                `}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-[#204983] transition-[width] duration-150"
                  style={{ width: `${createProgress.progress}%` }}
                />

                <div className="relative z-10 flex items-center justify-center">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base lg:text-lg">
                    {createProgress.isRunning ? "Creando protocolo..." : isFormValid ? "Crear Protocolo" : "Revisar y crear protocolo"}
                  </span>
                </div>
              </Button>
            </div>
          </div>
        )}

        <EditPatientDialog
          isOpen={showEditPatient}
          onClose={() => setShowEditPatient(false)}
          patient={currentPatient}
          onPatientUpdated={handlePatientUpdated}
        />

        {selectedDoctor && (
          <EditMedicoDialog
            isOpen={showEditDoctor}
            medico={selectedDoctor}
            onClose={() => setShowEditDoctor(false)}
            onSuccess={handleDoctorUpdated}
          />
        )}

        {selectedInsurance && (
          <EditObraSocialDialog
            open={showEditInsurance}
            onOpenChange={setShowEditInsurance}
            obraSocial={selectedInsurance}
            onSuccess={handleInsuranceUpdated}
          />
        )}

        {successData && (
          <ProtocolSuccess
            protocol={successData.protocol}
            patient={successData.patient}
            doctor={successData.doctor}
            insurance={successData.insurance}
            sendMethod={successData.sendMethod}
            onClose={() => setSuccessData(null)}
          />
        )}
      </div>
    </div>
  )
}
