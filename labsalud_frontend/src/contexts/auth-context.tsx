"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react"
import { useToast } from "@/hooks/use-toast"
import { IdleWarningModal } from "@/components/idle-warning-modal"
import useIdleTimeout from "@/hooks/use-idle-timeout"
import { useSessionNotifications } from "@/hooks/use-session-notifications"
import { AUTH_ENDPOINTS } from "@/config/api"
import { formatApiError } from "@/lib/api-error"
import { getDeviceId } from "@/lib/device-id"
import { resolveIdleTimeMs, resolveWarningTimeMs } from "@/lib/idle-config"
import { SESSION_EXPIRED_EVENT, type SessionExpiredDetail } from "@/lib/session-events"
import type {
  TwoFactorEnrollmentConfirmResponse,
  TwoFactorEnrollmentRequiredResponse,
  TwoFactorRequiredResponse,
  TwoFactorSetupResponse,
  User,
} from "@/types"
import {
  clearSession,
  getAccessToken,
  getStoredUser,
  setAccessToken,
  setRefreshToken,
  setStoredUser,
} from "@/lib/auth-storage"
import { cerrarSesionEnElServidor } from "@/lib/cierre-de-sesion"
import { refrescarSesion } from "@/lib/refresh-de-sesion"

export interface TokenRefreshResponse {
  access: string
  refresh?: string
}

export interface AuthResponse {
  access: string
  refresh: string
  user: User
}

/**
 * Resultado del primer paso del login. `two_factor_required` no es un error:
 * las credenciales estaban bien, falta el código del celular.
 */
export type LoginOutcome =
  | { status: "success" }
  | { status: "two_factor_required"; ephemeralToken: string; expiresIn: number }
  /** Está obligada a tener segundo factor y todavía no se enroló: falta el alta. */
  | { status: "two_factor_enrollment_required"; ephemeralToken: string; expiresIn: number }
  | { status: "error" }

export type TwoFactorOutcome =
  | { status: "success" }
  /** `expired` distingue "el token de 5 minutos venció" de "el código está mal". */
  | { status: "error"; message: string; expired?: boolean }

export type TwoFactorEnrollmentStartOutcome =
  | { status: "success"; setup: TwoFactorSetupResponse }
  | { status: "error"; message: string; expired?: boolean }

export type TwoFactorEnrollmentConfirmOutcome =
  /** Los códigos se muestran una única vez; la sesión ya quedó abierta. */
  | { status: "success"; recoveryCodes: string[] }
  | { status: "error"; message: string; expired?: boolean }

export interface VerifyTwoFactorParams {
  ephemeralToken: string
  code: string
  rememberDevice: boolean
}

