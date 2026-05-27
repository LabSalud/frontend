// ============================================================================
// PERMISSIONS CONSTANTS - Sistema simplificado de permisos
// ============================================================================

export const PERMISSIONS = {
  // ID: 1 - ContentType: laboratory_protocols
  UNCANCEL_PROTOCOLS: {
    id: "1",
    contentTypeId: 1,
    codename: "descancelar_protocolos",
    name: "Puede descancelar protocolos",
  },

  // ID: 2 - ContentType: user_management
  MANAGE_USERS: {
    id: "2",
    contentTypeId: 7,
    codename: "administrar_usuarios",
    name: "Puede administrar usuarios",
  },

  // ID: 3 - ContentType: user_management
  MANAGE_TEMP_PERMISSIONS: {
    id: "3",
    contentTypeId: 8,
    codename: "administrar_permisos_temporales",
    name: "Puede administrar permisos temporales",
  },

  // ID: 4 - ContentType: user_management
  MANAGE_ROLES: {
    id: "4",
    contentTypeId: 4,
    codename: "administrar_roles",
    name: "Puede administrar roles",
  },

  // ID: 5 - ContentType: laboratory_results
  VALIDATE_RESULTS: {
    id: "5",
    contentTypeId: 29,
    codename: "validar_resultados",
    name: "Puede validar resultados",
  },

  // ID: 6 - ContentType: billing
  MANAGE_BILLING: {
    id: "6",
    contentTypeId: 32,
    codename: "administrar_facturacion",
    name: "Puede administrar facturación",
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

// Helper para obtener el ContentType ID asociado al permiso
export const getPermissionContentTypeId = (key: PermissionKey): number => {
  return PERMISSIONS[key].contentTypeId
}
