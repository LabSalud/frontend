import { lazy, Suspense } from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "./contexts/auth-context"
import { RouteChangeListener } from "./components/route-change-listener"
import { Layout } from "./components/layout"
import { ProtectedRoute } from "./components/protected-route"
import { Toaster } from "sonner"
import { PERMISSIONS } from "./config/permissions"

// Login no se lazy-loadea: es la primera pantalla y bloquea el resto.
import Login from "./components/login"
import ForgotPassword from "./components/forgot-password"
import Home from "./components/home"
import NotFound from "./components/not-found"

// El resto va lazy-loadeado: cada ruta es un chunk separado.
// El primer render del usuario sólo descarga login + layout + home; el resto baja on-demand.
const ManagementPage = lazy(() => import("./components/admin/management-page"))
const PatientsPage = lazy(() => import("./components/patients/patients-page"))
const ProfilePage = lazy(() => import("./components/profile/profile-page"))
const ConfigurationPage = lazy(() => import("./components/configuration/configuration-page"))
const IngresoPage = lazy(() => import("./components/ingreso/ingreso-page"))
const ProtocolosPage = lazy(() => import("./components/protocolos/protocolos-page"))
const ResultadosPage = lazy(() => import("./components/results/results-page"))
const ValidacionPage = lazy(() => import("./components/validacion/validacion-page"))
const FacturacionPage = lazy(() => import("./components/facturacion/facturacion-page"))

// React Query client compartido. Cache de 1 min para listados pesados (protocolos, pacientes).
// Reintentos en mutaciones desactivados (errores 4xx no son
// retryables — el helper de api-error se encarga del manejo de 401 con refresh).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

// Skeleton mientras se descarga el chunk de cada ruta.
function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#204983] border-t-transparent" />
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-[#adadad] relative">
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
            <img
              src="/logo.svg"
              alt="Background Logo"
              className="w-[95vw] h-[95vh] max-w-[1500px] object-contain opacity-65 blur-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg?height=800&width=800&text=LOGO&bg=f3f4f6&color=9ca3af"
                target.style.opacity = "0.9"
              }}
            />
          </div>

          <div className="relative z-10">
            <Router>
              <RouteChangeListener />
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Home />} />
                  </Route>
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<ProfilePage />} />
                  </Route>
                  <Route
                    path="/management"
                    element={
                      <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_USERS.codename}>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<ManagementPage />} />
                  </Route>
                  <Route
                    path="/pacientes"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<PatientsPage />} />
                  </Route>
                  <Route
                    path="/configuracion"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<ConfigurationPage />} />
                  </Route>
                  <Route
                    path="/ingreso"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<IngresoPage />} />
                  </Route>
                  <Route
                    path="/protocolos"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<ProtocolosPage />} />
                  </Route>
                  <Route
                    path="/resultados"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<ResultadosPage />} />
                  </Route>
                  <Route
                    path="/validacion"
                    element={
                      <ProtectedRoute requiredPermission={PERMISSIONS.VALIDATE_RESULTS.codename}>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<ValidacionPage />} />
                  </Route>
                  <Route
                    path="/facturacion"
                    element={
                      <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_BILLING.codename}>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<FacturacionPage />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Router>
            <Toaster position="bottom-right" richColors />
          </div>
        </div>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
