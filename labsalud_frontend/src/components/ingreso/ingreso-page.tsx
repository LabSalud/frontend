"use client"

import { useState, useEffect, useRef } from "react"
import { FileText } from "lucide-react"
import { Button } from "../ui/button"
import { toast } from "sonner"
import { ProtocolForm } from "./components/protocol-form"
import { PatientInfo } from "./components/patient-info"
import { CreatePatientForm } from "./components/create-patient-form"
import { EditPatientDialog } from "./components/edit-patient-dialog"
import { CreateMedicoForm } from "./components/create-medico-form"
import { CreateObraSocialForm } from "./components/create-obra-social-form"
import { ProtocolSuccess } from "./components/protocol-success"
import { useApi } from "../../hooks/use-api"
import { MEDICAL_ENDPOINTS, PROTOCOL_ENDPOINTS } from "@/config/api"
import type {
  Patient,
  Doctor,
  Insurance,
  SelectedAnalysis,
  SendMethod,
  CreateProtocolInput,
  PaginatedResponse,
  Protocol,
} from "../../types"

export default function IngresoPage() {
  const { apiRequest } = useApi()

  // Main states
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null)
  const [patientNotFound, setPatientNotFound] = useState(false)
  const [searchedDni, setSearchedDni] = useState("")
  const [selectedAnalyses, setSelectedAnalyses] = useState<SelectedAnalysis[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedInsurance, setSelectedInsurance] = useState<Insurance | null>(null)
  const [showEditPatient, setShowEditPatient] = useState(false)
  const [valuePaid, setValuePaid] = useState("")
  const [selectedSendMethod, setSelectedSendMethod] = useState<SendMethod | null>(null)
  const [affiliateNumber, setAffiliateNumber] = useState("")
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
    insurance: Insurance
    sendMethod: SendMethod
  } | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [animationResult, setAnimationResult] = useState<"success" | "error" | null>(null)
  const [pendingSuccessData, setPendingSuccessData] = useState<{
    protocol: Protocol
    patient: Patient
    doctor: Doctor
    insurance: Insurance
    sendMethod: SendMethod
  } | null>(null)

  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (!isAnimating || animationResult === null) {
      return
    }

    const duration = 3000 // 3 seconds total
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const linearProgress = Math.min(elapsed / duration, 1)

      // Logarithmic curve: fast at start, slow at end
      const logProgress = Math.log10(1 + linearProgress * 9) * 100

      setProgress(logProgress)

      if (linearProgress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Animation complete - show result
        if (animationResult === "success" && pendingSuccessData) {
          setSuccessData(pendingSuccessData)
          setPendingSuccessData(null)
          toast.success("Protocolo creado exitosamente")
          handleReset()
        } else if (animationResult === "error") {
          toast.error("Error al crear el protocolo")
        }

        // Reset animation state after a brief delay
        setTimeout(
          () => {
            setIsAnimating(false)
            setProgress(0)
            setAnimationResult(null)
          },
          animationResult === "error" ? 1500 : 300,
        )
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isAnimating, animationResult, pendingSuccessData])

  // Extract mensaje de error del backend
  const extractErrorMessage = (errorData: unknown): string => {
    if (typeof errorData === "string") return errorData
    if (errorData && typeof errorData === "object") {
      const err = errorData as Record<string, unknown>
      if (err.detail) return String(err.detail)
      if (err.error) return String(err.error)
      if (err.message) return String(err.message)
      // Si es un objeto con múltiples campos de error
      const firstKey = Object.keys(err)[0]
      if (firstKey && Array.isArray(err[firstKey])) {
        return `${firstKey}: ${err[firstKey][0]}`
      }
    }
    return "Ha ocurrido un error inesperado"
  }

  const loadInitialData = async () => {
    try {
      setIsLoading(true)
      const [doctorsResponse, insurancesResponse, sendMethodsResponse] = await Promise.all([
        apiRequest(`${MEDICAL_ENDPOINTS.DOCTORS}?limit=20&offset=0&is_active=true`),
        apiRequest(`${MEDICAL_ENDPOINTS.INSURANCES}?limit=20&offset=0&is_active=true`),
        apiRequest(PROTOCOL_ENDPOINTS.SEND_METHODS),
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
        if (sendMethodsData.results.length > 0) {
          setSelectedSendMethod(sendMethodsData.results[0])
        }
      } else {
        const errorData = await sendMethodsResponse.json().catch(() => ({}))
        toast.error("Error al cargar métodos de envío", { description: extractErrorMessage(errorData) })
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
      return { authorizedTotal: 0, privateTotal: 0, total: 0, patientOwes: 0, authorizedUb: 0, privateUb: 0 }
    }

    const insuranceUbValue = Number.parseFloat(selectedInsurance.ub_value) || 0
    const privateUbValue = selectedInsurance.private_ub_value || 0

    let authorizedUb = 0
    let privateUb = 0

    selectedAnalyses.forEach((analysis) => {
      const ub = Number.parseFloat(analysis.bio_unit) || 0
      if (selectedInsurance?.name.toLowerCase() === "particular") {
        privateUb += ub
      } else if (analysis.is_authorized) {
        authorizedUb += ub
      } else {
        privateUb += ub
      }
    })

    const authorizedTotal = authorizedUb * insuranceUbValue
    const privateTotal = privateUb * privateUbValue
    const total = authorizedTotal + privateTotal
    const patientOwes = isRefund ? total : privateTotal

    return { authorizedTotal, privateTotal, total, patientOwes, authorizedUb, privateUb }
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
    setSearchedDni("")
  }

  const handlePatientNotFound = (dni: string) => {
    setCurrentPatient(null)
    setPatientNotFound(true)
    setSearchedDni(dni)
  }

  const handlePatientCreated = (patient: Patient) => {
    setCurrentPatient(patient)
    setPatientNotFound(false)
    setSearchedDni("")
  }

  const handleDoctorCreated = (doctor: Doctor) => {
    setDoctors([...doctors, doctor])
    setShowCreateMedico(false)
    toast.success("Médico creado exitosamente")
  }

  const handleInsuranceCreated = (insurance: Insurance) => {
    setInsurances([...insurances, insurance])
    setShowCreateObraSocial(false)
    toast.success("Obra social creada exitosamente")
  }

  const handleReset = () => {
    setCurrentPatient(null)
    setPatientNotFound(false)
    setSearchedDni("")
    setSelectedAnalyses([])
    setSelectedDoctor(null)
    setSelectedInsurance(null)
    setShowCreateMedico(false)
    setShowCreateObraSocial(false)
    setValuePaid("")
    setSelectedSendMethod(sendMethods[0] || null)
    setAffiliateNumber("")
    setIsRefund(false)
  }

  const isPrivateInsurance = selectedInsurance?.name.toLowerCase() === "particular"

  const handleCreateProtocol = async () => {
    if (!currentPatient) {
      toast.error("Seleccione un paciente")
      return
    }

    if (!selectedDoctor) {
      toast.error("Seleccione un médico")
      return
    }

    if (!selectedInsurance) {
      toast.error("Seleccione una obra social")
      return
    }

    if (selectedAnalyses.length === 0) {
      toast.error("Seleccione al menos un análisis")
      return
    }

    if (!selectedSendMethod) {
      toast.error("Seleccione un método de envío")
      return
    }

    if (!isPrivateInsurance && !affiliateNumber.trim()) {
      toast.error("Ingrese el número de afiliado")
      return
    }

    const patientForSuccess = currentPatient
    const doctorForSuccess = selectedDoctor
    const insuranceForSuccess = selectedInsurance
    const sendMethodForSuccess = selectedSendMethod

    try {
      const patientPaid = Number.parseFloat(valuePaid) || 0
      const totalValuePaid = patientPaid

      const protocolData: CreateProtocolInput = {
        patient: currentPatient.id,
        doctor: selectedDoctor.id,
        insurance: selectedInsurance.id,
        send_method: selectedSendMethod.id,
        value_paid: totalValuePaid.toFixed(2),
        details: selectedAnalyses.map((analysis) => ({
          analysis: analysis.id,
          is_authorized: isPrivateInsurance ? false : analysis.is_authorized,
        })),
      }

      if (!isPrivateInsurance && affiliateNumber.trim()) {
        protocolData.affiliate_number = affiliateNumber.trim()
      }

      const protocolResponse = await apiRequest(PROTOCOL_ENDPOINTS.PROTOCOLS, {
        method: "POST",
        body: protocolData,
      })

      if (!protocolResponse.ok) {
        const errorData = await protocolResponse.json()
        console.error("Protocol creation error:", errorData)
        toast.error("Error al crear el protocolo", { description: extractErrorMessage(errorData) })
        setAnimationResult("error")
        setIsAnimating(true)
        return
      }

      const newProtocol = await protocolResponse.json()

      setPendingSuccessData({
        protocol: newProtocol,
        patient: patientForSuccess,
        doctor: doctorForSuccess,
        insurance: insuranceForSuccess,
        sendMethod: sendMethodForSuccess,
      })
      setAnimationResult("success")
      setIsAnimating(true)
    } catch (error) {
      console.error("Error creating protocol:", error)
      toast.error("Error al crear el protocolo", { description: "Error de conexión con el servidor" })
      setAnimationResult("error")
      setIsAnimating(true)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#204983]" />
      </div>
    )
  }

  const showRightPanel = currentPatient || patientNotFound || showCreateMedico || showCreateObraSocial
  const isFormValid =
    currentPatient &&
    selectedDoctor &&
    selectedInsurance &&
    selectedAnalyses.length > 0 &&
    selectedSendMethod &&
    (isPrivateInsurance || affiliateNumber.trim())

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
              valuePaid={valuePaid}
              affiliateNumber={affiliateNumber}
              isRefund={isRefund}
              isPrivateInsurance={isPrivateInsurance}
              totals={calculateTotals()}
              onAnalysisChange={setSelectedAnalyses}
              onDoctorSelect={setSelectedDoctor}
              onInsuranceSelect={setSelectedInsurance}
              onSendMethodSelect={setSelectedSendMethod}
              onPatientFound={handlePatientFound}
              onPatientNotFound={handlePatientNotFound}
              onReset={handleReset}
              onShowCreateMedico={() => setShowCreateMedico(true)}
              onShowCreateObraSocial={() => setShowCreateObraSocial(true)}
              onValuePaidChange={setValuePaid}
              onAffiliateNumberChange={setAffiliateNumber}
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

              {patientNotFound && (
                <CreatePatientForm
                  initialDni={searchedDni}
                  onPatientCreated={handlePatientCreated}
                  onCancel={() => setPatientNotFound(false)}
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
                disabled={!isFormValid || isAnimating}
                className={`
                  w-full h-12 sm:h-14 lg:h-16 text-white text-base sm:text-lg font-semibold 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  relative overflow-hidden transition-all duration-300
                  ${
                    isAnimating
                      ? animationResult === "error" && progress >= 100
                        ? "bg-gray-300 hover:bg-gray-300"
                        : "bg-gray-300 hover:bg-gray-300"
                      : "bg-[#204983] hover:bg-[#2d5a9b]"
                  }
                `}
              >
                <div
                  className={`absolute inset-y-0 left-0 transition-colors duration-300 ${
                    animationResult === "error" && progress >= 100 ? "bg-red-500" : "bg-[#204983]"
                  }`}
                  style={{ width: `${progress}%` }}
                />

                <div className="relative z-10 flex items-center justify-center">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base lg:text-lg">
                    {isAnimating ? "Creando protocolo..." : "Crear Protocolo"}
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
