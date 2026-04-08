"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { useToast } from "@/hooks/use-toast"
import { IdleWarningModal } from "@/components/idle-warning-modal"
import useIdleTimeout from "@/hooks/use-idle-timeout"
import { AUTH_ENDPOINTS } from "@/config/api"
import type { User } from "@/types"

export interface TokenRefreshResponse {
  access: string
  refresh?: string
}

export interface AuthResponse {
  access: string
  refresh: string
  user: User
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isInitialized: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: (showToast?: boolean) => void
  hasPermission: (permission: number | string) => boolean
  isInGroup: (groupName: string) => boolean
  refreshUser: () => Promise<void>
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { success, error } = useToast()
  const initializationRef = useRef(false)

  const [idleConfig] = useState({
    idleTime: 5 * 60 * 1000, // 5 minutes
    warningTime: 30 * 1000, // 30 seconds
  })

  const logout = useCallback(
    (showToast = true) => {
      sessionStorage.removeItem("access_token")
      sessionStorage.removeItem("refresh_token")
      sessionStorage.removeItem("user")
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

  const { showWarning, timeLeft, extendSession, resetIdleTimeout } = useIdleTimeout({
    onIdle: () => logout(false),
    idleTime: idleConfig.idleTime,
    warningTime: idleConfig.warningTime,
    enabled: isAuthenticated,
  })

  const hasPermission = useCallback(
    (permission: number | string): boolean => {
      if (!user) return false
      const permissionStr = permission.toString()
      return user.permissions.some(
        (perm) =>
          perm.id.toString() === permissionStr || perm.codename === permissionStr || perm.name === permissionStr,
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
    const refreshTokenValue = sessionStorage.getItem("refresh_token")
    if (!refreshTokenValue) return false

    try {
      const response = await fetch(AUTH_ENDPOINTS.TOKEN_REFRESH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh: refreshTokenValue }),
      })

      if (!response.ok) throw new Error()

      const data: TokenRefreshResponse = await response.json()

      sessionStorage.setItem("access_token", data.access)
      if (data.refresh) {
        sessionStorage.setItem("refresh_token", data.refresh)
      }
      setToken(data.access)
      return true
    } catch {
      logout(false)
      return false
    }
  }, [logout])

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      setIsLoading(true)
      try {
        console.log("[v0] Attempting login to:", AUTH_ENDPOINTS.TOKEN)
        const response = await fetch(AUTH_ENDPOINTS.TOKEN, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: "Error de autenticación" }))
          console.log("[v0] Login failed:", errorData)

          error("Error de inicio de sesión", {
            description: errorData.detail || "Credenciales inválidas",
          })
          return false
        }

        const data: AuthResponse = await response.json()
        console.log("[v0] Login successful, user:", data.user.username)

        sessionStorage.setItem("access_token", data.access)
        sessionStorage.setItem("refresh_token", data.refresh)
        sessionStorage.setItem("user", JSON.stringify(data.user))
        localStorage.setItem("last_username", username)

        setToken(data.access)
        setUser(data.user)
        setIsAuthenticated(true)

        if (resetIdleTimeout) {
          resetIdleTimeout()
        }

        success("Inicio de sesión exitoso", {
          description: `Bienvenido, ${data.user.first_name}`,
        })
        return true
      } catch (err) {
        console.error("[v0] Login error:", err)
        error("Error de conexión", {
          description: "No se pudo conectar con el servidor",
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [success, error, resetIdleTimeout],
  )

  const refreshUser = useCallback(async () => {
    if (initializationRef.current) return

    const tokenValue = sessionStorage.getItem("access_token")
    const savedUser = sessionStorage.getItem("user")

    if (!tokenValue || !savedUser) {
      setIsInitialized(true)
      return
    }

    try {
      setToken(tokenValue)
      const parsedUser = JSON.parse(savedUser)
      setUser(parsedUser)
      setIsAuthenticated(true)
    } catch {
      logout(false)
    } finally {
      initializationRef.current = true
      setIsInitialized(true)
    }
  }, [logout])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const value = {
    user,
    token,
    isAuthenticated,
    isInitialized,
    isLoading,
    login,
    logout,
    hasPermission,
    isInGroup,
    refreshUser,
    refreshToken,
  }

  if (!isInitialized) {
    return null
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      {isAuthenticated && showWarning && (
        <IdleWarningModal isOpen={true} timeLeft={timeLeft} onExtend={extendSession} onLogout={() => logout(false)} />
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