export interface ConfirmTwoFactorEnrollmentParams {
  ephemeralToken: string
  code: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isInitialized: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<LoginOutcome>
  verifyTwoFactor: (params: VerifyTwoFactorParams) => Promise<TwoFactorOutcome>
  startTwoFactorEnrollment: (ephemeralToken: string) => Promise<TwoFactorEnrollmentStartOutcome>
  confirmTwoFactorEnrollment: (
    params: ConfirmTwoFactorEnrollmentParams,
  ) => Promise<TwoFactorEnrollmentConfirmOutcome>
  logout: (showToast?: boolean) => void
  hasPermission: (permission: number | string) => boolean
  isInGroup: (groupName: string) => boolean
  refreshUser: () => Promise<void>
  refreshToken: () => Promise<boolean>
  /**
   * Saca la marca de "tenés que cambiar la contraseña" después de que la
   * persona la cambió. No se vuelve a pedir el usuario al servidor: el único
   * dato que cambió es este, y hasta que se actualice el estado local el
   * diálogo de bienvenida sigue abierto arriba de todo.
   */
  contrasenaCambiada: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

const getIdleTimeFromUser = (user: User | null) => resolveIdleTimeMs(user?.inactivity_logout_minutes)

/**
 * Detecta si el 400/401 vino porque venció el `ephemeral_token` (5 minutos) en
 * vez de porque el código está mal. El backend se está escribiendo en paralelo,
 * así que miramos tanto un campo `code` como el texto del mensaje: no queremos
 * que un cambio de wording del lado del server le muestre "código incorrecto" a
 * alguien cuyo token simplemente venció.
 */
const EXPIRED_TOKEN_CODES = new Set([
  "ephemeral_token_expired",
  "token_expired",
  "expired_token",
  "invalid_ephemeral_token",
  "ephemeral_token_invalid",
])

const looksLikeExpiredToken = (status: number, body: unknown): boolean => {
  if (status === 410) return true
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  const code = typeof record.code === "string" ? record.code.toLowerCase() : ""
  if (EXPIRED_TOKEN_CODES.has(code)) return true
  const text = formatApiError(body, "").toLowerCase()
  return /expir|vencid|caduc/.test(text) && /token|sesi|tiempo/.test(text)
}

/** Traduce el 429 del backend a una espera concreta usando el `Retry-After`. */
const throttleMessage = (response: Response): string => {
  const retryAfter = Number(response.headers.get("Retry-After"))
  const espera =
    Number.isFinite(retryAfter) && retryAfter > 0
      ? ` Volvé a intentar en ${retryAfter >= 60 ? `${Math.ceil(retryAfter / 60)} minuto(s)` : `${retryAfter} segundos`}.`
      : " Esperá un momento antes de volver a intentar."
  return `Demasiados intentos fallidos.${espera}`
}

const ENROLLMENT_EXPIRED_MESSAGE =
  "El pase para enrolarte venció. Iniciá sesión de nuevo para volver a empezar."

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { success, error } = useToast()
  const initializationRef = useRef(false)
  const warningNotificationSentRef = useRef(false)
  const lastSessionExpiredToastRef = useRef(0)
  const {
    enabled: notificationsEnabled,
    isSupported: notificationsSupported,
    requestPermission: requestNotificationPermission,
    notifyIdleWarning,
    notifySessionExpired,
    closeActiveNotification,
  } = useSessionNotifications()

  const idleConfig = useMemo(() => {
    const idleTime = getIdleTimeFromUser(user)
    return { idleTime, warningTime: resolveWarningTimeMs(idleTime) }
  }, [user])

