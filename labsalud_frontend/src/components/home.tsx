"use client"
import { useState, useEffect } from "react"
import useAuth from "@/contexts/auth-context"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { ANALYTICS_ENDPOINTS, BILLING_ENDPOINTS } from "@/config/api"
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
import { Skeleton } from "@/components/ui/skeleton"

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

      const [dashboardResponse, billingSummaryResponse] = await Promise.all([
        apiRequest(ANALYTICS_ENDPOINTS.DASHBOARD),
        apiRequest(BILLING_ENDPOINTS.SUMMARY),
      ])

      const data = await dashboardResponse.json()

      let pendingBillingCount = 0

      if (billingSummaryResponse.ok) {
        const billingData = await billingSummaryResponse.json()
        pendingBillingCount = Number(billingData.protocolos_por_facturar || 0)
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

  // ── Sub-components ────────────────────────────────────────────────────────

  interface StatCardProps {
    icon: React.ReactNode
    iconBg: string
    badge: string
    badgeColor: string
    value: string
    valuColor: string
    label: string
    labelColor: string
    cardBg: string
    cardBorder: string
  }

  function StatCard({ icon, iconBg, badge, badgeColor, value, valuColor, label, labelColor, cardBg, cardBorder }: StatCardProps) {
    return (
      <div className={`${cardBg} backdrop-blur-sm p-6 rounded-lg border ${cardBorder} w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 ${iconBg} rounded-lg`}>{icon}</div>
          <span className={`text-xs ${badgeColor} font-medium`}>{badge}</span>
        </div>
        <p className={`text-2xl font-bold ${valuColor} mb-1`}>{value}</p>
        <p className={`${labelColor} text-sm`}>{label}</p>
      </div>
    )
  }

  function StatCardSkeleton({ cardBg, cardBorder }: { cardBg: string; cardBorder: string }) {
    return (
      <div className={`${cardBg} backdrop-blur-sm p-6 rounded-lg border ${cardBorder} w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]`}>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <Skeleton className="h-8 w-20 rounded mb-2" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6">
      {/* Welcome Section */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative">
            {loading ? (
              <Skeleton className="w-16 h-16 rounded-full" />
            ) : user?.photo ? (
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
            {loading ? (
              <Skeleton className="h-9 w-64 rounded" />
            ) : (
              <h1 className="text-3xl font-bold text-gray-800">¡Bienvenido, {user?.first_name || user?.username}!</h1>
            )}
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

        {loading ? (
          <>
            <StatCardSkeleton cardBg="bg-blue-50/80"    cardBorder="border-blue-200" />
            <StatCardSkeleton cardBg="bg-green-50/80"   cardBorder="border-green-200" />
            <StatCardSkeleton cardBg="bg-purple-50/80"  cardBorder="border-purple-200" />
            <StatCardSkeleton cardBg="bg-emerald-50/80" cardBorder="border-emerald-200" />
            <StatCardSkeleton cardBg="bg-indigo-50/80"  cardBorder="border-indigo-200" />
            <StatCardSkeleton cardBg="bg-amber-50/80"   cardBorder="border-amber-200" />
          </>
        ) : (
          <>
            {/* Análisis de Hoy */}
            <StatCard
              icon={<TestTube className="w-6 h-6 text-blue-600" />}
              iconBg="bg-blue-100"
              badge="HOY"
              badgeColor="text-blue-500"
              value={stats.analysisToday.toLocaleString()}
              valuColor="text-blue-800"
              label="Análisis realizados"
              labelColor="text-blue-600"
              cardBg="bg-blue-50/80"
              cardBorder="border-blue-200"
            />

            {/* Pacientes de Hoy */}
            <StatCard
              icon={<Users className="w-6 h-6 text-green-600" />}
              iconBg="bg-green-100"
              badge="HOY"
              badgeColor="text-green-500"
              value={stats.patientsToday.toLocaleString()}
              valuColor="text-green-800"
              label="Pacientes atendidos"
              labelColor="text-green-600"
              cardBg="bg-green-50/80"
              cardBorder="border-green-200"
            />

            {/* Protocolos Completados (Mes) */}
            <StatCard
              icon={<CheckCircle className="w-6 h-6 text-purple-600" />}
              iconBg="bg-purple-100"
              badge="ESTE MES"
              badgeColor="text-purple-500"
              value={stats.protocolsCompletedMonth.toLocaleString()}
              valuColor="text-purple-800"
              label="Protocolos completados"
              labelColor="text-purple-600"
              cardBg="bg-purple-50/80"
              cardBorder="border-purple-200"
            />

            {/* Crecimiento Mensual */}
            <StatCard
              icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
              iconBg="bg-emerald-100"
              badge="CRECIMIENTO"
              badgeColor="text-emerald-500"
              value={`${Number(stats.protocolsCompletedGrowthPercent) >= 0 ? "+" : ""}${stats.protocolsCompletedGrowthPercent}${String(stats.protocolsCompletedGrowthPercent).includes("%") ? "" : "%"}`}
              valuColor="text-emerald-800"
              label="vs. mes anterior"
              labelColor="text-emerald-600"
              cardBg="bg-emerald-50/80"
              cardBorder="border-emerald-200"
            />

            {/* Tiempo Promedio */}
            <StatCard
              icon={<Clock className="w-6 h-6 text-indigo-600" />}
              iconBg="bg-indigo-100"
              badge="PROMEDIO"
              badgeColor="text-indigo-500"
              value={stats.avgResultLoadTimeHuman}
              valuColor="text-indigo-800"
              label="Tiempo de carga de resultados"
              labelColor="text-indigo-600"
              cardBg="bg-indigo-50/80"
              cardBorder="border-indigo-200"
            />

            {/* Resultados por Cargar */}
            <StatCard
              icon={<AlertCircle className="w-6 h-6 text-amber-600" />}
              iconBg="bg-amber-100"
              badge="PENDIENTE"
              badgeColor="text-amber-500"
              value={stats.pendingResultsLoad.toLocaleString()}
              valuColor="text-amber-800"
              label="Resultados por cargar"
              labelColor="text-amber-600"
              cardBg="bg-amber-50/80"
              cardBorder="border-amber-200"
            />

            {/* Resultados por Validar — solo con permiso */}
            {canSeeValidationStats && (
              <StatCard
                icon={<Clock className="w-6 h-6 text-orange-600" />}
                iconBg="bg-orange-100"
                badge="PENDIENTE"
                badgeColor="text-orange-500"
                value={stats.pendingResultsValidation.toLocaleString()}
                valuColor="text-orange-800"
                label="Resultados por validar"
                labelColor="text-orange-600"
                cardBg="bg-orange-50/80"
                cardBorder="border-orange-200"
              />
            )}

            {/* Facturación — solo con permiso */}
            {canAccessBilling && (
              <>
                <StatCard
                  icon={<Printer className="w-6 h-6 text-red-600" />}
                  iconBg="bg-red-100"
                  badge="PAGO PENDIENTE"
                  badgeColor="text-red-500"
                  value={stats.printedIncompletePayment.toLocaleString()}
                  valuColor="text-red-800"
                  label="Protocolos impresos sin pago completo"
                  labelColor="text-red-600"
                  cardBg="bg-red-50/80"
                  cardBorder="border-red-200"
                />
                <StatCard
                  icon={<Receipt className="w-6 h-6 text-teal-600" />}
                  iconBg="bg-teal-100"
                  badge="PENDIENTE"
                  badgeColor="text-teal-500"
                  value={stats.pendingBilling.toLocaleString()}
                  valuColor="text-teal-800"
                  label="Protocolos pend. facturacion"
                  labelColor="text-teal-600"
                  cardBg="bg-teal-50/80"
                  cardBorder="border-teal-200"
                />
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
