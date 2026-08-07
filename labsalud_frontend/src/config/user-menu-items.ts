// ============================================================================
// USER MENU ITEMS - Fuente única de los items del menú de usuario
// ============================================================================
// El menú de usuario se renderiza dos veces con estilos distintos: el dropdown
// de desktop (user-dropdown.tsx) y el panel de mobile (navbar.tsx). Antes cada
// uno tenía su propia copia del listado, y agregar un item en uno solo (pasó
// con "Superconfiguración") lo dejaba invisible en el otro.
//
// Acá vive el QUÉ (ruta, etiqueta, ícono, cuándo se muestra); el CÓMO se ve lo
// sigue decidiendo cada menú. Para sumar un item, agregalo a USER_MENU_ITEMS y
// aparece en los dos.

import type { LucideIcon } from "lucide-react"
import { Receipt, Settings, Shield, ShieldAlert, UserCircle } from "lucide-react"
import { PERMISSIONS } from "@/config/permissions"
import type { User } from "@/types"

// Lo que necesita un item para decidir si se muestra. Sale tal cual de
// useAuth(), así que los menús no tienen que preparar nada.
export interface UserMenuContext {
  user: User | null
  hasPermission: (permission: number | string) => boolean
}

export interface UserMenuItem {
  // Estable e independiente de la ruta: sirve de key en el render.
  id: string
  to: string
  label: string
  icon: LucideIcon
  // Sin isVisible el item se muestra siempre.
  isVisible?: (context: UserMenuContext) => boolean
}

export const USER_MENU_ITEMS: readonly UserMenuItem[] = [
  {
    id: "profile",
    to: "/profile",
    label: "Mi Perfil",
    icon: UserCircle,
  },
  {
    id: "management",
    to: "/management",
    label: "Gestion de Usuarios",
    icon: Shield,
    isVisible: ({ hasPermission }) => hasPermission(PERMISSIONS.MANAGE_USERS.codename),
  },
  {
    id: "facturacion",
    to: "/facturacion",
    label: "Facturacion",
    icon: Receipt,
    isVisible: ({ hasPermission }) => hasPermission(PERMISSIONS.MANAGE_BILLING.codename),
  },
  {
    id: "configuracion",
    to: "/configuracion",
    label: "Configuracion",
    icon: Settings,
  },
  {
    id: "superconfiguracion",
    to: "/superconfiguracion",
    label: "Superconfiguracion",
    icon: ShieldAlert,
    // Superconfiguración es exclusiva de superusuarios: no se resuelve con un
    // permiso para que no se pueda habilitar por accidente desde un rol.
    isVisible: ({ user }) => Boolean(user?.is_superuser),
  },
]

export const getVisibleUserMenuItems = (context: UserMenuContext): UserMenuItem[] =>
  USER_MENU_ITEMS.filter((item) => item.isVisible?.(context) ?? true)