  const logout = useCallback(
    (showToast = true) => {
      // Primero el servidor, porque `clearSession()` borra el refresh token
      // que hay que mandarle. No se espera: la pantalla cierra igual.
      void cerrarSesionEnElServidor()
      clearSession()
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)

      if (showToast) {
        success("Sesión cerrada", {
          description: "Has cerrado sesión exitosamente",
        })
      }
    },
    [success],
  )

  const expireSession = useCallback(
    (message = "Tu sesión expiró. Volvé a iniciar sesión para continuar.") => {
      // También acá, y por el motivo más importante de todos: el cierre por
      // inactividad pasa por esta función, y ahí el refresh token está VIVO.
      // La persona se fue del mostrador y la sesión se cerró sola; si no se
      // invalida, el token sigue sirviendo las horas que le queden.
      //
      // Cuando se llega por un refresh que falló el token ya está muerto y la
      // llamada no hace nada: el backend contesta 205 igual.
      void cerrarSesionEnElServidor()
      clearSession()
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
      closeActiveNotification()
      notifySessionExpired(message)

      const now = Date.now()
      if (now - lastSessionExpiredToastRef.current > 1500) {
        lastSessionExpiredToastRef.current = now
        error("Sesión expirada", {
          description: message,
          duration: 8000,
        })
      }
    },
    [closeActiveNotification, error, notifySessionExpired],
  )

  const { showWarning, timeLeft, extendSession, resetIdleTimeout } = useIdleTimeout({
    onIdle: () => expireSession("Tu sesión se cerró por inactividad."),
    idleTime: idleConfig.idleTime,
    warningTime: idleConfig.warningTime,
    enabled: isAuthenticated,
  })

  useEffect(() => {
    const handleSessionExpired = (event: Event) => {
      const detail = (event as CustomEvent<SessionExpiredDetail>).detail
      expireSession(detail?.message)
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [expireSession])

  useEffect(() => {
    if (!showWarning) {
      warningNotificationSentRef.current = false
      closeActiveNotification()
      return
    }

    if (!warningNotificationSentRef.current) {
      notifyIdleWarning(timeLeft)
      warningNotificationSentRef.current = true
    }
  }, [showWarning, timeLeft, notifyIdleWarning, closeActiveNotification])

  const hasPermission = useCallback(
    (permission: number | string): boolean => {
      if (!user) return false
      if (user.is_superuser) return true

      const permissionStr = permission.toString()
      const permissionCodename = permissionStr.split(".").pop() || permissionStr

      return user.permissions.some(
        (perm) => {
          const permCodename = perm.codename.split(".").pop() || perm.codename
          return (
            perm.id.toString() === permissionStr ||
            perm.codename === permissionStr ||
            perm.codename === permissionCodename ||
            permCodename === permissionStr ||
            permCodename === permissionCodename ||
            perm.name === permissionStr
          )
        },
      )
    },
    [user],
  )

  const isInGroup = useCallback(
    (groupName: string): boolean => {
      if (!user) return false
      return !!user.roles?.some((role) => role.name === groupName)
    },
    [user],
  )

  const refreshToken = useCallback(async (): Promise<boolean> => {
    // El pedido en sí vive en `@/lib/refresh-de-sesion`, compartido con
    // `use-api`. Acá queda solo la reacción: sincronizar el estado de React y
    // cerrar la sesión con un aviso si no se pudo renovar.
    const renovada = await refrescarSesion()
    if (!renovada) {
      expireSession("No se pudo renovar la sesión. Volvé a iniciar sesión.")
      return false
    }
    // El token nuevo ya quedó guardado; se lee de ahí para no duplicar la
    // fuente de verdad.
    setToken(getAccessToken())
    return true
  }, [expireSession])

  // Cierre de sesión exitoso, compartido por el login directo y por el que pasa
  // por el segundo factor: ambos terminan con la misma respuesta del backend.
  const completeSession = useCallback(
    (data: AuthResponse, typedUsername?: string) => {
      setAccessToken(data.access)
      setRefreshToken(data.refresh)
      setStoredUser(data.user)
      try {
        localStorage.setItem("last_username", typedUsername || data.user.username)
      } catch {
        // ignore
      }

      setToken(data.access)
      setUser(data.user)
      setIsAuthenticated(true)

      if (resetIdleTimeout) {
        resetIdleTimeout()
      }

      success("Inicio de sesión exitoso", {
        description: `Bienvenido, ${data.user.first_name}`,
      })
    },
    [success, resetIdleTimeout],
  )

  const login = useCallback(
    async (username: string, password: string): Promise<LoginOutcome> => {
      setIsLoading(true)
      try {
        const response = await fetch(AUTH_ENDPOINTS.TOKEN, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // El device_id le dice al backend si este equipo ya pasó por el
          // segundo factor dentro de la ventana de confianza.
          body: JSON.stringify({ username, password, device_id: getDeviceId() }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: "Error de autenticación" }))

          error("Error de inicio de sesión", {
            description: formatApiError(errorData, "Credenciales inválidas"),
          })
          return { status: "error" }
        }

        const data: AuthResponse | TwoFactorRequiredResponse | TwoFactorEnrollmentRequiredResponse =
          await response.json()

        // 200 pero sin tokens: las credenciales estaban bien y falta el código.
        if ("two_factor_required" in data && data.two_factor_required) {
          return {
            status: "two_factor_required",
            ephemeralToken: data.ephemeral_token,
            expiresIn: Number(data.expires_in) > 0 ? Number(data.expires_in) : 300,
          }
        }

        // Mismo caso pero un paso antes: está obligada y ni siquiera se enroló.
        if ("two_factor_enrollment_required" in data && data.two_factor_enrollment_required) {
          return {
            status: "two_factor_enrollment_required",
            ephemeralToken: data.ephemeral_token,
            expiresIn: Number(data.expires_in) > 0 ? Number(data.expires_in) : 900,
          }
        }

        completeSession(data as AuthResponse, username)
        return { status: "success" }
      } catch {
        error("Error de conexión", {
          description: "No se pudo conectar con el servidor",
        })
        return { status: "error" }
      } finally {
        setIsLoading(false)
      }
    },
    [completeSession, error],
  )

  /**
   * Segundo paso del login. El `ephemeral_token` llega por parámetro y se queda
   * en memoria del componente que muestra la pantalla: nunca se guarda en
   * localStorage/sessionStorage porque es media credencial y ahí queda al
   * alcance de cualquier XSS.
   */
  const verifyTwoFactor = useCallback(
    async ({ ephemeralToken, code, rememberDevice }: VerifyTwoFactorParams): Promise<TwoFactorOutcome> => {
      setIsLoading(true)
      try {
        const response = await fetch(AUTH_ENDPOINTS.TOKEN_2FA, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ephemeral_token: ephemeralToken,
            code,
            device_id: getDeviceId(),
            remember_device: rememberDevice,
          }),
        })

        if (response.status === 429) {
          return { status: "error", message: throttleMessage(response) }
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)

          if (looksLikeExpiredToken(response.status, errorData)) {
            return {
              status: "error",
              expired: true,
              message: "La verificación venció. Iniciá sesión de nuevo para pedir un código nuevo.",
            }
          }

          return {
            status: "error",
            message: formatApiError(errorData, "Código incorrecto. Revisá la app y probá de nuevo."),
          }
        }

        const data: AuthResponse = await response.json()
        completeSession(data)
        return { status: "success" }
      } catch {
        return { status: "error", message: "No se pudo conectar con el servidor. Revisá la conexión." }
      } finally {
        setIsLoading(false)
      }
    },
    [completeSession],
  )

  /**
   * Enrolamiento obligatorio, paso 1: pedir el secreto y el QR.
   *
   * Va SIN Authorization igual que el login: todavía no hay sesión, y lo único
   * que autoriza a ver el secreto es el pase de 15 minutos que devolvió el
   * login. El pase queda en memoria del componente que lo recibió (ver
   * `login.tsx`), nunca en storage.
   */
  const startTwoFactorEnrollment = useCallback(
    async (ephemeralToken: string): Promise<TwoFactorEnrollmentStartOutcome> => {
      try {
        const response = await fetch(AUTH_ENDPOINTS.TWO_FACTOR_SETUP, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ephemeral_token: ephemeralToken }),
        })

        if (response.status === 429) {
          return { status: "error", message: throttleMessage(response) }
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          if (looksLikeExpiredToken(response.status, errorData)) {
            return { status: "error", expired: true, message: ENROLLMENT_EXPIRED_MESSAGE }
          }
          return {
            status: "error",
            message: formatApiError(errorData, "No se pudo preparar el enrolamiento."),
          }
        }

        const setup: TwoFactorSetupResponse = await response.json()
        return { status: "success", setup }
      } catch {
        return { status: "error", message: "No se pudo conectar con el servidor. Revisá la conexión." }
      }
    },
    [],
  )

  /**
   * Enrolamiento obligatorio, paso 2: confirmar con el código de la app.
   *
   * A diferencia del alta desde el perfil, esta respuesta cierra el login: trae
   * los códigos de recuperación Y los tokens. Abrimos la sesión acá mismo, y es
   * la pantalla la que retiene la navegación hasta que la persona confirme que
   * guardó los códigos (se muestran una sola vez).
   */
  const confirmTwoFactorEnrollment = useCallback(
    async ({
      ephemeralToken,
      code,
    }: ConfirmTwoFactorEnrollmentParams): Promise<TwoFactorEnrollmentConfirmOutcome> => {
      setIsLoading(true)
      try {
        const response = await fetch(AUTH_ENDPOINTS.TWO_FACTOR_CONFIRM, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ephemeral_token: ephemeralToken, code, device_id: getDeviceId() }),
        })

        if (response.status === 429) {
          return { status: "error", message: throttleMessage(response) }
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)

          if (looksLikeExpiredToken(response.status, errorData)) {
            return { status: "error", expired: true, message: ENROLLMENT_EXPIRED_MESSAGE }
          }

          return {
            status: "error",
            message: formatApiError(
              errorData,
              "El código no coincide. Revisá la hora del celular y probá con el siguiente.",
            ),
          }
        }

        const data: TwoFactorEnrollmentConfirmResponse = await response.json()
        completeSession(data)
        return {
          status: "success",
          recoveryCodes: Array.isArray(data.recovery_codes) ? data.recovery_codes : [],
        }
      } catch {
        return { status: "error", message: "No se pudo conectar con el servidor. Revisá la conexión." }
      } finally {
        setIsLoading(false)
      }
    },
    [completeSession],
  )

  const contrasenaCambiada = useCallback(() => {
    setUser((previo) => {
      if (!previo || !previo.must_change_password) return previo
      const actualizado = { ...previo, must_change_password: false }
      setStoredUser(actualizado)
      return actualizado
    })
  }, [])

  const refreshUser = useCallback(async () => {
    const tokenValue = getAccessToken()
    const savedUser = getStoredUser<User>()

    if (!tokenValue || !savedUser) {
      setIsInitialized(true)
      return
    }

    try {
      // Evita renders en cascada de todo lo que consume useAuth() cuando no
      // cambió nada: sessionStorage.getItem + JSON.parse siempre da una
      // referencia nueva, así que sin esto cada cambio de ruta (ver
      // route-change-listener.tsx) tiraba abajo el bail-out de React.
      setToken((prev) => (prev === tokenValue ? prev : tokenValue))
      setUser((prev) => (prev && JSON.stringify(prev) === JSON.stringify(savedUser) ? prev : savedUser))
      setIsAuthenticated((prev) => (prev ? prev : true))
    } catch {
      expireSession("No se pudo recuperar la sesión guardada. Volvé a iniciar sesión.")
    } finally {
      initializationRef.current = true
      setIsInitialized(true)
    }
  }, [expireSession])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // Memoizado: sin esto, cualquier render de AuthProvider (incluido el que
  // dispara RouteChangeListener en cada cambio de ruta) crea un objeto nuevo
  // y fuerza el re-render de los ~15 componentes que consumen useAuth(),
  // aunque ningún dato de auth haya cambiado.
  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      isInitialized,
      isLoading,
      login,
      verifyTwoFactor,
      startTwoFactorEnrollment,
      confirmTwoFactorEnrollment,
      logout,
      hasPermission,
      isInGroup,
      refreshUser,
      refreshToken,
      contrasenaCambiada,
    }),
    [
      user,
      token,
      isAuthenticated,
      isInitialized,
      isLoading,
      login,
      verifyTwoFactor,
      startTwoFactorEnrollment,
      confirmTwoFactorEnrollment,
      logout,
      hasPermission,
      isInGroup,
      refreshUser,
      refreshToken,
      contrasenaCambiada,
    ],
  )

  if (!isInitialized) {
    return null
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      {isAuthenticated && showWarning && (
        <IdleWarningModal
          isOpen={true}
          timeLeft={timeLeft}
          onExtend={extendSession}
          onLogout={() => logout(false)}
          notificationsAvailable={notificationsSupported}
          notificationsEnabled={notificationsEnabled}
          onEnableNotifications={requestNotificationPermission}
        />
      )}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export default useAuth
