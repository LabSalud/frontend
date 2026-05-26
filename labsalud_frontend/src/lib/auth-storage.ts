/**
 * Almacenamiento seguro de tokens JWT y datos de sesión.
 *
 * - Access token y refresh token van en cookies con flags de seguridad:
 *   - `Secure` (solo HTTPS) en producción
 *   - `SameSite=Strict` (mitiga CSRF y leak entre dominios)
 *   - `Path=/`
 *   - Expiración manejada con `Max-Age`
 *
 * - Los datos del usuario (no sensibles) siguen en sessionStorage para acceso rápido
 *   sin re-parsear cookies en cada renderizado.
 *
 * Nota: estas cookies son accesibles desde JavaScript (no httpOnly) porque el frontend
 * necesita leerlas para enviarlas como `Authorization: Bearer`. El backend Django
 * autentica con JWT por header, no por cookie. La protección frente a XSS recae en
 * el CSP y en no inyectar HTML/JS de fuentes no confiables. Si en el futuro el backend
 * soporta autenticación por cookie httpOnly, sería trivial moverlo del lado del servidor.
 */

const ACCESS_TOKEN_KEY = "access_token"
const REFRESH_TOKEN_KEY = "refresh_token"
const USER_STORAGE_KEY = "user"

// Vida útil aproximada de los tokens. El backend define la expiración real:
// access ~ 15 min, refresh ~ 7 días. Si el backend devuelve un token con TTL menor,
// la próxima request 401 disparará un refresh automático.
const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 // 1 hora (margen sobre los 15 min del backend)
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 días

const isHttps = (): boolean => {
  if (typeof window === "undefined") return true
  return window.location.protocol === "https:"
}

const buildCookieAttributes = (maxAgeSeconds: number): string => {
  const attrs = [`Path=/`, `Max-Age=${maxAgeSeconds}`, `SameSite=Strict`]
  if (isHttps()) attrs.push("Secure")
  return attrs.join("; ")
}

const setCookie = (name: string, value: string, maxAgeSeconds: number): void => {
  if (typeof document === "undefined") return
  const encoded = encodeURIComponent(value)
  document.cookie = `${name}=${encoded}; ${buildCookieAttributes(maxAgeSeconds)}`
}

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null
  const cookies = document.cookie ? document.cookie.split("; ") : []
  for (const raw of cookies) {
    const eqIndex = raw.indexOf("=")
    if (eqIndex === -1) continue
    const cookieName = raw.slice(0, eqIndex)
    if (cookieName === name) {
      return decodeURIComponent(raw.slice(eqIndex + 1))
    }
  }
  return null
}

const deleteCookie = (name: string): void => {
  if (typeof document === "undefined") return
  const attrs = [`Path=/`, `Max-Age=0`, `SameSite=Strict`]
  if (isHttps()) attrs.push("Secure")
  document.cookie = `${name}=; ${attrs.join("; ")}`
}

// ============================================================================
// Tokens
// ============================================================================

export const getAccessToken = (): string | null => {
  return getCookie(ACCESS_TOKEN_KEY)
}

export const getRefreshToken = (): string | null => {
  return getCookie(REFRESH_TOKEN_KEY)
}

export const setAccessToken = (token: string): void => {
  setCookie(ACCESS_TOKEN_KEY, token, ACCESS_TOKEN_MAX_AGE_SECONDS)
}

export const setRefreshToken = (token: string): void => {
  setCookie(REFRESH_TOKEN_KEY, token, REFRESH_TOKEN_MAX_AGE_SECONDS)
}

export const clearTokens = (): void => {
  deleteCookie(ACCESS_TOKEN_KEY)
  deleteCookie(REFRESH_TOKEN_KEY)
  // Limpieza defensiva de cualquier rastro en sessionStorage de versiones previas
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // ignore
  }
}

// ============================================================================
// Usuario (no sensible: solo perfil para hidratación inicial de UI)
// ============================================================================

export const getStoredUser = <T = unknown>(): T | null => {
  try {
    const data = sessionStorage.getItem(USER_STORAGE_KEY)
    return data ? (JSON.parse(data) as T) : null
  } catch {
    return null
  }
}

export const setStoredUser = (user: unknown): void => {
  try {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  } catch {
    // ignore
  }
}

export const clearStoredUser = (): void => {
  try {
    sessionStorage.removeItem(USER_STORAGE_KEY)
  } catch {
    // ignore
  }
}

// ============================================================================
// Limpieza completa de sesión (logout)
// ============================================================================

export const clearSession = (): void => {
  clearTokens()
  clearStoredUser()
}
