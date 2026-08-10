"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, useLocation, Link, type Location } from "react-router-dom"
import { User, Lock, AlertCircle } from "lucide-react"
import useAuth from "@/contexts/auth-context"
import { TwoFactorChallenge, type TwoFactorSubmitResult } from "@/components/two-factor-challenge"
import {
  TwoFactorEnrollment,
  type TwoFactorEnrollmentConfirmResult,
  type TwoFactorEnrollmentStartResult,
} from "@/components/two-factor-enrollment"

/**
 * Paso pendiente del segundo factor: el código (ya enrolada) o el alta completa
 * (obligada y sin enrolar). Los dos casos llegan con un `ephemeral_token`.
 *
 * El `ephemeral_token` vive acá, en el estado del componente, y nada más: no va
 * a localStorage ni a sessionStorage. Es media credencial (con él más el código
 * se sacan los tokens reales), así que persistirlo lo dejaría al alcance de
 * cualquier XSS y sobreviviría a la pantalla que lo necesita.
 */
interface PendingTwoFactor {
  ephemeralToken: string
  expiresIn: number
  username: string
}

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPageLoaded, setIsPageLoaded] = useState(false)
  const [pendingTwoFactor, setPendingTwoFactor] = useState<PendingTwoFactor | null>(null)
  const [pendingEnrollment, setPendingEnrollment] = useState<PendingTwoFactor | null>(null)
  // Confirmar el enrolamiento abre la sesión Y devuelve los códigos de
  // recuperación, que se muestran una sola vez. Sin este freno la redirección
  // desmontaría la pantalla y se los llevaría puestos.
  const [holdingRecoveryCodes, setHoldingRecoveryCodes] = useState(false)
  const { login, verifyTwoFactor, startTwoFactorEnrollment, confirmTwoFactorEnrollment, isLoading, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // ProtectedRoute guarda acá la ruta que el usuario quería visitar antes de
  // ser mandado a /login, para volver ahí una vez que inicia sesión.
  const from = (location.state as { from?: Location } | null)?.from

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !holdingRecoveryCodes) {
      const target = from ? `${from.pathname}${from.search}${from.hash}` : "/"
      navigate(target, { replace: true })
    }
  }, [user, navigate, from, holdingRecoveryCodes])

  useEffect(() => {
    const lastUsername = localStorage.getItem("last_username")
    if (lastUsername && !username) {
      setUsername(lastUsername)
    }
  }, [])

  useEffect(() => {
    const entranceTimeout = setTimeout(() => {
      setIsPageLoaded(true)
    }, 0)

    return () => clearTimeout(entranceTimeout)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setError("") // Limpiar errores previos
    setIsSubmitting(true)

    if (!username.trim() || !password.trim()) {
      setError("Por favor, completa todos los campos")
      setIsSubmitting(false)
      return
    }

    const outcome = await login(username, password)

    if (outcome.status === "two_factor_required") {
      // Credenciales OK: falta el código. La contraseña ya no hace falta más.
      setPassword("")
      setPendingTwoFactor({
        ephemeralToken: outcome.ephemeralToken,
        expiresIn: outcome.expiresIn,
        username,
      })
    } else if (outcome.status === "two_factor_enrollment_required") {
      // Credenciales OK, pero está obligada al segundo factor y no lo tiene:
      // no entra hasta enrolarse, y el alta se hace acá mismo.
      setPassword("")
      setPendingEnrollment({
        ephemeralToken: outcome.ephemeralToken,
        expiresIn: outcome.expiresIn,
        username,
      })
    } else if (outcome.status === "error") {
      setError("Usuario o contraseña incorrectos. Por favor, verifica tus credenciales e intenta nuevamente.")
    }
    // status === "success": la redirección la maneja el useEffect cuando cambia user

    setIsSubmitting(false)
  }

  const handleTwoFactorSubmit = async (code: string, rememberDevice: boolean): Promise<TwoFactorSubmitResult> => {
    if (!pendingTwoFactor) return { ok: false, expired: true, message: "La verificación venció." }

    const outcome = await verifyTwoFactor({
      ephemeralToken: pendingTwoFactor.ephemeralToken,
      code,
      rememberDevice,
    })

    if (outcome.status === "success") return { ok: true }
    return { ok: false, message: outcome.message, expired: outcome.expired }
  }

  const handleEnrollmentStart = async (): Promise<TwoFactorEnrollmentStartResult> => {
    if (!pendingEnrollment) return { ok: false, expired: true }

    const outcome = await startTwoFactorEnrollment(pendingEnrollment.ephemeralToken)
    if (outcome.status === "success") return { ok: true, setup: outcome.setup }
    return { ok: false, message: outcome.message, expired: outcome.expired }
  }

  const handleEnrollmentConfirm = async (code: string): Promise<TwoFactorEnrollmentConfirmResult> => {
    if (!pendingEnrollment) return { ok: false, expired: true }

    // El freno se pone ANTES de confirmar: la confirmación deja la sesión
    // abierta y, si el efecto de arriba llegara primero, la pantalla de códigos
    // no se vería nunca.
    setHoldingRecoveryCodes(true)

    const outcome = await confirmTwoFactorEnrollment({
      ephemeralToken: pendingEnrollment.ephemeralToken,
      code,
    })

    if (outcome.status === "success") return { ok: true, recoveryCodes: outcome.recoveryCodes }

    setHoldingRecoveryCodes(false)
    return { ok: false, message: outcome.message, expired: outcome.expired }
  }

  const finishEnrollment = () => {
    // Soltar el freno deja que el efecto de arriba redirija a la app.
    setPendingEnrollment(null)
    setHoldingRecoveryCodes(false)
  }

  const cancelTwoFactor = () => {
    // Al soltar el estado se va también el ephemeral_token de memoria.
    setPendingTwoFactor(null)
    setPendingEnrollment(null)
    setError("")
  }

  // Mostrar loading solo durante la verificación inicial.
  // Con el segundo factor pendiente NO desmontamos la pantalla del código ni la
  // del enrolamiento: perderían el contador de vencimiento, el QR y lo que el
  // usuario venía tipeando.
  if (isLoading && !pendingTwoFactor && !pendingEnrollment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-[#204983] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700">Verificando sesión...</span>
          </div>
        </div>
      </div>
    )
  }

  // Si ya hay usuario, no mostrar nada (el useEffect se encargará de redirigir).
  // La excepción es el enrolamiento recién confirmado: ahí hay sesión pero
  // todavía tenemos que mostrar los códigos de recuperación.
  if (user && !holdingRecoveryCodes) {
    return null
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Notch Container */}
      <div className="relative z-10 w-full flex justify-center">
        {/* Notch */}
        <div
          className={`
            bg-white rounded-b-3xl shadow-2xl w-full max-w-md
            origin-top transform-gpu will-change-transform
            transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)]
            ${isPageLoaded ? "translate-y-0 opacity-100 scale-y-100" : "-translate-y-[110vh] opacity-0 scale-y-75"}
          `}
        >
          {pendingTwoFactor ? (
            <TwoFactorChallenge
              // El key remonta la pantalla si el usuario cancela y arranca un
              // login nuevo: contador y campos vuelven a cero con el token nuevo.
              key={pendingTwoFactor.ephemeralToken}
              username={pendingTwoFactor.username}
              expiresIn={pendingTwoFactor.expiresIn}
              onSubmit={handleTwoFactorSubmit}
              onCancel={cancelTwoFactor}
            />
          ) : pendingEnrollment ? (
            <TwoFactorEnrollment
              key={pendingEnrollment.ephemeralToken}
              username={pendingEnrollment.username}
              expiresIn={pendingEnrollment.expiresIn}
              onStart={handleEnrollmentStart}
              onConfirm={handleEnrollmentConfirm}
              onDone={finishEnrollment}
              onCancel={cancelTwoFactor}
            />
          ) : (
            /* Login Form */
            <div className="px-8 py-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Bienvenido</h1>
                <p className="text-gray-600 text-sm">Inicia sesión en tu cuenta</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 text-sm font-medium">Error de autenticación</p>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username Field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      if (error) setError("") // Limpiar error al escribir
                    }}
                    placeholder="Usuario"
                    className={`
                      w-full pl-10 pr-4 py-3 bg-gray-100 border rounded-lg text-gray-800 placeholder-gray-500 
                      focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200
                      ${error ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-[#204983]"}
                    `}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Password Field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-600" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) setError("") // Limpiar error al escribir
                    }}
                    placeholder="Contraseña"
                    className={`
                      w-full pl-10 pr-4 py-3 bg-gray-100 border rounded-lg text-gray-800 placeholder-gray-500 
                      focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200
                      ${error ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-[#204983]"}
                    `}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="
                    w-full py-3 px-4 bg-[#204983] hover:bg-[#1a3d6f]
                    text-white font-medium rounded-lg 
                    transition-colors duration-200 
                    focus:outline-none focus:ring-2 focus:ring-[#204983] focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center space-x-2
                  "
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Iniciando sesión...</span>
                    </>
                  ) : (
                    <span>Iniciar Sesión</span>
                  )}
                </button>
              </form>

              {/* Additional Options */}
              <div className="mt-6 text-center">
                <Link
                  to="/forgot-password"
                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
