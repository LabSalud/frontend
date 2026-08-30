// Compatibilidad con código previo. Los tokens ahora viven en cookies seguras.
// Ver `auth-storage.ts` para el módulo canónico.
export { getStoredUser, setStoredUser } from "./auth-storage"
export { clearSession as clearStoredUser } from "./auth-storage"
