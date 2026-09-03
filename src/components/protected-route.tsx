"use client"

import type React from "react"
import { Navigate, useLocation } from "react-router-dom"
import useAuth from "@/contexts/auth-context"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: number | string // ID o codename del permiso requerido
  /**
   * Exige que el usuario sea superusuario. A propósito NO se resuelve con
   * `requiredPermission`: la superconfiguración no debe poder habilitarse
   * asignándole un permiso a un rol.
   */
  requireSuperuser?: boolean
  fallbackPath?: string // Ruta a la que redirigir si no tiene permiso
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requireSuperuser = false,
  fallbackPath = "/",
}) => {
  const { user, isLoading, isInitialized, hasPermission } = useAuth()
  const location = useLocation()

  // Mientras se resuelve la sesión no se dibuja NADA. Antes acá había un
  // cartel de "Verificando sesión...", y era una pantalla de por medio entre
  // la app y el login: para cuando el usuario alcanzaba a leerla ya no estaba.
  // Sin ella, o entra o ve el formulario, sin escala intermedia.
  if (!isInitialized || isLoading) {
    return null
  }

  // Solo redirigir al login si ya terminó la inicialización y no hay usuario.
  // Guardamos la ruta pedida en el state para volver acá después de loguearse.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireSuperuser && !user.is_superuser) {
    return <Navigate to={fallbackPath} replace />
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}
