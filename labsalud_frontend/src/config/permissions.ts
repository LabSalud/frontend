// ============================================================================
// PERMISSIONS CONSTANTS - Sistema simplificado de permisos
// ============================================================================

export const PERMISSIONS = {
  // ID: 1 - Gestión de usuarios
  MANAGE_USERS: {
    id: "1",
    codename: "administrar_usuarios",
    name: "Puede administrar usuarios",
  },

  // ID: 2 - Gestión de permisos temporales
  MANAGE_TEMP_PERMISSIONS: {
    id: "2",
    codename: "administrar_permisos_temporales",
    name: "Puede administrar permisos temporales",
  },

  // ID: 3 - Gestión de roles
  MANAGE_ROLES: {
    id: "3",
    codename: "administrar_roles",
    name: "Puede administrar roles",
  },

  // ID: 4 - Validación de resultados
  VALIDATE_RESULTS: {
    id: "4",
    codename: "validar_resultados",
    name: "Puede validar resultados",
  },

  // ID: 6 - Gestión de facturación
  MANAGE_BILLING: {
    id: "6",
    codename: "administrar_facturacion",
    name: "Puede administrar facturacion",
  },
} as const

// Helper functions para verificar permisos
export type PermissionKey = keyof typeof PERMISSIONS
export type PermissionValue = (typeof PERMISSIONS)[PermissionKey]

// Helper para obtener el ID de un permiso
export const getPermissionId = (key: PermissionKey): string => {
  return PERMISSIONS[key].id
}

// Helper para obtener el codename de un permiso
export const getPermissionCodename = (key: PermissionKey): string => {
  return PERMISSIONS[key].codename
}
