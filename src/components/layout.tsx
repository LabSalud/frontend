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
        {/* EL GUTTER DE LAS PÁGINAS VIVE ACÁ Y EN NINGÚN OTRO LADO.
            `lg:px-8` son los 32px a los que arranca la barra blanca de la
            navbar: 16px del `lg:px-4` de su wrapper más 16px de su `mx-4`.
            Así el contenido de cualquier página queda alineado al pixel con
            la navbar y, como no hay `max-w-*`, en pantallas grandes se estira
            todo lo que dé — que es lo que hace desaparecer el scroll
            horizontal de las tablas anchas. Si la pantalla no alcanza, la
            tabla vuelve a scrollear sola (`overflow-x-auto` en ui/table).
            En mobile la navbar va full-bleed, pero acá se dejan 16px a
            propósito: las tarjetas tienen borde redondeado y sombra y pegadas
            al vidrio se ven cortadas.
            Las páginas NO deben volver a poner `mx-auto`, `max-w-*` ni
            padding horizontal en su contenedor raíz: se desalinean. */}
        <main className="w-full px-4 pt-4 lg:px-8">{children || <Outlet />}</main>
      </div>
    </div>
  )
}
