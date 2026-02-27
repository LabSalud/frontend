"use client"
import { useState, useEffect } from "react"
import useAuth from "@/contexts/auth-context"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { ANALYTICS_ENDPOINTS } from "@/config/api"
import { PERMISSIONS } from "@/config/permissions"
import type { Permission } from "@/types"
import {
  User,
  Shield,
  Clock,
  TestTube,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Printer,
  Receipt,
} from "lucide-react"

interface Stats {
  analysisToday: number
  patientsToday: number
  pendingResultsLoad: number
  pendingResultsValidation: number
  protocolsCompletedMonth: number
  protocolsCompletedGrowthPercent: string
  avgResultLoadTimeHuman: string
  printedIncompletePayment: number
  pendingBilling: number
}

export default function Home() {
  const { user, hasPermission } = useAuth()
  const { apiRequest } = useApi()
  const { error: showErrorToast } = useToast()

  const [stats, setStats] = useState<Stats>({
    analysisToday: 0,
    patientsToday: 0,
    pendingResultsLoad: 0,
    pendingResultsValidation: 0,
    protocolsCompletedMonth: 0,
    protocolsCompletedGrowthPercent: "0.0",
    avgResultLoadTimeHuman: "0 min",
    printedIncompletePayment: 0,
    pendingBilling: 0,
  })
  const [loading, setLoading] = useState(true)

  const getActivePermissions = (): Permission[] => {
    if (!user || !user.permissions) return []
    const now = new Date()
    return user.permissions.filter(
      (perm: Permission) => perm.temporary === true && perm.expires_at && new Date(perm.expires_at) > now,
    )
  }

  const fetchStats = async () => {
    try {
      setLoading(true)

      const [dashboardResponse, statusResponse] = await Promise.all([
        apiRequest(ANALYTICS_ENDPOINTS.DASHBOARD),
        apiRequest(ANALYTICS_ENDPOINTS.PROTOCOLS_BY_STATUS),
      ])

      const data = await dashboardResponse.json()

      let pendingBillingCount = 0
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        const billingState = statusData.states?.find(
          (s: { status_id: number; count: number }) => s.status_id === 8,
        )
        pendingBillingCount = billingState?.count || 0
      }

      setStats({
        analysisToday: data.analysis_today || 0,
        patientsToday: data.patients_today || 0,
        protocolsCompletedMonth: data.protocols_completed_month || 0,
        protocolsCompletedGrowthPercent: data.protocols_completed_growth_percent || "0.0",
        avgResultLoadTimeHuman: data.avg_result_load_time_human || "0 min",
        pendingResultsLoad: data.pending_results_load || 0,
        pendingResultsValidation: data.pending_results_validation || 0,
        printedIncompletePayment: data.printed_with_incomplete_payment || 0,
        pendingBilling: pendingBillingCount,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
      showErrorToast("Error al cargar las estadísticas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const canSeeValidationStats = hasPermission("validar_resultados") || hasPermission(4)
  const canAccessBilling = hasPermission(PERMISSIONS.MANAGE_BILLING.id)

  return (
    <div className="max-w-7xl mx-auto py-6">
      {/* Welcome Section */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative">
            {user?.photo ? (
              <img
                src={user.photo || "/placeholder.svg"}
                alt={`${user.username} profile`}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#204983] flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">¡Bienvenido, {user?.first_name || user?.username}!</h1>
          </div>
        </div>
      </div>

      {/* Permissions Section */}
      {getActivePermissions().length > 0 && (
        <div className="bg-green-50/95 backdrop-blur-sm border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Shield className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Permisos Temporales Activos</h3>
          </div>
          <div className="space-y-2">
            {getActivePermissions().map((perm: Permission, index: number) => (
              <div key={index} className="flex items-center justify-between bg-white/95 backdrop-blur-sm rounded p-2">
                <span className="text-sm font-medium text-green-800">{perm.name}</span>
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <Clock className="w-3 h-3" />
                  <span>
                    Expira: {perm.expires_at ? new Date(perm.expires_at).toLocaleString("es-ES") : "Sin fecha"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="flex flex-wrap justify-center gap-6 mb-6">
        {/* Análisis de Hoy */}
        <div className="bg-blue-50/80 backdrop-blur-sm p-6 rounded-lg border border-blue-200 w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TestTube className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-blue-500 font-medium">HOY</span>
          </div>
          <h3 className="text-2xl font-bold text-blue-800 mb-1">
            {loading ? (
              <div className="animate-pulse bg-blue-200 h-8 w-16 rounded"></div>
            ) : (
              stats.analysisToday.toLocaleString()
            )}
          </h3>
          <p className="text-blue-600 text-sm">Análisis realizados</p>
        </div>

        {/* Pacientes de Hoy */}
        <div className="bg-green-50/80 backdrop-blur-sm p-6 rounded-lg border border-green-200 w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-green-500 font-medium">HOY</span>
          </div>
          <h3 className="text-2xl font-bold text-green-800 mb-1">
            {loading ? (
              <div className="animate-pulse bg-green-200 h-8 w-16 rounded"></div>
            ) : (
              stats.patientsToday.toLocaleString()
            )}
          </h3>
          <p className="text-green-600 text-sm">Pacientes atendidos</p>
        </div>

        {/* Protocolos Completados (Mes) */}
        <div className="bg-purple-50/80 backdrop-blur-sm p-6 rounded-lg border border-purple-200 w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs text-purple-500 font-medium">ESTE MES</span>
          </div>
          <h3 className="text-2xl font-bold text-purple-800 mb-1">
            {loading ? (
              <div className="animate-pulse bg-purple-200 h-8 w-20 rounded"></div>
            ) : (
              stats.protocolsCompletedMonth.toLocaleString()
            )}
          </h3>
          <p className="text-purple-600 text-sm">Protocolos completados</p>
        </div>

        {/* Crecimiento Mensual */}
        <div className="bg-emerald-50/80 backdrop-blur-sm p-6 rounded-lg border border-emerald-200 w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-xs text-emerald-500 font-medium">CRECIMIENTO</span>
          </div>
          <h3 className="text-2xl font-bold text-emerald-800 mb-1">
            {loading ? (
              <div className="animate-pulse bg-emerald-200 h-8 w-16 rounded"></div>
            ) : (
              `${Number(stats.protocolsCompletedGrowthPercent) >= 0 ? "+" : ""}${stats.protocolsCompletedGrowthPercent}${String(stats.protocolsCompletedGrowthPercent).includes("%") ? "" : "%"}`
            )}
          </h3>
          <p className="text-emerald-600 text-sm">vs. mes anterior</p>
        </div>

        {/* Tiempo Promedio */}
        <div className="bg-indigo-50/80 backdrop-blur-sm p-6 rounded-lg border border-indigo-200 w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Clock className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-xs text-indigo-500 font-medium">PROMEDIO</span>
          </div>
          <h3 className="text-2xl font-bold text-indigo-800 mb-1">
            {loading ? (
              <div className="animate-pulse bg-indigo-200 h-8 w-20 rounded"></div>
            ) : (
              stats.avgResultLoadTimeHuman
            )}
          </h3>
          <p className="text-indigo-600 text-sm">Tiempo de carga de resultados</p>
        </div>

        {/* Resultados por Cargar */}
        <div className="bg-amber-50/80 backdrop-blur-sm p-6 rounded-lg border border-amber-200 w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs text-amber-500 font-medium">PENDIENTE</span>
          </div>
          <h3 className="text-2xl font-bold text-amber-800 mb-1">
            {loading ? (
              <div className="animate-pulse bg-amber-200 h-8 w-16 rounded"></div>
            ) : (
              stats.pendingResultsLoad.toLocaleString()
            )}
          </h3>
          <p className="text-amber-600 text-sm">Resultados por cargar</p>
        </div>

        {/* Resultados Pendientes - Only visible with validation permission */}
        {canSeeValidationStats && (
          <div className="bg-orange-50/80 backdrop-blur-sm p-6 rounded-lg border border-orange-200 w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-xs text-orange-500 font-medium">PENDIENTE</span>
            </div>
            <h3 className="text-2xl font-bold text-orange-800 mb-1">
              {loading ? (
                <div className="animate-pulse bg-orange-200 h-8 w-16 rounded"></div>
              ) : (
                stats.pendingResultsValidation.toLocaleString()
              )}
            </h3>
            <p className="text-orange-600 text-sm">Resultados por validar</p>
          </div>
        )}

        {/* Billing cards - Only visible with billing permission */}
        {canAccessBilling && (
          <>
            <div className="bg-red-50/80 backdrop-blur-sm p-6 rounded-lg border border-red-200 w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Printer className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-xs text-red-500 font-medium">PAGO PENDIENTE</span>
              </div>
              <h3 className="text-2xl font-bold text-red-800 mb-1">
                {loading ? (
                  <div className="animate-pulse bg-red-200 h-8 w-16 rounded"></div>
                ) : (
                  stats.printedIncompletePayment.toLocaleString()
                )}
              </h3>
              <p className="text-red-600 text-sm">Protocolos impresos sin pago completo</p>
            </div>

            <div className="bg-teal-50/80 backdrop-blur-sm p-6 rounded-lg border border-teal-200 w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Receipt className="w-6 h-6 text-teal-600" />
                </div>
                <span className="text-xs text-teal-500 font-medium">PENDIENTE</span>
              </div>
              <h3 className="text-2xl font-bold text-teal-800 mb-1">
                {loading ? (
                  <div className="animate-pulse bg-teal-200 h-8 w-16 rounded"></div>
                ) : (
                  stats.pendingBilling.toLocaleString()
                )}
              </h3>
              <p className="text-teal-600 text-sm">Protocolos pend. facturacion</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
