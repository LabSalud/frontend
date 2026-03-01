import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./contexts/auth-context"
import Login from "./components/login"
import Home from "./components/home"
import { Layout } from "./components/layout"
import { ProtectedRoute } from "./components/protected-route"
import ManagementPage from "./components/admin/management-page"
import PatientsPage from "./components/patients/patients-page"
import ProfilePage from "./components/profile/profile-page"
import ForgotPassword from "./components/forgot-password"
import ConfigurationPage from "./components/configuration/configuration-page"
import IngresoPage from "./components/ingreso/ingreso-page"
import { Toaster } from "sonner"
import ProtocolosPage from "./components/protocolos/protocolos-page"
import ResultadosPage from "./components/results/results-page"
import ValidacionPage from "./components/validacion/validacion-page"
import FacturacionPage from "./components/facturacion/facturacion-page"
import { PERMISSIONS } from "./config/permissions"
import NotFound from "./components/not-found"

function App() {
  return (
    <AuthProvider>
      <Router>
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
              <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_USERS.id}>
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
              <ProtectedRoute requiredPermission={PERMISSIONS.VALIDATE_RESULTS.id}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ValidacionPage />} />
          </Route>
          <Route
            path="/facturacion"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_BILLING.id}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<FacturacionPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster position="bottom-right" richColors />
    </AuthProvider>
  )
}

export default App
