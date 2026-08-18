"use client"

import type React from "react"
import { Navbar } from "./navbar"
import { Outlet } from "react-router-dom"
import { CambioDeContrasenaObligatorio } from "./cambio-de-contrasena-obligatorio"
import useAuth from "@/contexts/auth-context"

interface LayoutProps {
  children?: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth()

  // Con la contraseña prestada, el servidor contesta 403 a todo lo que no sea
  // el propio perfil. La página NO se monta: si se montara detrás del diálogo,
  // sus consultas saldrían igual y llenarían la pantalla de errores por algo
  // que no es un error, sino el sistema haciendo lo que tiene que hacer.
  //
  // El div va sin fondo propio para que se siga viendo el del sistema.
  if (user?.must_change_password) {
    return (
      <div className="min-h-screen">
        <CambioDeContrasenaObligatorio />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Content */}
      <div className="relative z-10">
        <Navbar />
        <main className="px-2 pt-4 sm:px-4">{children || <Outlet />}</main>
      </div>
    </div>
  )
}
